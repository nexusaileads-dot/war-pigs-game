import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { validateTelegramData } from '../middleware/validateTelegram';
import { authenticate } from '../middleware/auth';
import { authRateLimitConfig } from '../middleware/rateLimiter';
import bcrypt from 'bcryptjs';

// Helper to generate a unique username if collision occurs
const generateUniqueUsername = async (base: string): Promise<string> => {
  let username = base;
  let exists = await prisma.user.findUnique({ where: { username } });
  let counter = 1;
  while (exists) {
    username = `${base}${counter}`;
    exists = await prisma.user.findUnique({ where: { username } });
    counter++;
  }
  return username;
};

async function provisionUserAssets(userId: string, username: string) {
  await prisma.$transaction(async (tx) => {
    await tx.profile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        level: 1,
        xp: 0,
        totalPigsEarned: 0,
        currentPigs: 5000,
        equippedCharacterId: 'grunt_bacon',
        equippedWeaponId: 'oink_pistol'
      }
    });

    await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });

    await tx.playerStats.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });

    await tx.inventoryItem.createMany({
      data: [
        { userId, itemType: 'CHARACTER', characterId: 'grunt_bacon' },
        { userId, itemType: 'WEAPON', weaponId: 'oink_pistol' }
      ],
      skipDuplicates: true
    });
  });
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/auth')) {
      (reply.context.config as any).rateLimit = authRateLimitConfig;
    }
  });

  // --- EMAIL REGISTRATION ---
  fastify.post('/register', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const email = (body?.email as string)?.toLowerCase().trim();
    const password = body?.password as string;
    const username = (body?.username as string)?.trim();

    if (!email || !password || !username) {
      return reply.status(400).send({ error: 'Email, password, and username are required' });
    }

    if (password.length < 6) {
      return reply.status(400).send({ error: 'Password must be at least 6 characters' });
    }

    try {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] }
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return reply.status(409).send({ error: 'Email already in use' });
        }
        return reply.status(409).send({ error: 'Username already taken' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const finalUsername = await generateUniqueUsername(username);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          username: finalUsername,
          firstName: finalUsername
        }
      });

      await provisionUserAssets(user.id, finalUsername);

      const token = fastify.jwt.sign({ userId: user.id });

      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true, wallet: true, stats: true }
      });

      return { token, user: fullUser };
    } catch (err) {
      fastify.log.error({ err }, 'Registration failed');
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });

  // --- EMAIL LOGIN ---
  fastify.post('/login', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const email = (body?.email as string)?.toLowerCase().trim();
    const password = body?.password as string;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true, wallet: true, stats: true }
      });

      // Detects non-registered emails or missing password
      if (!user || !user.passwordHash) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Detects wrong password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = fastify.jwt.sign({ userId: user.id });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          photoUrl: user.photoUrl,
          profile: user.profile,
          wallet: user.wallet,
          stats: user.stats
        }
      };
    } catch (err) {
      fastify.log.error({ err }, 'Login failed');
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  // --- TELEGRAM LOGIN (Legacy) ---
  fastify.post('/telegram', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const initData = body?.initData as string | undefined;

    if (!initData) {
      return reply.status(400).send({ error: 'Missing initData' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return reply.status(500).send({ error: 'Server configuration error' });
    }

    const telegramUser = validateTelegramData(initData, { botToken, logFailures: true });
    if (!telegramUser) {
      return reply.status(401).send({ error: 'Invalid Telegram data' });
    }

    try {
      const telegramId = telegramUser.id.toString();
      let user = await prisma.user.findUnique({
        where: { telegramId },
        include: { profile: true, wallet: true, stats: true }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            telegramId,
            username: telegramUser.username || `tg_${telegramUser.id}`,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            photoUrl: telegramUser.photo_url
          },
          include: { profile: true, wallet: true, stats: true }
        });
        await provisionUserAssets(user.id, user.username || 'player');
      }

      const token = fastify.jwt.sign({ userId: user.id });

      return { token, user };
    } catch (err) {
      fastify.log.error({ err }, 'Telegram auth failed');
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  // --- GET CURRENT USER ---
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
        include: { profile: true, wallet: true, stats: true }
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return { user };
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to retrieve user data' });
    }
  });
}
