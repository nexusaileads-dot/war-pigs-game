import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { authenticate } from '../middleware/auth';
import { authRateLimitConfig } from '../middleware/rateLimiter';
import bcrypt from 'bcryptjs';

// Helper to generate a unique username if collision occurs (Useful if you add OAuth/Web3 Login later)
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

// Helper to initialize a new player's database rows inside a transaction
async function provisionUserAssets(tx: any, userId: string) {
  await tx.profile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      level: 1,
      xp: 0,
      totalPigsEarned: 0,
      currentPigs: 5000, // Starter currency
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
  
  // --- EMAIL REGISTRATION ---
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
      // Check for existing user
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] }
      });

      if (existingUser) {
        if (existingUser.email === email) return reply.status(409).send({ error: 'Email already in use' });
        return reply.status(409).send({ error: 'Username already taken' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Use transaction to ensure full account provisioning safely
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { 
            email, 
            passwordHash, 
            username, 
            firstName: username 
          }
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
      const isConstraint = err.code === 'P2003';
      return reply.status(500).send({ 
        error: isConstraint ? 'Database Error: Missing base items. Seed the database.' : 'Registration failed' 
      });
    }
  });

  // --- EMAIL LOGIN ---
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

      // Guard against corrupted/orphaned profiles
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

  // --- DEV LOGIN (Testing Only) ---
  fastify.post('/dev-login', { config: { rateLimit: authRateLimitConfig } }, async (request, reply) => {
    const isDevAuthEnabled = process.env.ENABLE_DEV_AUTH === 'true';

    if (!isDevAuthEnabled) {
      return reply.status(403).send({ error: 'Dev auth disabled' });
    }

    try {
      const devEmail = 'dev@warpigs.com';

      let user = await prisma.user.findUnique({
        where: { email: devEmail },
        include: { profile: true, wallet: true, stats: true }
      });

      if (!user) {
        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: devEmail,
              username: 'dev_tester',
              firstName: 'Dev',
              lastName: 'Tester',
            }
          });
          await provisionUserAssets(tx, newUser.id);
          
          return await tx.user.findUniqueOrThrow({
              where: { id: newUser.id },
              include: { profile: true, wallet: true, stats: true }
          });
        });
      }

      const token = fastify.jwt.sign({
        userId: user.id
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          profile: user.profile,
          wallet: user.wallet,
          stats: user.stats
        }
      };
    } catch (err) {
      fastify.log.error({ err }, 'Failed to process dev login');
      return reply.status(500).send({ error: 'Dev authentication failed' });
    }
  });

  // --- LINK SOLANA WALLET ---
  fastify.post('/link-wallet', { preHandler: authenticate }, async (request, reply) => {
    const body = request.body as { address?: string };
    
    if (!body?.address) {
      return reply.status(400).send({ error: 'Wallet address is required' });
    }

    try {
      const userId = request.user.userId;

      // Update the user's wallet record in the database
      await prisma.wallet.upsert({
        where: { userId },
        update: { solanaAddress: body.address },
        create: { userId, solanaAddress: body.address }
      });

      return { success: true, address: body.address };
    } catch (err) {
      fastify.log.error({ err }, 'Failed to link wallet');
      return reply.status(500).send({ error: 'Failed to link wallet' });
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
