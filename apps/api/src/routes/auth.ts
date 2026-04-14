import { FastifyInstance } from 'fastify';
import { validateTelegramData } from '../middleware/validateTelegram';
import { prisma } from '@war-pigs/database';
import { authenticate } from '../middleware/auth';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/telegram', async (request, reply) => {
    const { initData } = request.body as { initData: string };
    
    if (!initData) {
      return reply.status(400).send({ error: 'Missing initData' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const telegramUser = validateTelegramData(initData, botToken);

    if (!telegramUser) {
      return reply.status(401).send({ error: 'Invalid Telegram data' });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramUser.id.toString() },
      include: { profile: true, wallet: true }
    });

    if (!user) {
      // Create new user with defaults
      user = await prisma.user.create({
        data: {
          telegramId: telegramUser.id.toString(),
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          photoUrl: telegramUser.photo_url,
          profile: {
            create: {
              level: 1,
              xp: 0,
              totalPigsEarned: 0,
              currentPigs: 0,
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
        include: { profile: true, wallet: true }
      });

      // Give starter items
      await prisma.inventoryItem.createMany({
        data: [
          { userId: user.id, itemType: 'CHARACTER', characterId: 'grunt_bacon' },
          { userId: user.id, itemType: 'WEAPON', weaponId: 'oink_pistol' }
        ]
      });
    } else {
      // Update user info if changed
      await prisma.user.update({
        where: { id: user.id },
        data: {
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          photoUrl: telegramUser.photo_url
        }
      });
    }

    // Generate JWT
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
        photoUrl: user.photoUrl,
        profile: user.profile,
        wallet: user.wallet
      }
    };
  });

  fastify.get('/me', { preHandler: authenticate }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: {
        profile: true,
        wallet: true,
        stats: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { user };
  });
}
