import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useGameStore } from '../store/gameStore';

interface BankModalProps {
  onClose: () => void;
  currentCryptoPigs: number;
}

export const BankModal: React.FC<BankModalProps> = ({ onClose, currentCryptoPigs }) => {
  const { connectedWalletAddress } = useGameStore();
  const [tab, setTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'HISTORY'>('DEPOSIT');
  
  const [pigAmount, setPigAmount] = useState<string>('');
  const [usdAmount, setUsdAmount] = useState<string>('');
  
  // Live Market Price Fetching State
  const [livePigPrice, setLivePigPrice] = useState<number>(0.0000067);
  const [isFetchingPrice, setIsFetchingPrice] = useState(true);

  // Fetch Live Market Data (Jupiter API) using your exact CA
  useEffect(() => {
    const fetchLivePrice = async () => {
      try {
        const CA = '7cfmBSy6JEEh1Z9neHXGngpLQqZGRXZBf7aKu99Ppump';
        const res = await axios.get(`https://api.jup.ag/price/v2?ids=${CA}`);
        
        // Jupiter returns the price as a string, we parse it to a float
        const tokenData = res.data.data[CA];
        if (tokenData && tokenData.price) {
          setLivePigPrice(parseFloat(tokenData.price));
        }
      } catch (error) {
        console.error("Failed to fetch live price, using fallback.", error);
      } finally {
        setIsFetchingPrice(false);
      }
    };

    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 30000); // Update price every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handlePigChange = (val: string) => {
    setPigAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) setUsdAmount((parsed * livePigPrice).toFixed(6));
    else setUsdAmount('');
  };

  const handleUsdChange = (val: string) => {
    setUsdAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) setPigAmount(Math.floor(parsed / livePigPrice).toString());
    else setPigAmount('');
  };

  const setMaxWithdraw = () => handlePigChange(currentCryptoPigs.toString());

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
              key={t} onClick={() => setTab(t as any)} 
              style={{ padding: '15px 5px', background: tab === t ? '#222' : '#0a0a0a', color: tab === t ? '#ff6b35' : '#888', border: 'none', borderBottom: tab === t ? '3px solid #ff6b35' : '3px solid transparent', fontWeight: 900, cursor: 'pointer', fontSize: 13 }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {tab === 'HISTORY' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#888', textAlign: 'center', padding: '40px 0' }}>
              No transactions found.
            </div>
          ) : (
            <>
              {/* Exchange Rate Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, fontSize: 12, color: '#aaa', fontWeight: 'bold' }}>
                <span>Live Exchange Rate</span>
                <span style={{ color: '#4caf50' }}>
                  {isFetchingPrice ? 'Fetching...' : `1 PIGS = $${livePigPrice.toFixed(8)}`}
                </span>
              </div>

              {/* PIGS Input Area */}
              <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 15, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>
                  <span>YOU {tab === 'DEPOSIT' ? 'RECEIVE' : 'SEND'}</span>
                  <span>Balance: {currentCryptoPigs} PIGS</span>
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
                    <span style={{ fontWeight: 'bold', fontSize: 14 }}>$PIGS</span>
                  </div>
                </div>
                {tab === 'WITHDRAW' && (
                  <button onClick={setMaxWithdraw} style={{ background: 'transparent', border: 'none', color: '#ff6b35', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', marginTop: 8, padding: 0 }}>MAX WITHDRAWAL</button>
                )}
              </div>

              <div style={{ textAlign: 'center', color: '#555', margin: '-5px 0' }}>⇅</div>

              {/* USDC Input Area */}
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

              {/* Submit Button */}
              <button 
                onClick={handleSubmit}
                disabled={!pigAmount || parseFloat(pigAmount) <= 0 || (tab === 'WITHDRAW' && parseFloat(pigAmount) > currentCryptoPigs)}
                style={{ 
                  width: '100%', 
                  padding: 15, 
                  background: (!pigAmount || parseFloat(pigAmount) <= 0 || (tab === 'WITHDRAW' && parseFloat(pigAmount) > currentCryptoPigs)) ? '#444' : '#ff6b35', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  fontWeight: 900, 
                  fontSize: 16, 
                  cursor: 'pointer', 
                  letterSpacing: '1px' 
                }}
              >
                {tab === 'WITHDRAW' && parseFloat(pigAmount) > currentCryptoPigs ? 'INSUFFICIENT BALANCE' : `CONFIRM ${tab}`}
              </button>
            </>
          )}
          
          <button onClick={onClose} style={{ width: '100%', padding: 15, background: 'transparent', color: '#888', border: 'none', fontWeight: 'bold', marginTop: 10, cursor: 'pointer' }}>CLOSE</button>
        </div>
      </div>
    </div>
  );
};
