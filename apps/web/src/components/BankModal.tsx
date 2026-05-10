import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

// We will hardcode this for the MVP, but later you will fetch this from your Fastify backend!
const CURRENT_PIG_PRICE_USD = 0.0000067; 

interface BankModalProps {
  onClose: () => void;
}

export const BankModal: React.FC<BankModalProps> = ({ onClose }) => {
  const { user, connectedWalletAddress } = useGameStore();
  const [tab, setTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  
  const [pigAmount, setPigAmount] = useState<string>('');
  const [usdAmount, setUsdAmount] = useState<string>('');
  
  const currentPigs = user?.profile?.currentPigs || 0;

  // Auto-converter logic
  const handlePigChange = (val: string) => {
    setPigAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setUsdAmount((parsed * CURRENT_PIG_PRICE_USD).toFixed(6));
    } else {
      setUsdAmount('');
    }
  };

  const handleUsdChange = (val: string) => {
    setUsdAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setPigAmount(Math.floor(parsed / CURRENT_PIG_PRICE_USD).toString());
    } else {
      setPigAmount('');
    }
  };

  const setMaxWithdraw = () => {
    handlePigChange(currentPigs.toString());
  };

  const handleSubmit = () => {
    if (!connectedWalletAddress) {
      alert("Please connect your Solana wallet first!");
      return;
    }
    // TODO: Wire this up to your Solana Smart Contract or Backend API later!
    alert(`${tab} requested for ${pigAmount} PIGS ($${usdAmount}). Transaction sent to Solana!`);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div style={{ background: '#111', border: '2px solid #ff6b35', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 10px 40px rgba(255, 107, 53, 0.2)' }}>
        
        {/* Header Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid #333' }}>
          <button 
            onClick={() => setTab('DEPOSIT')} 
            style={{ padding: 15, background: tab === 'DEPOSIT' ? '#222' : '#0a0a0a', color: tab === 'DEPOSIT' ? '#ff6b35' : '#888', border: 'none', borderBottom: tab === 'DEPOSIT' ? '3px solid #ff6b35' : '3px solid transparent', fontWeight: 900, cursor: 'pointer' }}
          >
            DEPOSIT
          </button>
          <button 
            onClick={() => setTab('WITHDRAW')} 
            style={{ padding: 15, background: tab === 'WITHDRAW' ? '#222' : '#0a0a0a', color: tab === 'WITHDRAW' ? '#ff6b35' : '#888', border: 'none', borderBottom: tab === 'WITHDRAW' ? '3px solid #ff6b35' : '3px solid transparent', fontWeight: 900, cursor: 'pointer' }}
          >
            WITHDRAW
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12, color: '#aaa', fontWeight: 'bold' }}>
            <span>Current Exchange Rate</span>
            <span>1 PIGS = ${CURRENT_PIG_PRICE_USD}</span>
          </div>

          {/* Converter UI */}
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 15, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>
              <span>YOU {tab === 'DEPOSIT' ? 'RECEIVE' : 'SEND'}</span>
              <span>Balance: {currentPigs} PIGS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="number" 
                value={pigAmount} 
                onChange={(e) => handlePigChange(e.target.value)} 
                placeholder="0.0"
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, fontWeight: 900, width: '100%', outline: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#333', padding: '5px 10px', borderRadius: 8 }}>
                <img src="/assets/sprites/pig-token.png" style={{ width: 16, height: 16 }} alt="" />
                <span style={{ fontWeight: 'bold', fontSize: 14 }}>PIGS</span>
              </div>
            </div>
            {tab === 'WITHDRAW' && (
              <button onClick={setMaxWithdraw} style={{ background: 'transparent', border: 'none', color: '#ff6b35', fontSize: 10, fontWeight: 'bold', cursor: 'pointer', marginTop: 5, padding: 0 }}>MAX</button>
            )}
          </div>

          <div style={{ textAlign: 'center', color: '#555', margin: '-5px 0' }}>⇅</div>

          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 15, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>
              <span>YOU {tab === 'DEPOSIT' ? 'SEND' : 'RECEIVE'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#aaa', fontSize: 24, fontWeight: 900, marginRight: 5 }}>$</span>
              <input 
                type="number" 
                value={usdAmount} 
                onChange={(e) => handleUsdChange(e.target.value)} 
                placeholder="0.00"
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, fontWeight: 900, width: '100%', outline: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#273e5e', padding: '5px 10px', borderRadius: 8 }}>
                <span style={{ fontWeight: 'bold', fontSize: 14, color: '#68a1f8' }}>USDC</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={!pigAmount || parseFloat(pigAmount) <= 0 || (tab === 'WITHDRAW' && parseFloat(pigAmount) > currentPigs)}
            style={{ width: '100%', padding: 15, background: (!pigAmount || parseFloat(pigAmount) <= 0 || (tab === 'WITHDRAW' && parseFloat(pigAmount) > currentPigs)) ? '#444' : '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 16, cursor: 'pointer', letterSpacing: '1px' }}
          >
            {tab === 'WITHDRAW' && parseFloat(pigAmount) > currentPigs ? 'INSUFFICIENT BALANCE' : `CONFIRM ${tab}`}
          </button>
          
          <button onClick={onClose} style={{ width: '100%', padding: 15, background: 'transparent', color: '#888', border: 'none', fontWeight: 'bold', marginTop: 10, cursor: 'pointer' }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
};
