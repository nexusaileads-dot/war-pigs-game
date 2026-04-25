import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { RewardCalculator } from '@war-pigs/game-logic';
import { authenticate } from '../middleware/auth';
import { GameSessionService } from '../services/GameSessionService';
import { EconomyService } from '../services/EconomyService';

const gameSession = new GameSessionService();
const economy = new EconomyService();

export async function gameRoutes(fastify: FastifyInstance) {
  fastify.post('/start', { preHandler: authenticate }, async (request, reply) => {
    const { levelId, characterId, weaponId } = request.body as {
      levelId?: string;
      characterId?: string;
      weaponId?: string;
    };

    if (!levelId || !characterId || !weaponId) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    const userId = request.user.userId;

    const [charOwnership, weaponOwnership, level, profile, existingActiveRun] =
      await Promise.all([
        prisma.inventoryItem.findFirst({
          where: {
            userId,
            itemType: 'CHARACTER',
            characterId
          }
        }),
        prisma.inventoryItem.findFirst({
          where: {
            userId,
            itemType: 'WEAPON',
            weaponId
          }
        }),
        prisma.level.findUnique({
          where: { id: levelId }
        }),
        prisma.profile.findUnique({
          where: { userId }
        }),
        prisma.gameRun.findFirst({
          where: {
            userId,
            status: 'ACTIVE'
          },
          orderBy: {
            startedAt: 'desc'
          }
        })
      ]);

    if (!charOwnership || !weaponOwnership) {
      return reply.status(400).send({ error: 'Character or weapon not owned' });
    }

    if (!level) {
      return reply.status(404).send({ error: 'Level not found' });
    }

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    if (level.unlockRequirement > 0 && profile.level < level.unlockRequirement) {
      return reply.status(403).send({ error: 'Level not unlocked' });
    }

    const run = await prisma.$transaction(async (tx) => {
      if (existingActiveRun) {
        await tx.gameRun.update({
          where: { id: existingActiveRun.id },
          data: {
            status: 'FAILED',
            endedAt: new Date()
          }
        });
      }

      await tx.inventoryItem.update({
        where: { id: charOwnership.id },
        data: {
          timesUsed: {
            increment: 1
          }
        }
      });

      await tx.inventoryItem.update({
        where: { id: weaponOwnership.id },
        data: {
          timesUsed: {
            increment: 1
          }
        }
      });

      await tx.profile.update({
        where: { userId },
        data: {
          equippedCharacterId: characterId,
          equippedWeaponId: weaponId
        }
      });

      return tx.gameRun.create({
        data: {
          userId,
          levelId,
          characterId,
          weaponId,
          status: 'ACTIVE'
        },
        include: {
          level: true
        }
      });
    });

    const sessionToken = await gameSession.createSession(run.id, {
      userId,
      levelId,
      characterId,
      weaponId,
      maxEnemies: Math.max(5, level.waves * 5),
      difficulty: level.difficulty
    });

    return {
      run: {
        id: run.id,
        characterId: run.characterId,
        weaponId: run.weaponId,
        levelId: run.levelId,
        characterUpgradeLevel: charOwnership.upgradeLevel || 0,
        weaponUpgradeLevel: weaponOwnership.upgradeLevel || 0
      },
      sessionToken
    };
  });

  fastify.post('/complete', { preHandler: authenticate }, async (request, reply) => {
    const { runId, stats, sessionToken, clientHash } = request.body as {
      runId?: string;
      stats?: {
        kills: number;
        damageDealt: number;
        damageTaken: number;
        accuracy: number;
        timeElapsed: number;
        wavesCleared: number;
        bossKilled: boolean;
      };
      sessionToken?: string;
      clientHash?: string;
    };

    if (!runId || !stats || !sessionToken || !clientHash) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    const userId = request.user.userId;

    const session = await gameSession.getSession(sessionToken);
    if (!session || session.userId !== userId) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const run = await prisma.gameRun.findFirst({
      where: {
        id: runId,
        userId
      },
      include: {
        level: true
      }
    });

    if (!run || run.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Invalid run' });
    }

    const safeStats = {
      kills: Math.max(0, Number(stats.kills) || 0),
      damageDealt: Math.max(0, Number(stats.damageDealt) || 0),
      damageTaken: Math.max(0, Number(stats.damageTaken) || 0),
      accuracy: Math.max(0, Math.min(1, Number(stats.accuracy) || 0)),
      timeElapsed: Math.max(0, Number(stats.timeElapsed) || 0),
      wavesCleared: Math.max(0, Number(stats.wavesCleared) || 0),
      bossKilled: Boolean(stats.bossKilled)
    };

    const calculator = new RewardCalculator();
    const maxPossibleKills = Math.max(5, run.level.waves * 5);

    const rewardInput = {
      ...safeStats,
      difficulty: run.level.difficulty,
      isPerfectRun: safeStats.damageTaken === 0
    };

    const validation = calculator.validateRunStats(rewardInput, maxPossibleKills);

    if (!validation.valid) {
      fastify.log.warn(
        `Potential cheat detected: ${validation.reason}, User: ${userId}, Run: ${runId}`
      );
    }

    const rewards = calculator.calculateRewards(rewardInput);
    const maxPossibleReward = Math.max(run.level.baseReward, run.level.baseReward * 5);

    if (rewards.total > maxPossibleReward) {
      return reply.status(400).send({ error: 'Reward calculation error' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.gameRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          score: safeStats.kills * 100 + (safeStats.bossKilled ? 1000 : 0),
          kills: safeStats.kills,
          damageDealt: safeStats.damageDealt,
          damageTaken: safeStats.damageTaken,
          accuracy: safeStats.accuracy,
          rewardsEarned: rewards.total,
          xpEarned: rewards.xpEarned,
          clientHash,
          serverValidated: validation.valid
        }
      });

      await tx.playerStats.upsert({
        where: { userId },
        update: {
          totalKills: { increment: safeStats.kills },
          totalRuns: { increment: 1 },
          totalBossKills: { increment: safeStats.bossKilled ? 1 : 0 }
        },
        create: {
          userId,
          totalKills: safeStats.kills,
          totalRuns: 1,
          totalBossKills: safeStats.bossKilled ? 1 : 0
        }
      });
    });

    await economy.grantRewards(userId, rewards.total, rewards.xpEarned, runId);
    await gameSession.endSession(sessionToken);

    return {
      success: true,
      rewards,
      validation: validation.valid ? 'passed' : 'flagged'
    };
  });

  fastify.post('/fail', { preHandler: authenticate }, async (request, reply) => {
    const { runId, sessionToken } = request.body as {
      runId?: string;
      sessionToken?: string;
    };

    if (!runId || !sessionToken) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    const userId = request.user.userId;
    const session = await gameSession.getSession(sessionToken);

    if (!session || session.userId !== userId) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    const run = await prisma.gameRun.findFirst({
      where: {
        id: runId,
        userId
      }
    });

    if (!run || run.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Invalid run' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.gameRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          endedAt: new Date()
        }
      });

      await tx.playerStats.upsert({
        where: { userId },
        update: {
          totalRuns: { increment: 1 }
        },
        create: {
          userId,
          totalKills: 0,
          totalRuns: 1,
          totalBossKills: 0
        }
      });
    });

    await gameSession.endSession(sessionToken);

    return { success: true };
  });

  fastify.get('/levels', { preHandler: authenticate }, async (request) => {
    const userId = request.user.userId;

    const [profile, levels, completedRuns] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId }
      }),
      prisma.level.findMany({
        orderBy: { levelNumber: 'asc' }
      }),
      prisma.gameRun.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        select: {
          levelId: true
        }
      })
    ]);

    const completedLevelIds = new Set(completedRuns.map((run) => run.levelId));

    return levels.map((level) => ({
      ...level,
      unlocked: profile ? profile.level >= level.unlockRequirement : level.unlockRequirement === 0,
      completed: completedLevelIds.has(level.id)
    }));
  });

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

    return topPlayers.map((player, index) => ({
      rank: index + 1,
      username: player.user.username || player.user.firstName || 'Anonymous',
      photoUrl: player.user.photoUrl,
      level: player.level,
      totalEarned: player.totalPigsEarned
    }));
  });
        }
