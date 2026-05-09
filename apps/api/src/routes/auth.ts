import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { validateTelegramData } from '../middleware/validateTelegram';
import { authenticate } from '../middleware/auth';
import { authRateLimitConfig } from '../middleware/rateLimiter';
import bcrypt from 'bcryptjs';

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

// FIX: Now accepts a transaction client (tx) so it can be rolled back safely
async function provisionUserAssets(tx: any, userId: string) {
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
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', { config: { rateLimit: authRateLimitConfig } }, async (request, reply) => {
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
        if (existingUser.email === email) return reply.status(409).send({ error: 'Email already in use' });
        return reply.status(409).send({ error: 'Username already taken' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // FIX: Atomic transaction. If provisionUserAssets fails, the user creation is reverted!
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { email, passwordHash, username, firstName: username }
        });
        
        await provisionUserAssets(tx, newUser.id);
        return newUser;
      });

      const token = fastify.jwt.sign({ userId: user.id });

      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true, wallet: true, stats: true }
      });

      return { token, user: fullUser };
    } catch (err: any) {
      fastify.log.error({ err }, 'Registration failed');
      // Surface DB constraint errors so you actually know what broke
      const isConstraint = err.code === 'P2003';
      return reply.status(500).send({ 
        error: isConstraint ? 'Database Error: Missing base items. Seed the database.' : 'Registration failed' 
      });
    }
  });

  fastify.post('/login', { config: { rateLimit: authRateLimitConfig } }, async (request, reply) => {
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

      if (!user || !user.passwordHash) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // FIX: Guard against corrupted/orphaned profiles preventing login
      if (!user.profile) {
         return reply.status(500).send({ error: 'Account corrupted: Missing profile. Please create a new account.' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = fastify.jwt.sign({ userId: user.id });

      return {
        token,
        user: {
          id: user.id, username: user.username, firstName: user.firstName, photoUrl: user.photoUrl,
          profile: user.profile, wallet: user.wallet, stats: user.stats
        }
      };
    } catch (err) {
      fastify.log.error({ err }, 'Login failed');
      return reply.status(500).send({ error: 'Login failed' });
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
