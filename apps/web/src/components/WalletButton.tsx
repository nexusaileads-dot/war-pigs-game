import React, { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useGameStore } from '../store/gameStore';

export const WalletButton: React.FC = () => {
  const { connected, publicKey, wallet } = useWallet();
  const { setConnectedWallet, clearConnectedWallet } = useGameStore();

  useEffect(() => {
    if (connected && publicKey) {
      setConnectedWallet(publicKey.toBase58(), wallet?.adapter?.name || 'Unknown');
      return;
    }

    clearConnectedWallet();
  }, [connected, publicKey, wallet, setConnectedWallet, clearConnectedWallet]);

  return (
    <div style={{ display: 'inline-flex' }}>
      <WalletMultiButton
        style={{
          height: '40px',
          borderRadius: '10px',
          background: '#2a1f46',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '12px',
          letterSpacing: '0.04em',
          padding: '0 14px',
          border: '2px solid #7c4dff',
          fontFamily: 'inherit',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          cursor: 'pointer'
        }}
      />
    </div>
  );
};
