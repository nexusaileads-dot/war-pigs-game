export interface WalletInfo {
  address: string;
  balance: number;
}

export interface RewardDistribution {
  recipientAddress: string;
  amount: number;
  referenceId: string;
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  confirmationTime?: number;
}

export interface SolanaServiceInterface {
  createWallet(): Promise<WalletInfo>;
  getBalance(address: string): Promise<number>;
  distributeRewards(distribution: RewardDistribution): Promise<TransactionResult>;
  validateAddress(address: string): boolean;
}
