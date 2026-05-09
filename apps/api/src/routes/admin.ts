import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { authenticate } from '../middleware/auth';

const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export async function adminRoutes(fastify: FastifyInstance) {
  // Secure all routes with authentication
  fastify.addHook('preHandler', authenticate);

  // Custom authorization hook: check against whitelist
  fastify.addHook('preHandler', async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { telegramId: true }
    });

    if (!user || !ADMIN_TELEGRAM_IDS.includes(user.telegramId)) {
      fastify.log.warn({ userId: request.user.userId }, 'Unauthorized admin access attempt');
      return reply.status(403).send({ error: 'Admin only' });
    }
  });

  fastify.post('/grant', async (request, reply) => {
    const { telegramId, amount, reason } = request.body as {
      telegramId?: string;
      amount?: number;
      reason?: string;
    };

    if (!telegramId || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return reply.status(400).send({ error: 'Invalid grant payload' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true }
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await prisma.$transaction([
      prisma.profile.update({
        where: { userId: user.id },
        data: {
          currentPigs: { increment: amount },
          totalPigsEarned: { increment: amount }
        }
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'REWARD',
          amount,
          description: reason || 'Admin grant',
          referenceId: 'ADMIN'
        }
      })
    ]);

    fastify.log.info({ telegramId, amount, admin: request.user.userId }, 'Admin granted currency');

    return { success: true };
  });

  fastify.get('/stats', async () => {
    const [totalUsers, totalRuns, totalEarned] = await Promise.all([
      prisma.user.count(),
      prisma.gameRun.count(),
      prisma.transaction.aggregate({
        where: { type: 'EARN' },
        _sum: { amount: true }
      })
    ]);

    return {
      totalUsers,
      totalRuns,
      totalPigsDistributed: totalEarned._sum.amount || 0
    };
  });
}
