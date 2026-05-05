import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { validateTelegramData } from '../middleware/validateTelegram';
import { authenticate } from '../middleware/auth';
import { authRateLimitConfig } from '../middleware/rateLimiter';

async function findOrCreateUserFromTelegramUser(telegramUser: {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
}) {
  const telegramId = telegramUser.id.toString();

  try {
    const user = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { telegramId },
        include: {
          profile: true,
          wallet: true,
          stats: true
        }
      });

      if (existingUser) {
        return tx.user.update({
          where: { id: existingUser.id },
           {
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            photoUrl: telegramUser.photo_url
          },
          include: {
            profile: true,
            wallet: true,
            stats: true
          }
        });
      }

      const createdUser = await tx.user.create({
         {
          telegramId,
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          photoUrl: telegramUser.photo_url,
          profile: {
            create: {
              level: 1,
              xp: 0,
              totalPigsEarned: 0,
              currentPigs: 5000,
              equippedCharacterId: 'grunt_bacon',
              equippedWeaponId: 'oink_pistol'
            }
          },
          wallet: {
            create: {}
          },
          stats: {
            create: {}
          }
        },
        include: {
          profile: true,
          wallet: true,
          stats: true
        }
      });

      // NOTE: Ensure unique constraint exists on InventoryItem for (userId, itemType, characterId/weaponId)
      // to guarantee idempotency under concurrent requests.
      await tx.inventoryItem.createMany({
         [
          {
            userId: createdUser.id,
            itemType: 'CHARACTER',
            characterId: 'grunt_bacon'
          },
          {
            userId: createdUser.id,
            itemType: 'WEAPON',
            weaponId: 'oink_pistol'
          }
        ],
        skipDuplicates: true
      });

      return createdUser;
    });

    return user;
  } catch (err) {
    // Log Prisma-specific errors for observability
    if (err instanceof Error && err.name === 'PrismaClientKnownRequestError') {
      console.error('[AuthRoute] Prisma error during user provisioning', {
        code: (err as any).code,
        message: err.message
      });
    }
    throw err; // Re-throw to be handled by global error handler
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  // Apply stricter rate limit to auth endpoints
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/auth')) {
      // Delegate to rate limiter config; actual enforcement handled by plugin
      // This attaches config metadata for @fastify/rate-limit
      (reply.context.config as any).rateLimit = authRateLimitConfig;
    }
  });

  fastify.post('/telegram', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const initData = body?.initData as string | undefined;

    if (!initData || typeof initData !== 'string') {
      return reply.status(400).send({ error: 'Missing or invalid initData' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      fastify.log.error('TELEGRAM_BOT_TOKEN is not configured');
      return reply.status(500).send({ error: 'Server configuration error' });
    }

    const telegramUser = validateTelegramData(initData, { botToken, logFailures: process.env.NODE_ENV !== 'production' });
    if (!telegramUser) {
      return reply.status(401).send({ error: 'Invalid Telegram data' });
    }

    try {
      const user = await findOrCreateUserFromTelegramUser(telegramUser);

      const token = fastify.jwt.sign({
        userId: user.id,
        telegramId: user.telegramId
      });

      // Sanitize response: only return explicitly allowed fields
      return {
        token,
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.photoUrl,
          profile: user.profile,
          // Wallet and stats are included but ensure sensitive fields are excluded at Prisma model level
          wallet: user.wallet,
          stats: user.stats
        }
      };
    } catch (err) {
      fastify.log.error({ err }, 'Failed to process Telegram auth');
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  fastify.post('/dev-login', async (request, reply) => {
    // Hardened dev auth: require env flag + localhost + optional header
    const isDevAuthEnabled = process.env.ENABLE_DEV_AUTH === 'true';
    const isLocalhost = request.ip === '127.0.0.1' || request.ip === '::1' || request.hostname === 'localhost';
    const devHeader = request.headers['x-dev-auth'];

    if (!isDevAuthEnabled || !isLocalhost || (process.env.REQUIRE_DEV_HEADER === 'true' && devHeader !== process.env.DEV_AUTH_HEADER)) {
      return reply.status(403).send({ error: 'Dev auth disabled or unauthorized' });
    }

    try {
      const user = await findOrCreateUserFromTelegramUser({
        id: 999001,
        username: 'dev_tester',
        first_name: 'Dev',
        last_name: 'Tester',
        photo_url: undefined
      });

      const token = fastify.jwt.sign({
        userId: user.id,
        telegramId: user.telegramId
      });

      return {
        token,
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.photoUrl,
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

  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
        include: {
          profile: true,
          wallet: true,
          stats: true
        }
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Sanitize response to prevent accidental leakage of sensitive fields
      return {
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.photoUrl,
          profile: user.profile,
          wallet: user.wallet, // Ensure Prisma model excludes sensitive wallet fields
          stats: user.stats
        }
      };
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch user profile');
      return reply.status(500).send({ error: 'Failed to retrieve user data' });
    }
  });
}
