// apps/api/src/routes/game.ts

import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { RewardCalculator } from '@war-pigs/game-logic';
import { authenticate } from '../middleware/auth';
import { GameSessionService } from '../services/GameSessionService';
import { EconomyService } from '../services/EconomyService';

const gameSession = new GameSessionService();
const economy = new EconomyService();

export async function gameRoutes(fastify: FastifyInstance) {
  // Start a game run
  fastify.post('/start', { preHandler: authenticate }, async (request, reply) => {
    const { levelId, characterId, weaponId } = request.body as {
      levelId: string;
      characterId: string;
      weaponId: string;
    };

    const [charOwnership, weaponOwnership, level] = await Promise.all([
      prisma.inventoryItem.findFirst({
        where: { userId: request.user!.userId, characterId }
      }),
      prisma.inventoryItem.findFirst({
        where: { userId: request.user!.userId, weaponId }
      }),
      prisma.level.findUnique({
        where: { id: levelId }
      })
    ]);

    if (!charOwnership || !weaponOwnership) {
      return reply.status(400).send({ error: 'Character or weapon not owned' });
    }

    if (!level) {
      return reply.status(404).send({ error: 'Level not found' });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: request.user!.userId }
    });

    if (level.unlockRequirement > 0 && (profile?.level || 1) < level.unlockRequirement) {
      return reply.status(403).send({ error: 'Level not unlocked' });
    }

    const run = await prisma.gameRun.create({
      data: {
        userId: request.user!.userId,
        levelId,
        characterId,
        weaponId,
        status: 'ACTIVE'
      }
    });

    const sessionToken = await gameSession.createSession(run.id, {
      userId: request.user!.userId,
      levelId,
      characterId,
      weaponId,
      maxEnemies: level.waves * 5,
      difficulty: level.difficulty
    });

    return { run, sessionToken };
  });

  // Submit run results
  fastify.post('/complete', { preHandler: authenticate }, async (request, reply) => {
    const { runId, stats, sessionToken, clientHash } = request.body as {
      runId: string;
      stats: {
        kills: number;
        damageDealt: number;
        damageTaken: number;
        accuracy: number;
        timeElapsed: number;
        wavesCleared: number;
        bossKilled: boolean;
      };
      sessionToken: string;
      clientHash: string;
    };

    const session = await gameSession.getSession(sessionToken);
    if (!session || session.userId !== request.user!.userId) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const run = await prisma.gameRun.findFirst({
      where: {
        id: runId,
        userId: request.user!.userId
      },
      include: {
        level: true
      }
    });

    if (!run || run.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Invalid run' });
    }

    const calculator = new RewardCalculator();
    const maxPossibleKills = run.level.waves * 5;

    const validation = calculator.validateRunStats(
      {
        ...stats,
        difficulty: run.level.difficulty,
        isPerfectRun: stats.damageTaken === 0
      },
      maxPossibleKills
    );

    if (!validation.valid) {
      fastify.log.warn(`Potential cheat detected: ${validation.reason}, User: ${request.user!.userId}`);
    }

    const rewards = calculator.calculateRewards({
      ...stats,
      difficulty: run.level.difficulty,
      isPerfectRun: stats.damageTaken === 0
    });

    const maxPossibleReward = run.level.baseReward * 5;
    if (rewards.total > maxPossibleReward) {
      return reply.status(400).send({ error: 'Reward calculation error' });
    }

    await prisma.gameRun.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        score: stats.kills * 100 + (stats.bossKilled ? 1000 : 0),
        kills: stats.kills,
        damageDealt: stats.damageDealt,
        damageTaken: stats.damageTaken,
        accuracy: stats.accuracy,
        rewardsEarned: rewards.total,
        xpEarned: rewards.xpEarned,
        clientHash,
        serverValidated: validation.valid
      }
    });

    await economy.grantRewards(
      request.user!.userId,
      rewards.total,
      rewards.xpEarned,
      runId
    );

    await prisma.playerStats.update({
      where: { userId: request.user!.userId },
      data: {
        totalKills: { increment: stats.kills },
        totalRuns: { increment: 1 },
        totalBossKills: { increment: stats.bossKilled ? 1 : 0 }
      }
    });

    await gameSession.endSession(sessionToken);

    return {
      success: true,
      rewards,
      validation: validation.valid ? 'passed' : 'flagged'
    };
  });

  // Get levels
  fastify.get('/levels', { preHandler: authenticate }, async (request) => {
    const profile = await prisma.profile.findUnique({
      where: { userId: request.user!.userId }
    });

    const levels = await prisma.level.findMany({
      orderBy: { levelNumber: 'asc' }
    });

    return levels.map((level) => ({
      ...level,
      unlocked: profile ? profile.level >= level.unlockRequirement : level.unlockRequirement === 0,
      completed: false
    }));
  });

  // Get leaderboard
  fastify.get('/leaderboard', async () => {
    const topPlayers = await prisma.profile.findMany({
      take: 100,
      orderBy: { totalPigsEarned: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            photoUrl: true
          }
        }
      }
    });

    return topPlayers.map((p, index) => ({
      rank: index + 1,
      username: p.user.username || p.user.firstName || 'Anonymous',
      photoUrl: p.user.photoUrl,
      level: p.level,
      totalEarned: p.totalPigsEarned
    }));
  });
}
