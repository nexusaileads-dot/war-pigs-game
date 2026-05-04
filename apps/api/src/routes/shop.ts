import { FastifyInstance } from 'fastify';
import { prisma } from '@war-pigs/database';
import { authenticate } from '../middleware/auth';
import { strictRateLimitConfig } from '../middleware/rateLimiter';

type ShopItemType = 'CHARACTER' | 'WEAPON';

export async function shopRoutes(fastify: FastifyInstance) {
  fastify.get('/items', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;

    const [profile, characters, weapons, ownedItems] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.character.findMany({ orderBy: [{ unlockLevel: 'asc' }, { pricePigs: 'asc' }] }),
      prisma.weapon.findMany({ orderBy: [{ unlockLevel: 'asc' }, { pricePigs: 'asc' }] }),
      prisma.inventoryItem.findMany({
        where: { userId },
        select: { itemType: true, characterId: true, weaponId: true, upgradeLevel: true }
      })
    ]);

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const ownedCharacterIds = new Set(
      ownedItems
        .filter((item) => item.itemType === 'CHARACTER' && item.characterId)
        .map((item) => item.characterId as string)
    );

    const ownedWeaponIds = new Set(
      ownedItems
        .filter((item) => item.itemType === 'WEAPON' && item.weaponId)
        .map((item) => item.weaponId as string)
    );

    return {
      characters: characters.map((character) => ({
        ...character,
        owned: ownedCharacterIds.has(character.characterId),
        canAfford: profile.currentPigs >= character.pricePigs,
        canUnlock: profile.level >= character.unlockLevel
      })),
      weapons: weapons.map((weapon) => ({
        ...weapon,
        owned: ownedWeaponIds.has(weapon.weaponId),
        canAfford: profile.currentPigs >= weapon.pricePigs,
        canUnlock: profile.level >= weapon.unlockLevel
      }))
    };
  });

  // Apply strict rate limiting to the buy endpoint
  fastify.post('/buy', { preHandler: [authenticate, (request, reply, done) => {
    (reply.context.config as any).rateLimit = strictRateLimitConfig;
    done();
  }] }, async (request, reply) => {
    const userId = request.user.userId;
    const { itemType, itemId } = request.body as { itemType?: ShopItemType; itemId?: string };

    if (!itemType || !itemId) {
      return reply.status(400).send({ error: 'Missing itemType or itemId' });
    }

    if (itemType !== 'CHARACTER' && itemType !== 'WEAPON') {
      return reply.status(400).send({ error: 'Invalid itemType' });
    }

    const item =
      itemType === 'CHARACTER'
        ? await prisma.character.findUnique({ where: { characterId: itemId } })
        : await prisma.weapon.findUnique({ where: { weaponId: itemId } });

    if (!item) {
      return reply.status(404).send({ error: 'Item not found' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const profile = await tx.profile.findUnique({ where: { userId } });

        if (!profile) throw new Error('PROFILE_NOT_FOUND');

        const existing = await tx.inventoryItem.findFirst({
          where:
            itemType === 'CHARACTER'
              ? { userId, itemType: 'CHARACTER', characterId: itemId }
              : { userId, itemType: 'WEAPON', weaponId: itemId }
        });

        if (existing) throw new Error('ITEM_ALREADY_OWNED');
        if (profile.level < item.unlockLevel) throw new Error('LEVEL_REQUIREMENT_NOT_MET');
        if (profile.currentPigs < item.pricePigs) throw new Error('INSUFFICIENT_PIGS');

        // Auto-equip if slot is empty
        const updateData: any = { currentPigs: { decrement: item.pricePigs } };
        if (itemType === 'CHARACTER' && !profile.equippedCharacterId) {
          updateData.equippedCharacterId = itemId;
        }
        if (itemType === 'WEAPON' && !profile.equippedWeaponId) {
          updateData.equippedWeaponId = itemId;
        }

        const [updatedProfile, inventoryItem] = await Promise.all([
          tx.profile.update({ where: { userId }, data: updateData }),
          tx.inventoryItem.create({
            data: {
              userId,
              itemType,
              characterId: itemType === 'CHARACTER' ? itemId : null,
              weaponId: itemType === 'WEAPON' ? itemId : null,
              upgradeLevel: 0
            }
          })
        ]);

        await tx.transaction.create({
          data: {
            userId,
            type: 'SPEND',
            amount: item.pricePigs,
            description: `Purchased ${item.name}`,
            referenceId: itemId
          }
        });

        return {
          inventoryItem,
          currentPigs: updatedProfile.currentPigs,
          equippedCharacterId: updatedProfile.equippedCharacterId,
          equippedWeaponId: updatedProfile.equippedWeaponId
        };
      });

      return {
        success: true,
        message: `Purchased ${item.name}`,
        item: {
          id: result.inventoryItem.id,
          type: result.inventoryItem.itemType,
          characterId: result.inventoryItem.characterId,
          weaponId: result.inventoryItem.weaponId,
          upgradeLevel: result.inventoryItem.upgradeLevel
        },
        currentPigs: result.currentPigs,
        equipped: {
          characterId: result.equippedCharacterId,
          weaponId: result.equippedWeaponId
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'PROFILE_NOT_FOUND':
            return reply.status(404).send({ error: 'Profile not found' });
          case 'ITEM_ALREADY_OWNED':
            return reply.status(409).send({ error: 'Item already owned' }); // 409 Conflict
          case 'LEVEL_REQUIREMENT_NOT_MET':
            return reply.status(403).send({ error: 'Level requirement not met' });
          case 'INSUFFICIENT_PIGS':
            return reply.status(402).send({ error: 'Insufficient PIGS' }); // 402 Payment Required
        }
      }

      fastify.log.error(error);
      return reply.status(500).send({ error: 'Purchase failed' });
    }
  });
}
