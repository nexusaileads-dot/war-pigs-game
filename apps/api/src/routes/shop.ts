import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { authenticate } from '../middleware/auth';

export async function shopRoutes(fastify: FastifyInstance) {
  fastify.get('/items', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;

    const [profile, characters, weapons, ownedItems] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId }
      }),
      prisma.character.findMany({
        orderBy: { pricePigs: 'asc' }
      }),
      prisma.weapon.findMany({
        orderBy: { pricePigs: 'asc' }
      }),
      prisma.inventoryItem.findMany({
        where: { userId },
        select: {
          characterId: true,
          weaponId: true
        }
      })
    ]);

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const ownedIds = new Set<string>(
      ownedItems
        .flatMap((item) => [item.characterId, item.weaponId])
        .filter((value): value is string => Boolean(value))
    );

    return {
      characters: characters.map((character) => ({
        ...character,
        owned: ownedIds.has(character.characterId),
        canAfford: profile.currentPigs >= character.pricePigs,
        canUnlock: profile.level >= character.unlockLevel
      })),
      weapons: weapons.map((weapon) => ({
        ...weapon,
        owned: ownedIds.has(weapon.weaponId),
        canAfford: profile.currentPigs >= weapon.pricePigs,
        canUnlock: profile.level >= weapon.unlockLevel
      }))
    };
  });

  fastify.post('/buy', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const { itemType, itemId } = request.body as {
      itemType?: 'CHARACTER' | 'WEAPON';
      itemId?: string;
    };

    if (!itemType || !itemId) {
      return reply.status(400).send({ error: 'Missing itemType or itemId' });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: {
        userId,
        OR: [
          { characterId: itemId },
          { weaponId: itemId }
        ]
      }
    });

    if (existing) {
      return reply.status(400).send({ error: 'Item already owned' });
    }

    const item =
      itemType === 'CHARACTER'
        ? await prisma.character.findUnique({ where: { characterId: itemId } })
        : await prisma.weapon.findUnique({ where: { weaponId: itemId } });

    if (!item) {
      return reply.status(404).send({ error: 'Item not found' });
    }

    if (profile.level < item.unlockLevel) {
      return reply.status(403).send({ error: 'Level requirement not met' });
    }

    if (profile.currentPigs < item.pricePigs) {
      return reply.status(400).send({ error: 'Insufficient PIGS' });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.profile.update({
          where: { userId },
          data: {
            currentPigs: { decrement: item.pricePigs }
          }
        });

        await tx.inventoryItem.create({
          data: {
            userId,
            itemType,
            characterId: itemType === 'CHARACTER' ? itemId : null,
            weaponId: itemType === 'WEAPON' ? itemId : null
          }
        });

        await tx.transaction.create({
          data: {
            userId,
            type: 'SPEND',
            amount: -item.pricePigs,
            description: `Purchased ${item.name}`,
            referenceId: itemId
          }
        });
      });

      return {
        success: true,
        message: `Purchased ${item.name}`
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Purchase failed' });
    }
  });
      }
