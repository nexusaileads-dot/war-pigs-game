import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { RewardCalculator } from '@war-pigs/game-logic';
import { authenticate } from '../middleware/auth';
import { GameSessionService } from '../services/GameSessionService';
import { EconomyService } from '../services/EconomyService';
import { strictRateLimitConfig } from '../middleware/rateLimiter';

const gameSession = new GameSessionService();
const economy = new EconomyService();
const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export async function gameRoutes(fastify: FastifyInstance) {
  // Apply stricter rate limits to high-value gameplay endpoints
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/game/start') || request.url.startsWith('/api/game/complete')) {
      (reply.context.config as any).rateLimit = strictRateLimitConfig.config.rateLimit;
    }
  });

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

    // Pre-check ownership and level existence (read-only, safe outside transaction)
    const [charOwnership, weaponOwnership, level, profile] = await Promise.all([
      prisma.inventoryItem.findFirst({
        where: { userId, itemType: 'CHARACTER', characterId }
      }),
      prisma.inventoryItem.findFirst({
        where: { userId, itemType: 'WEAPON', weaponId }
      }),
      prisma.level.findUnique({ where: { id: levelId } }),
      prisma.profile.findUnique({ where: { userId } })
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

    // Atomic transaction: check active run + create new run + update inventory/profile
    const run = await prisma.$transaction(async (tx) => {
      // Re-check for active run INSIDE transaction to prevent race condition
      const existingActiveRun = await tx.gameRun.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' }
      });

      if (existingActiveRun) {
        await tx.gameRun.update({
          where: { id: existingActiveRun.id },
          data: { status: 'FAILED', endedAt: new Date() }
        });
      }

      await Promise.all([
        tx.inventoryItem.update({
          where: { id: charOwnership.id },
          data: { timesUsed: { increment: 1 } }
        }),
        tx.inventoryItem.update({
          where: { id: weaponOwnership.id },
          data: { timesUsed: { increment: 1 } }
        }),
        tx.profile.update({
          where: { userId },
          data: { equippedCharacterId: characterId, equippedWeaponId: weaponId }
        })
      ]);

      return tx.gameRun.create({
        data: {
          userId,
          levelId,
          characterId,
          weaponId,
          status: 'ACTIVE'
        },
        include: { level: true }
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
        accuracy: number; // ASSUMPTION: 0-100 percentage; adjust clamp if 0-1 float
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

    // Validate session has not expired
    if (Date.now() - session.createdAt.getTime() > SESSION_MAX_AGE_MS) {
      await gameSession.endSession(sessionToken);
      return reply.status(400).send({ error: 'Session expired' });
    }

    const run = await prisma.gameRun.findFirst({
      where: { id: runId, userId },
      include: { level: true }
    });

    if (!run || run.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Invalid run' });
    }

    // Sanitize and clamp stats with explicit accuracy handling (0-100 scale)
    const safeStats = {
      kills: Math.max(0, Math.floor(Number(stats.kills) || 0)),
      damageDealt: Math.max(0, Math.floor(Number(stats.damageDealt) || 0)),
      damageTaken: Math.max(0, Math.floor(Number(stats.damageTaken) || 0)),
      accuracy: Math.max(0, Math.min(100, Number(stats.accuracy) || 0)), // Clamp to 0-100
      timeElapsed: Math.max(0, Math.floor(Number(stats.timeElapsed) || 0)),
      wavesCleared: Math.max(0, Math.floor(Number(stats.wavesCleared) || 0)),
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
    // Use configurable reward multiplier from env or level config
    const rewardMultiplier = Number(process.env.MAX_REWARD_MULTIPLIER) || 5;
    const maxPossibleReward = run.level.baseReward * rewardMultiplier;

    if (rewards.total > maxPossibleReward) {
      fastify.log.error(
        `Reward cap exceeded: ${rewards.total} > ${maxPossibleReward}, User: ${userId}, Run: ${runId}`
      );
      return reply.status(400).send({ error: 'Reward calculation error' });
    }

    // Single transaction: update run + stats + grant rewards (idempotent design)
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

      // Idempotent reward granting: check if already granted before applying
      const existingGrant = await tx.rewardGrant.findFirst({
        where: { runId, userId }
      });
      if (!existingGrant) {
        await tx.rewardGrant.create({
           { runId, userId, pigsGranted: rewards.total, xpGranted: rewards.xpEarned }
        });
        // Update profile economy fields atomically
        await tx.profile.update({
          where: { userId },
           {
            currentPigs: { increment: rewards.total },
            totalPigsEarned: { increment: rewards.total },
            xp: { increment: rewards.xpEarned }
          }
        });
      }
    });

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

    // Validate session expiration
    if (Date.now() - session.createdAt.getTime() > SESSION_MAX_AGE_MS) {
      await gameSession.endSession(sessionToken);
      return reply.status(400).send({ error: 'Session expired' });
    }

    const run = await prisma.gameRun.findFirst({
      where: { id: runId, userId }
    });

    if (!run || run.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Invalid run' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.gameRun.update({
        where: { id: runId },
         { status: 'FAILED', endedAt: new Date() }
      });

      await tx.playerStats.upsert({
        where: { userId },
        update: { totalRuns: { increment: 1 } },
        create: { userId, totalKills: 0, totalRuns: 1, totalBossKills: 0 }
      });
    });

    await gameSession.endSession(sessionToken);
    return { success: true };
  });

  fastify.get('/levels', { preHandler: authenticate }, async (request) => {
    const userId = request.user.userId;

    const [profile, levels, completedRuns] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.level.findMany({ orderBy: { levelNumber: 'asc' } }),
      prisma.gameRun.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { levelId: true }
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
    // NOTE: Ensure database index exists: CREATE INDEX idx_profile_earnings ON Profile(totalPigsEarned DESC)
    const topPlayers = await prisma.profile.findMany({
      take: 100,
      orderBy: { totalPigsEarned: 'desc' },
      include: {
        user: { select: { username: true, firstName: true, photoUrl: true } }
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
