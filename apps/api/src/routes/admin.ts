import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { authenticate } from '../middleware/auth';

// Simple admin check - in production, use proper admin roles
const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId }
    });

    if (!user || !ADMIN_TELEGRAM_IDS.includes(user.telegramId)) {
      return reply.status(403).send({ error: 'Admin only' });
    }
  });

  // Grant currency (for testing/emergencies)
  fastify.post('/grant', async (request, reply) => {
    const { telegramId, amount, reason } = request.body as any;
    
    const user = await prisma.user.findUnique({
      where: { telegramId }
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

    return { success: true };
  });

  // Get stats
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
