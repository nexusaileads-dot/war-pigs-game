import React, { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useGameStore } from '../store/gameStore';
import { apiClient } from '../api/client';

export const WalletButton: React.FC = () => {
  const { publicKey, wallet } = useWallet();
  const { setConnectedWallet, user } = useGameStore();

  useEffect(() => {
    if (publicKey) {
      const address = publicKey.toBase58();
      const provider = wallet?.adapter.name || 'Unknown';
      
      // Update global Zustand store
      setConnectedWallet(address, provider);
      
      // Link the wallet to the user's account in the database
      if (user && user.wallet?.solanaAddress !== address) {
        apiClient.post('/api/auth/link-wallet', { address })
          .then(() => console.log('[Wallet] Linked to database successfully.'))
          .catch(err => console.error('[Wallet] Failed to link wallet:', err));
      }
    } else {
      setConnectedWallet(null, null);
    }
  }, [publicKey, wallet, setConnectedWallet, user]);

  return (
    <div style={{ position: 'relative', zIndex: 9999 }}>
      <WalletMultiButton 
        style={{ 
          background: '#ff6b35', 
          height: '40px', 
          padding: '0 16px', 
          borderRadius: '8px', 
          fontWeight: 900, 
          fontFamily: 'monospace',
          border: '2px solid #555',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
          textTransform: 'uppercase'
        }} 
      />
    </div>
  );
};
