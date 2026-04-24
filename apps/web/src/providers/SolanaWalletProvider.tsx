import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

type Props = {
  children: React.ReactNode;
};

export const SolanaWalletProvider: React.FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;

  const endpoint = useMemo(() => {
    const customEndpoint = import.meta.env.VITE_SOLANA_RPC_URL;
    return customEndpoint || clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>{children}</WalletProvider>
    </ConnectionProvider>
  );
};
