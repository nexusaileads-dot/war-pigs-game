import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface DistributeRewardsParams {
  recipientAddress: string;
  amount: number;
  referenceId: string;
}

export class SolanaService {
  private connection: Connection;
  private payer: PublicKey;

  constructor(rpcUrl: string, payerPublicKey: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.payer = new PublicKey(payerPublicKey);
  }

  async distributeRewards(params: DistributeRewardsParams): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const recipient = new PublicKey(params.recipientAddress);
      
      // Get or create associated token account for recipient
      const recipientATA = await getAssociatedTokenAddress(
        new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC mint
        recipient
      );

      const transaction = new Transaction().add(
        createTransferInstruction(
          // source ATA would go here in real implementation
          recipientATA,
          recipientATA,
          this.payer,
          params.amount * 1_000_000, // USDC has 6 decimals
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // In production: sign with payer keypair and send
      // const signature = await sendAndConfirmTransaction(this.connection, transaction, [payerKeypair]);
      
      return {
        success: true,
        signature: 'mock_signature_for_dev' // Replace with real signature in prod
      };
    } catch (error) {
      console.error('[SolanaService] Reward distribution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
