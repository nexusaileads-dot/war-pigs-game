import { prisma, Prisma } from '@war-pigs/database';
import { getSolanaService } from '@war-pigs/solana';

// Configurable economy constants (move to env or game config in production)
const XP_PER_LEVEL_BASE = 1000;
const MAX_REWARD_AMOUNT = 1_000_000; // Prevent overflow exploits

export class EconomyService {
  private solana = getSolanaService();

  async grantRewards(
    userId: string,
    pigsAmount: number,
    xpAmount: number,
    runId: string
  ): Promise<void> {
    // Validate inputs
    if (!Number.isInteger(pigsAmount) || pigsAmount <= 0 || pigsAmount > MAX_REWARD_AMOUNT) {
      throw new Error('Invalid pigsAmount');
    }
    if (!Number.isInteger(xpAmount) || xpAmount < 0 || xpAmount > MAX_REWARD_AMOUNT) {
      throw new Error('Invalid xpAmount');
    }

    try {
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
            amount: pigsAmount, // Positive for EARN
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
    } catch (err) {
      console.error('[EconomyService] grantRewards failed', { userId, runId, error: err });
      throw err; // Re-throw for global handler
    }
  }

  private async checkLevelUp(
    tx: Prisma.TransactionClient,
    userId: string,
    currentXp: number,
    currentLevel: number
  ): Promise<void> {
    // Defensive: ensure XP is non-negative
    let xp = Math.max(0, currentXp);
    let level = currentLevel;

    // Level-up formula: cumulative XP threshold = sum(1..n) * XP_PER_LEVEL_BASE
    // Simplified: while xp >= level * XP_PER_LEVEL_BASE, level up
    while (xp >= level * XP_PER_LEVEL_BASE) {
      xp -= level * XP_PER_LEVEL_BASE;
      level += 1;
      // Safety break to prevent infinite loops from corrupted data
      if (level > 1000) {
        console.error('[EconomyService] Level-up loop exceeded safety limit', { userId, xp, level });
        break;
      }
    }

    // Only update if state changed
    if (level !== currentLevel || xp !== currentXp) {
      await tx.profile.update({
        where: { userId },
        data: { level, xp }
      });
    }
  }

  async claimRewards(
    userId: string
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
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
      // Deterministic idempotency key: hash of userId + pending amount + wallet address
      const idempotencyKey = `claim_${userId}_${amount}_${wallet.solanaAddress}`;

      // Two-phase commit: create pending claim record BEFORE blockchain call
      const claimRecord = await prisma.transaction.create({
        data: {
          userId,
          type: 'CLAIM',
          amount: amount, // Positive amount; type indicates direction
          description: 'Claim to Solana wallet',
          referenceId: idempotencyKey,
          // Add a status field if schema supports it; otherwise use txHash as marker
          txHash: 'PENDING' // Marker for in-progress claims
        }
      });

      const result = await this.solana.distributeRewards({
        recipientAddress: wallet.solanaAddress,
        amount,
        referenceId: idempotencyKey
      });

      if (result.success && result.signature) {
        // Finalize claim: update wallet and mark transaction complete
        await prisma.$transaction([
          prisma.wallet.update({
            where: { userId },
            data: {
              pendingRewards: 0,
              claimedRewards: { increment: amount },
              lastClaimAt: new Date()
            }
          }),
          prisma.transaction.update({
            where: { id: claimRecord.id },
            data: {
              txHash: result.signature,
              description: 'Claimed to Solana wallet' // Finalize description
            }
          })
        ]);
        return { success: true, signature: result.signature };
      } else {
        // Mark claim as failed in DB
        await prisma.transaction.update({
          where: { id: claimRecord.id },
          data: {
            txHash: 'FAILED',
            description: `Claim failed: ${result.error || 'Unknown error'}`
          }
        });
        return { success: false, error: result.error || 'Blockchain distribution failed' };
      }
    } catch (err) {
      console.error('[EconomyService] claimRewards failed', { userId, error: err });
      return { success: false, error: 'Claim processing failed' };
    }
  }
}
