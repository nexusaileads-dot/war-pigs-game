import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

const CURRENT_PIG_PRICE_USD = 0.0000067; 

interface BankModalProps {
  onClose: () => void;
}

export const BankModal: React.FC<BankModalProps> = ({ onClose }) => {
  const { user, connectedWalletAddress } = useGameStore();
  const [tab, setTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'HISTORY'>('DEPOSIT');
  
  const [pigAmount, setPigAmount] = useState<string>('');
  const [usdAmount, setUsdAmount] = useState<string>('');
  
  const currentPigs = user?.profile?.currentPigs || 0;

  // Mock Transaction History
  const mockHistory = [
    { id: 1, type: 'DEPOSIT', amountPigs: 50000, date: 'May 10, 2026', status: 'COMPLETED' },
    { id: 2, type: 'WITHDRAW', amountPigs: 12000, date: 'May 08, 2026', status: 'COMPLETED' },
    { id: 3, type: 'EARNED', amountPigs: 450, date: 'May 08, 2026', status: 'MISSION REWARD' },
  ];

  const handlePigChange = (val: string) => {
    setPigAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) setUsdAmount((parsed * CURRENT_PIG_PRICE_USD).toFixed(6));
    else setUsdAmount('');
  };

  const handleUsdChange = (val: string) => {
    setUsdAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) setPigAmount(Math.floor(parsed / CURRENT_PIG_PRICE_USD).toString());
    else setPigAmount('');
  };

  const setMaxWithdraw = () => handlePigChange(currentPigs.toString());

  const handleSubmit = () => {
    if (!connectedWalletAddress) {
      alert("Please connect your Solana wallet from the top bar first!");
      return;
    }
    alert(`${tab} requested for ${pigAmount} PIGS ($${usdAmount}). Pending Web3 integration.`);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div style={{ background: '#111', border: '2px solid #ff6b35', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 10px 40px rgba(255, 107, 53, 0.2)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* Header Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '2px solid #333', flexShrink: 0 }}>
          {['DEPOSIT', 'WITHDRAW', 'HISTORY'].map((t) => (
            <button 
              key={t}
              onClick={() => setTab(t as any)} 
              style={{ padding: '15px 5px', background: tab === t ? '#222' : '#0a0a0a', color: tab === t ? '#ff6b35' : '#888', border: 'none', borderBottom: tab === t ? '3px solid #ff6b35' : '3px solid transparent', fontWeight: 900, cursor: 'pointer', fontSize: 13 }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          
          {/* HISTORY TAB */}
          {tab === 'HISTORY' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h4 style={{ margin: '0 0 10px', color: '#fff' }}>Recent Transactions</h4>
              {mockHistory.map(tx => (
                <div key={tx.id} style={{ background: '#1a1a1a', padding: 12, borderRadius: 8, border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: tx.type === 'WITHDRAW' ? '#ff4d4f' : '#4caf50', fontWeight: 'bold', fontSize: 14 }}>
                      {tx.type === 'WITHDRAW' ? '-' : '+'}{tx.amountPigs.toLocaleString()} PIGS
                    </div>
                    <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>{tx.date}</div>
                  </div>
                  <div style={{ color: '#ffb300', fontSize: 10, fontWeight: 'bold', background: '#332400', padding: '4px 8px', borderRadius: 4 }}>
                    {tx.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* DEPOSIT / WITHDRAW TAB */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, fontSize: 12, color: '#aaa', fontWeight: 'bold' }}>
                <span>Exchange Rate</span>
                <span style={{ color: '#4caf50' }}>1 PIGS = ${CURRENT_PIG_PRICE_USD}</span>
              </div>

              <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 15, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>
                  <span>YOU {tab === 'DEPOSIT' ? 'RECEIVE' : 'SEND'}</span>
                  <span>Balance: {currentPigs} PIGS</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="number" value={pigAmount} onChange={(e) => handlePigChange(e.target.value)} placeholder="0.0" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, fontWeight: 900, width: '100%', outline: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#333', padding: '5px 10px', borderRadius: 8 }}>
                    <img src="/assets/sprites/pig-token.png" style={{ width: 16, height: 16 }} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/16/ffd700/000?text=$'; }} />
                    <span style={{ fontWeight: 'bold', fontSize: 14 }}>PIGS</span>
                  </div>
                </div>
                {tab === 'WITHDRAW' && (
                  <button onClick={setMaxWithdraw} style={{ background: 'transparent', border: 'none', color: '#ff6b35', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', marginTop: 8, padding: 0 }}>MAX WITHDRAWAL</button>
                )}
              </div>

              <div style={{ textAlign: 'center', color: '#555', margin: '-5px 0' }}>⇅</div>

              <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 15, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>
                  <span>YOU {tab === 'DEPOSIT' ? 'SEND' : 'RECEIVE'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#aaa', fontSize: 24, fontWeight: 900, marginRight: 5 }}>$</span>
                  <input type="number" value={usdAmount} onChange={(e) => handleUsdChange(e.target.value)} placeholder="0.00" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, fontWeight: 900, width: '100%', outline: 'none' }} />
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
            </>
          )}
          
          <button onClick={onClose} style={{ width: '100%', padding: 15, background: 'transparent', color: '#888', border: 'none', fontWeight: 'bold', marginTop: 10, cursor: 'pointer' }}>CLOSE</button>
        </div>
      </div>
    </div>
  );
};
