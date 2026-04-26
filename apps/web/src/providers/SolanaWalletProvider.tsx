import React from 'react';

type Props = {
  children: React.ReactNode;
};

export const SolanaWalletProvider: React.FC<Props> = ({ children }) => {
  return <>{children}</>;
};
