import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { validateTelegramData } from '../middleware/validateTelegram';
import { authenticate } from '../middleware/auth';

async function findOrCreateUserFromTelegramUser(telegramUser: {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
}) {
  const telegramId = telegramUser.id.toString();

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
        data: {
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
      data: {
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

    await tx.inventoryItem.createMany({
      data: [
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
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/telegram', async (request, reply) => {
    const { initData } = request.body as { initData?: string };

    if (!initData) {
      return reply.status(400).send({ error: 'Missing initData' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      fastify.log.error('TELEGRAM_BOT_TOKEN is not configured');
      return reply.status(500).send({ error: 'Server configuration error' });
    }

    const telegramUser = validateTelegramData(initData, botToken);
    if (!telegramUser) {
      return reply.status(401).send({ error: 'Invalid Telegram data' });
    }

    const user = await findOrCreateUserFromTelegramUser(telegramUser);

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
  });

  fastify.post('/dev-login', async (_request, reply) => {
    if (process.env.ENABLE_DEV_AUTH !== 'true') {
      return reply.status(403).send({ error: 'Dev auth disabled' });
    }

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
  });

  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
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

    return { user };
  });
            }
