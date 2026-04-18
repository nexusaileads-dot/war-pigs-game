import bs58 from 'bs58';
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount, 
  createTransferInstruction,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { 
  SolanaServiceInterface, 
  WalletInfo, 
  RewardDistribution, 
  TransactionResult 
} from './types';

/**
 * Production Solana integration.
 * Requires SOLANA_PRIVATE_KEY (base58) and TOKEN_MINT_ADDRESS env vars.
 */
export class SolanaService implements SolanaServiceInterface {
  private connection: Connection;
  private mintPublicKey: PublicKey;
  private senderKeypair: Keypair | null = null;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    const mintAddress = process.env.TOKEN_MINT_ADDRESS;
    if (!mintAddress) {
      console.warn('TOKEN_MINT_ADDRESS not set. Solana features disabled.');
      this.mintPublicKey = new PublicKey('11111111111111111111111111111111');
    } else {
      this.mintPublicKey = new PublicKey(mintAddress);
    }

    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    if (privateKey) {
      try {
        const decoded = bs58.decode(privateKey);
        this.senderKeypair = Keypair.fromSecretKey(decoded);
      } catch (e) {
        console.error('Failed to decode SOLANA_PRIVATE_KEY');
      }
    }
  }

  async createWallet(): Promise<WalletInfo> {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    
    // Request airdrop for devnet
    if (process.env.NODE_ENV === 'development') {
      try {
        await this.connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);
      } catch (e) {
        console.log('Airdrop failed, continuing...');
      }
    }

    return {
      address,
      balance: 0,
    };
  }

  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.senderKeypair!,
        this.mintPublicKey,
        publicKey
      );
      
      const balance = await this.connection.getTokenAccountBalance(tokenAccount.address);
      return parseInt(balance.value.amount);
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }

  async distributeRewards(distribution: RewardDistribution): Promise<TransactionResult> {
    if (!this.senderKeypair) {
      return {
        success: false,
        error: 'Sender wallet not configured',
      };
    }

    try {
      const recipientPublicKey = new PublicKey(distribution.recipientAddress);
      
      // Get or create token accounts
      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.senderKeypair,
        this.mintPublicKey,
        this.senderKeypair.publicKey
      );

      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.senderKeypair,
        this.mintPublicKey,
        recipientPublicKey
      );

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        senderTokenAccount.address,
        recipientTokenAccount.address,
        this.senderKeypair.publicKey,
        distribution.amount,
        [],
        TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction().add(transferInstruction);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.senderKeypair],
        {
          commitment: 'confirmed',
        }
      );

      return {
        success: true,
        signature,
        confirmationTime: Date.now(),
      };
    } catch (error: any) {
      console.error('Reward distribution failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  validateAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}