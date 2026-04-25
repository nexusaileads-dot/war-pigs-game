import React from 'react';

export const WalletButton: React.FC = () => {
  return (
    <button
      type="button"
      onClick={() => {
        alert('Wallet connect will be added after current deployment repairs are complete.');
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
        whiteSpace: 'nowrap'
      }}
    >
      CONNECT WALLET
    </button>
  );
};
