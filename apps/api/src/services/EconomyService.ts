import { prisma, Prisma } from '@war-pigs/database';
import { getSolanaService } from '@war-pigs/solana';

export class EconomyService {
  private solana = getSolanaService();

  async grantRewards(
    userId: string,
    pigsAmount: number,
    xpAmount: number,
    runId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.profile.update({
        where: { userId },
        data: {
          currentPigs: { increment: pigsAmount },
          totalPigsEarned: { increment: pigsAmount },
          xp: { increment: xpAmount }
        }
      });

      await this.checkLevelUp(tx, userId, updatedProfile.xp, updatedProfile.level);

      await tx.transaction.create({
        data: {
          userId,
          type: 'EARN',
          amount: pigsAmount,
          description: 'Mission rewards',
          referenceId: runId
        }
      });

      const wallet = await tx.wallet.findUnique({
        where: { userId }
      });

      if (wallet?.solanaAddress) {
        await tx.wallet.update({
          where: { userId },
          data: {
            pendingRewards: { increment: pigsAmount }
          }
        });
      }
    });
  }

  private async checkLevelUp(
    tx: Prisma.TransactionClient,
    userId: string,
    currentXp: number,
    currentLevel: number
  ): Promise<void> {
    let xp = currentXp;
    let level = currentLevel;

    while (xp >= level * 1000) {
      xp -= level * 1000;
      level += 1;
    }

    if (level !== currentLevel || xp !== currentXp) {
      await tx.profile.update({
        where: { userId },
        data: {
          level,
          xp
        }
      });
    }
  }

  async claimRewards(
    userId: string
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet?.solanaAddress || wallet.pendingRewards <= 0) {
      return {
        success: false,
        error: 'No rewards to claim or wallet not linked'
      };
    }

    const amount = wallet.pendingRewards;

    const result = await this.solana.distributeRewards({
      recipientAddress: wallet.solanaAddress,
      amount,
      referenceId: `claim_${userId}_${Date.now()}`
    });

    if (result.success) {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId },
          data: {
            pendingRewards: 0,
            claimedRewards: { increment: amount },
            lastClaimAt: new Date()
          }
        }),
        prisma.transaction.create({
          data: {
            userId,
            type: 'CLAIM',
            amount: -amount,
            description: 'Claimed to Solana wallet',
            txHash: result.signature
          }
        })
      ]);
    }

    return result;
  }
  }
