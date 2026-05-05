import { SolanaService } from './SolanaService';

// Validate required environment variables at module load
const RPC_URL = process.env.SOLANA_RPC_URL;
const PAYER_PUBLIC_KEY = process.env.SOLANA_PAYER_PUBLIC_KEY;

if (!RPC_URL || !PAYER_PUBLIC_KEY) {
  // In production, fail fast; in development, allow undefined for mocking
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SOLANA_RPC_URL and SOLANA_PAYER_PUBLIC_KEY environment variables are required'
    );
  }
  console.warn(
    '[Solana] Missing environment variables. Service will be unavailable in dev mode.'
  );
}

// Factory function for safe initialization
export const getSolanaService = (): SolanaService | null => {
  if (!RPC_URL || !PAYER_PUBLIC_KEY) {
    return null;
  }
  return new SolanaService(RPC_URL, PAYER_PUBLIC_KEY);
};

// Export the class for testing/mock injection
export { SolanaService };

// Default export for backward compatibility (returns null if not configured)
export default getSolanaService();
