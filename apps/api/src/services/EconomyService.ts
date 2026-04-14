import { prisma } from '@war-pigs/database';
import { getSolanaService } from '@war-pigs/solana';

export class EconomyService {
  private solana = getSolanaService();

  async grantRewards(userId: string, pigsAmount: number, xpAmount: number, runId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update profile
      const profile = await tx.profile.update({
        where: { userId },
        data: {
          currentPigs: { increment: pigsAmount },
          totalPigsEarned: { increment: pigsAmount },
          xp: { increment: xpAmount }
        }
      });

      // Check level up
      await this.checkLevelUp(tx, userId, profile.xp, profile.level);

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'EARN',
          amount: pigsAmount,
          description: `Mission rewards`,
          referenceId: runId
        }
      });

      // Add to pending blockchain rewards if wallet linked
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (wallet?.solanaAddress) {
        await tx.wallet.update({
          where: { userId },
          data: { pendingRewards: { increment: pigsAmount } }
        });
      }
    });
  }

  private async checkLevelUp(tx: any, userId: string, currentXp: number, currentLevel: number): Promise<void> {
    // Simple XP curve: level * 1000 XP needed
    const xpNeeded = currentLevel * 1000;
    
    if (currentXp >= xpNeeded) {
      await tx.profile.update({
        where: { userId },
        data: {
          level: { increment: 1 },
          xp: currentXp - xpNeeded
        }
      });
      
      // Could trigger notifications here
    }
  }

  async claimRewards(userId: string): Promise<{ success: boolean; signature?: string; error?: string }> {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    
    if (!wallet?.solanaAddress || wallet.pendingRewards <= 0) {
      return { success: false, error: 'No rewards to claim or wallet not linked' };
    }

    const amount = wallet.pendingRewards;
    
    // Attempt blockchain transfer
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
          
