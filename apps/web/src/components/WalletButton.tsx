import React from 'react';
import { useGameNotice } from './GameNoticeProvider';

export const WalletButton: React.FC = () => {
  const { showNotice } = useGameNotice();

  return (
    <button
      type="button"
      onClick={() => {
        showNotice({
          title: 'Wallet Connect',
          message:
            'Wallet connection is temporarily disabled while gameplay repairs are being deployed.',
          variant: 'info'
        });
      }}
      style={{
        padding: '10px 14px',
        borderRadius: '10px',
        border: '2px solid #7c4dff',
        background: '#141414',
        color: '#ffffff',
        fontWeight: 800,
        fontSize: '12px',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        boxShadow: '0 0 14px rgba(124, 77, 255, 0.35)'
      }}
    >
      CONNECT WALLET
    </button>
  );
};
