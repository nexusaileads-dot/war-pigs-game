import React, { useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGameStore } from '../store/gameStore';

const shortenAddress = (address: string) => {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const WalletButton: React.FC = () => {
  const { connected, publicKey, wallet, connect, disconnect, connecting, disconnecting } =
    useWallet();

  const { setConnectedWallet, clearConnectedWallet } = useGameStore();

  const address = useMemo(() => publicKey?.toBase58() || null, [publicKey]);

  useEffect(() => {
    if (connected && address) {
      setConnectedWallet(address, wallet?.adapter?.name || 'Unknown');
      return;
    }

    clearConnectedWallet();
  }, [connected, address, wallet, setConnectedWallet, clearConnectedWallet]);

  const handleClick = async () => {
    try {
      if (connected) {
        await disconnect();
        return;
      }

      await connect();
    } catch (error) {
      console.error('[WalletButton] Wallet action failed:', error);
    }
  };

  const label = connected && address
    ? shortenAddress(address)
    : connecting
      ? 'CONNECTING...'
      : disconnecting
        ? 'DISCONNECTING...'
        : 'CONNECT WALLET';

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      style={{
        padding: '10px 14px',
        borderRadius: '10px',
        border: '2px solid #7c4dff',
        background: connected ? '#2a1f46' : '#141414',
        color: '#ffffff',
        fontWeight: 800,
        fontSize: '12px',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </button>
  );
};
