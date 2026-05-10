import { Connection, PublicKey } from '@solana/web3.js';
// Make sure to import this at the top of your wallet.ts file

// Setup the Solana connection (Use devnet for testing, mainnet-beta for production)
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
const TREASURY_WALLET = process.env.TREASURY_WALLET || 'YOUR_PHANTOM_WALLET_ADDRESS';
const PIGS_MINT = '7cfmBSy6JEEh1Z9neHXGngpLQqZGRXZBf7aKu99Ppump';

// --- ADD THIS INSIDE YOUR walletRoutes FUNCTION ---

  fastify.post('/deposit', { preHandler: authenticate }, async (request, reply) => {
    const { signature, amount } = request.body as { signature: string; amount: number };
    const userId = request.user.userId;

    if (!signature || !amount) {
      return reply.status(400).send({ error: 'Signature and amount are required.' });
    }

    try {
      // 1. Fetch the transaction from the blockchain
      const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
      
      if (!tx || !tx.meta) {
        return reply.status(400).send({ error: 'Transaction not found on chain.' });
      }

      if (tx.meta.err) {
        return reply.status(400).send({ error: 'Transaction failed on chain.' });
      }

      // 2. Prevent Signature Replay Attacks
      // (Check if this signature is already saved in your database. You will need a `ProcessedTransaction` table eventually to store used signatures so hackers can't submit the same receipt twice).

      // 3. Verify it was an SPL token transfer to YOUR treasury
      let isValidTransfer = false;
      
      // Look through the instructions to find the SPL token transfer
      for (const ix of tx.transaction.message.instructions) {
        if ('parsed' in ix && ix.program === 'spl-token') {
          const info = ix.parsed.info;
          
          // Note: The destination here is the Treasury's Associated Token Account (ATA), not the raw Treasury Wallet address. 
          // For absolute bulletproof security, you should verify the destination ATA matches your treasury's ATA for $PIGS.
          if (info.mint === PIGS_MINT) {
            // Verify the amount matches (assuming 6 decimals)
            const tokenAmount = info.tokenAmount.uiAmount;
            if (tokenAmount >= amount) {
              isValidTransfer = true;
              break;
            }
          }
        }
      }

      if (!isValidTransfer) {
        return reply.status(400).send({ error: 'Invalid transaction. Did not detect a valid $PIGS transfer to the treasury.' });
      }

      // 4. Give them their In-Game Pigs!
      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
          currentPigs: { increment: amount },
          totalPigsEarned: { increment: amount }
        }
      });

      return { success: true, newBalance: updatedProfile.currentPigs };

    } catch (err: any) {
      fastify.log.error({ err }, 'Deposit verification failed');
      return reply.status(500).send({ error: 'Failed to verify deposit.' });
    }
  });
