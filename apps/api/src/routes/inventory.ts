import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { authenticate } from '../middleware/auth';

const MAX_WEAPON_LEVEL = 5;
const MAX_CHARACTER_LEVEL = 5;

const getWeaponUpgradeCost = (currentLevel: number) => 150 + currentLevel * 125;
const getCharacterUpgradeCost = (currentLevel: number) => 200 + currentLevel * 150;

export async function inventoryRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;

    const [items, profile] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { userId },
        include: {
          character: true,
          weapon: true
        },
        orderBy: {
          acquiredAt: 'asc'
        }
      }),
      prisma.profile.findUnique({
        where: { userId }
      })
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
              ? {
                  ...item.character,
                  upgradeLevel: item.upgradeLevel
                }
              : item.itemType === 'WEAPON' && item.weapon
                ? {
                    ...item.weapon,
                    upgradeLevel: item.upgradeLevel
                  }
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

    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    if (characterId) {
      const ownsCharacter = await prisma.inventoryItem.findFirst({
        where: {
          userId,
          itemType: 'CHARACTER',
          characterId
        }
      });

      if (!ownsCharacter) {
        return reply.status(400).send({ error: 'Character not owned' });
      }
    }

    if (weaponId) {
      const ownsWeapon = await prisma.inventoryItem.findFirst({
        where: {
          userId,
          itemType: 'WEAPON',
          weaponId
        }
      });

      if (!ownsWeapon) {
        return reply.status(400).send({ error: 'Weapon not owned' });
      }
    }

    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        ...(characterId ? { equippedCharacterId: characterId } : {}),
        ...(weaponId ? { equippedWeaponId: weaponId } : {})
      }
    });

    return {
      success: true,
      equipped: {
        characterId: updatedProfile.equippedCharacterId,
        weaponId: updatedProfile.equippedWeaponId
      }
    };
  });

  fastify.post('/upgrade-weapon', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const { weaponId } = request.body as {
      weaponId?: string;
    };

    if (!weaponId) {
      return reply.status(400).send({ error: 'weaponId is required' });
    }

    const [profile, inventoryItem] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId }
      }),
      prisma.inventoryItem.findFirst({
        where: {
          userId,
          itemType: 'WEAPON',
          weaponId
        },
        include: {
          weapon: true
        }
      })
    ]);

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    if (!inventoryItem || !inventoryItem.weapon) {
      return reply.status(400).send({ error: 'Weapon not owned' });
    }

    const currentLevel = inventoryItem.upgradeLevel ?? 0;

    if (currentLevel >= MAX_WEAPON_LEVEL) {
      return reply.status(400).send({ error: 'Weapon already at max level' });
    }

    const cost = getWeaponUpgradeCost(currentLevel);

    if (profile.currentPigs < cost) {
      return reply.status(400).send({ error: 'Not enough $PIGS' });
    }

    const [, updatedProfile, updatedInventoryItem] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          type: 'SPEND',
          amount: cost,
          description: `Weapon upgrade: ${inventoryItem.weapon.name} to level ${currentLevel + 1}`,
          referenceId: inventoryItem.id
        }
      }),
      prisma.profile.update({
        where: { userId },
        data: {
          currentPigs: {
            decrement: cost
          }
        }
      }),
      prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          upgradeLevel: {
            increment: 1
          }
        }
      })
    ]);

    return {
      success: true,
      itemType: 'WEAPON',
      weaponId,
      upgradeLevel: updatedInventoryItem.upgradeLevel,
      cost,
      currentPigs: updatedProfile.currentPigs
    };
  });

  fastify.post('/upgrade-character', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const { characterId } = request.body as {
      characterId?: string;
    };

    if (!characterId) {
      return reply.status(400).send({ error: 'characterId is required' });
    }

    const [profile, inventoryItem] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId }
      }),
      prisma.inventoryItem.findFirst({
        where: {
          userId,
          itemType: 'CHARACTER',
          characterId
        },
        include: {
          character: true
        }
      })
    ]);

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    if (!inventoryItem || !inventoryItem.character) {
      return reply.status(400).send({ error: 'Character not owned' });
    }

    const currentLevel = inventoryItem.upgradeLevel ?? 0;

    if (currentLevel >= MAX_CHARACTER_LEVEL) {
      return reply.status(400).send({ error: 'Character already at max level' });
    }

    const cost = getCharacterUpgradeCost(currentLevel);

    if (profile.currentPigs < cost) {
      return reply.status(400).send({ error: 'Not enough $PIGS' });
    }

    const [, updatedProfile, updatedInventoryItem] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          type: 'SPEND',
          amount: cost,
          description: `Character upgrade: ${inventoryItem.character.name} to level ${currentLevel + 1}`,
          referenceId: inventoryItem.id
        }
      }),
      prisma.profile.update({
        where: { userId },
        data: {
          currentPigs: {
            decrement: cost
          }
        }
      }),
      prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          upgradeLevel: {
            increment: 1
          }
        }
      })
    ]);

    return {
      success: true,
      itemType: 'CHARACTER',
      characterId,
      upgradeLevel: updatedInventoryItem.upgradeLevel,
      cost,
      currentPigs: updatedProfile.currentPigs
    };
  });
        }
