import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { authenticate } from '../middleware/auth';
import { strictRateLimitConfig } from '../middleware/rateLimiter';

const MAX_WEAPON_LEVEL = 5;
const MAX_CHARACTER_LEVEL = 5;

const getWeaponUpgradeCost = (currentLevel: number) => 150 + currentLevel * 125;
const getCharacterUpgradeCost = (currentLevel: number) => 200 + currentLevel * 150;

export async function inventoryRoutes(fastify: FastifyInstance) {
  // Apply strict rate limiting to high-value upgrade endpoints
  fastify.post('/upgrade-weapon', { preHandler: [authenticate, (request, reply, done) => {
    (reply.context.config as any).rateLimit = strictRateLimitConfig;
    done();
  }] }, async (request, reply) => {
    const userId = request.user.userId;
    const { weaponId } = request.body as { weaponId?: string };

    if (!weaponId) {
      return reply.status(400).send({ error: 'weaponId is required' });
    }

    // Move validation inside transaction to prevent race conditions (e.g., balance drain)
    try {
      const result = await prisma.$transaction(async (tx) => {
        const profile = await tx.profile.findUnique({ where: { userId } });
        if (!profile) throw new Error('PROFILE_NOT_FOUND');

        const inventoryItem = await tx.inventoryItem.findFirst({
          where: { userId, itemType: 'WEAPON', weaponId },
          include: { weapon: true }
        });

        if (!inventoryItem || !inventoryItem.weapon) throw new Error('WEAPON_NOT_OWNED');

        const currentLevel = inventoryItem.upgradeLevel ?? 0;
        if (currentLevel >= MAX_WEAPON_LEVEL) throw new Error('MAX_LEVEL_REACHED');

        const cost = getWeaponUpgradeCost(currentLevel);
        if (profile.currentPigs < cost) throw new Error('INSUFFICIENT_FUNDS');

        // Execute atomic updates
        const [updatedProfile, updatedItem] = await Promise.all([
          tx.profile.update({
            where: { userId },
            data: { currentPigs: { decrement: cost } }
          }),
          tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: { upgradeLevel: { increment: 1 } }
          })
        ]);

        await tx.transaction.create({
          data: {
            userId,
            type: 'SPEND',
            amount: cost,
            description: `Weapon upgrade: ${inventoryItem.weapon.name} to level ${updatedItem.upgradeLevel}`,
            referenceId: inventoryItem.id
          }
        });

        return {
          currentPigs: updatedProfile.currentPigs,
          upgradeLevel: updatedItem.upgradeLevel
        };
      });

      return {
        success: true,
        itemType: 'WEAPON',
        weaponId,
        upgradeLevel: result.upgradeLevel,
        cost: getWeaponUpgradeCost(result.upgradeLevel - 1), // Cost of the upgrade just performed
        currentPigs: result.currentPigs
      };
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'PROFILE_NOT_FOUND': return reply.status(404).send({ error: 'Profile not found' });
          case 'WEAPON_NOT_OWNED': return reply.status(400).send({ error: 'Weapon not owned' });
          case 'MAX_LEVEL_REACHED': return reply.status(400).send({ error: 'Weapon already at max level' });
          case 'INSUFFICIENT_FUNDS': return reply.status(400).send({ error: 'Not enough $PIGS' });
        }
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Upgrade failed' });
    }
  });

  fastify.post('/upgrade-character', { preHandler: [authenticate, (request, reply, done) => {
    (reply.context.config as any).rateLimit = strictRateLimitConfig;
    done();
  }] }, async (request, reply) => {
    const userId = request.user.userId;
    const { characterId } = request.body as { characterId?: string };

    if (!characterId) {
      return reply.status(400).send({ error: 'characterId is required' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const profile = await tx.profile.findUnique({ where: { userId } });
        if (!profile) throw new Error('PROFILE_NOT_FOUND');

        const inventoryItem = await tx.inventoryItem.findFirst({
          where: { userId, itemType: 'CHARACTER', characterId },
          include: { character: true }
        });

        if (!inventoryItem || !inventoryItem.character) throw new Error('CHARACTER_NOT_OWNED');

        const currentLevel = inventoryItem.upgradeLevel ?? 0;
        if (currentLevel >= MAX_CHARACTER_LEVEL) throw new Error('MAX_LEVEL_REACHED');

        const cost = getCharacterUpgradeCost(currentLevel);
        if (profile.currentPigs < cost) throw new Error('INSUFFICIENT_FUNDS');

        const [updatedProfile, updatedItem] = await Promise.all([
          tx.profile.update({
            where: { userId },
            data: { currentPigs: { decrement: cost } }
          }),
          tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: { upgradeLevel: { increment: 1 } }
          })
        ]);

        await tx.transaction.create({
           {
            userId,
            type: 'SPEND',
            amount: cost,
            description: `Character upgrade: ${inventoryItem.character.name} to level ${updatedItem.upgradeLevel}`,
            referenceId: inventoryItem.id
          }
        });

        return {
          currentPigs: updatedProfile.currentPigs,
          upgradeLevel: updatedItem.upgradeLevel
        };
      });

      return {
        success: true,
        itemType: 'CHARACTER',
        characterId,
        upgradeLevel: result.upgradeLevel,
        cost: getCharacterUpgradeCost(result.upgradeLevel - 1),
        currentPigs: result.currentPigs
      };
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'PROFILE_NOT_FOUND': return reply.status(404).send({ error: 'Profile not found' });
          case 'CHARACTER_NOT_OWNED': return reply.status(400).send({ error: 'Character not owned' });
          case 'MAX_LEVEL_REACHED': return reply.status(400).send({ error: 'Character already at max level' });
          case 'INSUFFICIENT_FUNDS': return reply.status(400).send({ error: 'Not enough $PIGS' });
        }
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Upgrade failed' });
    }
  });

  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;

    const [items, profile] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { userId },
        include: { character: true, weapon: true },
        orderBy: { acquiredAt: 'asc' }
      }),
      prisma.profile.findUnique({ where: { userId } })
    ]);

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    return {
      items: items
        .map((item) => ({
          id: item.id,
          type: item.itemType,
          acquiredAt: item.acquiredAt,
          timesUsed: item.timesUsed,
          details:
            item.itemType === 'CHARACTER' && item.character
              ? { ...item.character, upgradeLevel: item.upgradeLevel }
              : item.itemType === 'WEAPON' && item.weapon
                ? { ...item.weapon, upgradeLevel: item.upgradeLevel }
                : null
        }))
        .filter((item) => item.details),
      equipped: {
        characterId: profile.equippedCharacterId,
        weaponId: profile.equippedWeaponId
      }
    };
  });

  fastify.post('/equip', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const { characterId, weaponId } = request.body as {
      characterId?: string;
      weaponId?: string;
    };

    if (!characterId && !weaponId) {
      return reply.status(400).send({ error: 'No item provided to equip' });
    }

    // Atomic transaction for equip logic
    try {
      const result = await prisma.$transaction(async (tx) => {
        if (characterId) {
          const ownsCharacter = await tx.inventoryItem.findFirst({
            where: { userId, itemType: 'CHARACTER', characterId }
          });
          if (!ownsCharacter) throw new Error('CHARACTER_NOT_OWNED');
        }

        if (weaponId) {
          const ownsWeapon = await tx.inventoryItem.findFirst({
            where: { userId, itemType: 'WEAPON', weaponId }
          });
          if (!ownsWeapon) throw new Error('WEAPON_NOT_OWNED');
        }

        return tx.profile.update({
          where: { userId },
          data: {
            ...(characterId ? { equippedCharacterId: characterId } : {}),
            ...(weaponId ? { equippedWeaponId: weaponId } : {})
          }
        });
      });

      return {
        success: true,
        equipped: {
          characterId: result.equippedCharacterId,
          weaponId: result.equippedWeaponId
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CHARACTER_NOT_OWNED') return reply.status(400).send({ error: 'Character not owned' });
        if (error.message === 'WEAPON_NOT_OWNED') return reply.status(400).send({ error: 'Weapon not owned' });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to equip item' });
    }
  });
}
