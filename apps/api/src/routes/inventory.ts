import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { authenticate } from '../middleware/auth';

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
      items: items.map((item) => ({
        id: item.id,
        type: item.itemType,
        acquiredAt: item.acquiredAt,
        timesUsed: item.timesUsed,
        details: item.itemType === 'CHARACTER' ? item.character : item.weapon
      })),
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

    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    await prisma.profile.update({
      where: { userId },
      data: {
        ...(characterId ? { equippedCharacterId: characterId } : {}),
        ...(weaponId ? { equippedWeaponId: weaponId } : {})
      }
    });

    return { success: true };
  });
                                                              }
