import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { WalletButton } from './WalletButton';
import { apiClient } from '../api/client';

type Screen = 'MENU' | 'CHAR_SELECT' | 'WEAPON_SELECT' | 'LEVEL_SELECT' | 'SHOP' | 'PROFILE' | 'PVP' | 'CLANS' | 'LEADERBOARD' | 'GAME';
interface Props { onNavigate: (screen: Screen) => void; }

const ASSET_BASE = '/assets/ui/home';

export const MenuScene: React.FC<Props> = ({ onNavigate }) => {
  const { user, logout, refreshProfile } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);

  const level = user?.profile?.level || 2;
  const xp = user?.profile?.xp || 1460;
  const currentPigs = user?.profile?.currentPigs || 8690;
  const username = user?.username || user?.firstName || 'Player';

  const xpTarget = Math.max(2500, level * 1250);
  const xpProgress = Math.max(0, Math.min(100, (xp / xpTarget) * 100));

  const handleNavigate = (screen: Screen) => {
    setShowSettings(false);
    onNavigate(screen);
  };

  return (
    <div style={{ width: '100%', height: '100dvh', background: '#030303', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      
      {/* Widened layout for Landscape display */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '1280px', height: '100%', maxHeight: '720px', overflow: 'hidden', background: '#070707', color: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }}>
        
        <img src={`${ASSET_BASE}/main-background.png`} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />

        <TopBar level={level} xp={xp} xpTarget={xpTarget} xpProgress={xpProgress} currentPigs={currentPigs} username={username} onSettings={() => setShowSettings(true)} />

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          {/* Left Column: Branding & Rewards */}
          <div style={{ position: 'absolute', top: 20, left: 20, width: 160, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 2, pointerEvents: 'none' }}>
            
            <img src={`${ASSET_BASE}/branding/war-pigs-logo.png`} alt="War Pigs" draggable={false} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />

            <div style={{ width: 120, marginTop: 15, display: 'flex', flexDirection: 'column', alignItems: 'stretch', pointerEvents: 'auto', cursor: 'pointer' }}>
              <img src={`${ASSET_BASE}/reward/reward-chest.png`} alt="Daily reward" draggable={false} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>

          <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 20 }}>
            <WalletButton />
          </div>

          <div style={{ flex: 1, minHeight: 0 }} />

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', zIndex: 2, paddingBottom: 15 }}>
            <button type="button" onClick={() => handleNavigate('LEVEL_SELECT')} style={{ width: '100%', maxWidth: 400, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'block', lineHeight: 0, margin: '0 auto 10px' }}>
              <img src={`${ASSET_BASE}/cta/play-mission-button.png`} alt="Play Mission" draggable={false} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { const t = e.target as HTMLImageElement; t.style.background = '#ff6b35'; t.style.minHeight = '60px'; t.style.borderRadius = '8px'; }} />
            </button>

            <div style={{ width: '100%', maxWidth: '900px', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 15, alignItems: 'end', margin: '0 auto' }}>
              <MenuCard src={`${ASSET_BASE}/cards/armory-card.png`} alt="Armory" onClick={() => handleNavigate('WEAPON_SELECT')} />
              <MenuCard src={`${ASSET_BASE}/cards/units-card.png`} alt="Units" onClick={() => handleNavigate('CHAR_SELECT')} />
              <MenuCard src={`${ASSET_BASE}/cards/pvp-card.png`} alt="PVP" onClick={() => handleNavigate('PVP')} />
              <MenuCard src={`${ASSET_BASE}/cards/shop-card.png`} alt="Shop" onClick={() => handleNavigate('SHOP')} />
            </div>
          </div>

          <BottomNav onHome={() => handleNavigate('MENU')} onMissions={() => handleNavigate('LEVEL_SELECT')} onClans={() => handleNavigate('CLANS')} onLeaderboard={() => handleNavigate('LEADERBOARD')} />
        </div>
      </div>

      {/* Settings & Withdrawal Modal */}
      {showSettings && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1a1111', padding: 30, borderRadius: 15, width: '90%', maxWidth: 450, border: '2px solid #ff6b35', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 24, color: '#ff6b35', textTransform: 'uppercase' }}>Settings & Wallet</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            {/* Game Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 30 }}>
              <button onClick={() => alert('Sound Toggled')} style={btnStyle}>SOUND: ON</button>
              <button onClick={() => alert('Music Toggled')} style={btnStyle}>MUSIC: ON</button>
            </div>

            {/* Withdrawal Section */}
            <div style={{ background: '#0a0a0a', padding: 20, borderRadius: 10, border: '1px solid #333', marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#ffd700', textTransform: 'uppercase' }}>Withdraw $PIGS</h4>
              <p style={{ fontSize: 12, color: '#aaa', marginBottom: 15, lineHeight: 1.4 }}>
                Convert your In-Game Pigs to real <strong>$PIGS</strong> tokens on Solana. Withdrawals are processed in batches for security and may take up to 12 hours.
              </p>
              
              <WithdrawalForm 
                currentBalance={currentPigs} 
                onClose={() => setShowSettings(false)} 
                onSuccess={() => refreshProfile()}
              />
            </div>

            <button onClick={() => { logout(); setShowSettings(false); }} style={{ ...btnStyle, background: '#d92a17', border: 'none', width: '100%' }}>LOGOUT ACCOUNT</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Withdrawal Form Subcomponent ---
const WithdrawalForm: React.FC<{ currentBalance: number; onClose: () => void; onSuccess: () => void; }> = ({ currentBalance, onClose, onSuccess }) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseInt(amount);

    if (!address || address.length < 32) return setError('Invalid Solana address.');
    if (!withdrawAmount || withdrawAmount < 1000) return setError('Minimum withdrawal is 1,000 Pigs.');
    if (withdrawAmount > currentBalance) return setError('Insufficient In-Game Pigs balance.');

    setStatus('loading');
    try {
      await apiClient.post('/api/wallet/withdraw', { address, amount: withdrawAmount });
      setStatus('success');
      setMessage('Withdrawal requested successfully! Your funds will arrive soon.');
      onSuccess(); // Refresh profile to show new balance
      setTimeout(onClose, 3000); 
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Failed to process withdrawal.');
    }
  };

  const setError = (msg: string) => {
    setStatus('error');
    setMessage(msg);
  };

  if (status === 'success') {
    return <div style={{ color: '#4caf50', fontWeight: 'bold', textAlign: 'center', padding: 20 }}>{message}</div>;
  }

  return (
    <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={{ fontSize: 11, color: '#888', fontWeight: 'bold' }}>SOLANA WALLET ADDRESS</label>
        <input 
          type="text" 
          value={address} 
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Paste your Phantom address here..."
          style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: 6, marginTop: 4, boxSizing: 'border-box' }}
        />
      </div>
      
      <div>
        <label style={{ fontSize: 11, color: '#888', fontWeight: 'bold' }}>AMOUNT TO WITHDRAW (Current: {currentBalance})</label>
        <input 
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 5000"
          min="1000"
          max={currentBalance}
          style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: 6, marginTop: 4, boxSizing: 'border-box' }}
        />
      </div>

      {status === 'error' && <div style={{ color: '#ff4d4f', fontSize: 12, fontWeight: 'bold' }}>{message}</div>}

      <button 
        type="submit" 
        disabled={status === 'loading'}
        style={{ padding: '12px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: status === 'loading' ? 'not-allowed' : 'pointer', marginTop: 5, textTransform: 'uppercase' }}
      >
        {status === 'loading' ? 'PROCESSING...' : 'REQUEST WITHDRAWAL'}
      </button>
    </form>
  );
};


// --- Subcomponents ---

const TopBar: React.FC<{ level: number; xp: number; xpTarget: number; xpProgress: number; currentPigs: number; username: string; onSettings: () => void; }> = ({ level, xp, xpTarget, xpProgress, currentPigs, username, onSettings }) => {
  return (
    <div style={{ height: 80, zIndex: 3, display: 'grid', gridTemplateColumns: '1.7fr 1.15fr 0.58fr 0.58fr', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(4px)', flexShrink: 0 }}>
      <div style={topCellStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: 12, alignItems: 'center', height: '100%', padding: '8px 20px' }}>
          <img src={`${ASSET_BASE}/topbar/player-rank-badge.png`} alt="Rank" draggable={false} style={{ width: 48, height: 48, objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#f2ede0', textTransform: 'uppercase', marginTop: 2 }}>Level {level}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <div style={{ height: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg, #ffb300 0%, #ff7e00 100%)' }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#e2e2e2', whiteSpace: 'nowrap' }}>{xp} / {xpTarget} XP</div>
            </div>
          </div>
        </div>
      </div>
      <div style={topCellStyle}>
        <div style={{ position: 'relative', height: '100%', padding: 10 }}>
          <img src={`${ASSET_BASE}/topbar/topbar-panel.png`} alt="" draggable={false} style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, width: 'calc(100% - 20px)', height: 'calc(100% - 20px)', objectFit: 'fill' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ffd14d 0%, #ffb323 55%, #8a4e00 100%)', boxShadow: '0 0 0 1px rgba(255,255,255,0.12)' }} />
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff1c9' }}>{currentPigs}</span>
            </div>
            <img src={`${ASSET_BASE}/topbar/plus-button.png`} alt="Add" draggable={false} style={{ width: 24, height: 24, objectFit: 'contain', cursor: 'pointer' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
        </div>
      </div>
      <button style={iconCellStyle} type="button">
        <img src={`${ASSET_BASE}/topbar/mail-icon.png`} alt="Mail" draggable={false} style={{ width: 28, height: 28, objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div style={badgeStyle}>2</div>
      </button>
      <button style={iconCellStyle} type="button" onClick={onSettings}>
        <img src={`${ASSET_BASE}/topbar/settings-icon.png`} alt="Settings" draggable={false} style={{ width: 28, height: 28, objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </button>
    </div>
  );
};

const MenuCard: React.FC<{ src: string; alt: string; onClick: () => void }> = ({ src, alt, onClick }) => (
  <button type="button" onClick={onClick} style={{ width: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'block', lineHeight: 0, touchAction: 'manipulation', transition: 'transform 0.1s ease-in-out' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
    <img src={src} alt={alt} draggable={false} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { const t = e.target as HTMLImageElement; t.style.background = '#333'; t.style.minHeight = '80px'; t.style.borderRadius = '8px'; }} />
  </button>
);

const BottomNav: React.FC<{ onHome: () => void; onMissions: () => void; onClans: () => void; onLeaderboard: () => void; }> = ({ onHome, onMissions, onClans, onLeaderboard }) => (
  <div style={{ width: '100%', height: 90, position: 'relative', zIndex: 4, flexShrink: 0, lineHeight: 0, marginTop: '-2px' }}>
    <img src={`${ASSET_BASE}/nav/bottom-nav-bar.png`} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.background = '#111'; }} />
    <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'center', padding: '10px 20px 0', maxWidth: 800, margin: '0 auto' }}>
      <NavItem src={`${ASSET_BASE}/nav/nav-home-active.png`} alt="Home" onClick={onHome} />
      <NavItem src={`${ASSET_BASE}/nav/nav-missions.png`} alt="Missions" onClick={onMissions} />
      <NavItem src={`${ASSET_BASE}/nav/nav-clans.png`} alt="Clans" onClick={onClans} />
      <NavItem src={`${ASSET_BASE}/nav/nav-leaderboard.png`} alt="Leaderboard" onClick={onLeaderboard} />
    </div>
  </div>
);

const NavItem: React.FC<{ src: string; alt: string; onClick: () => void }> = ({ src, alt, onClick }) => (
  <button type="button" onClick={onClick} style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
    <img src={src} alt={alt} draggable={false} style={{ width: 90, maxWidth: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
  </button>
);

const topCellStyle: React.CSSProperties = { minHeight: 80, borderRight: '1px solid rgba(255,255,255,0.08)', boxSizing: 'border-box' };
const iconCellStyle: React.CSSProperties = { minHeight: 80, border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', padding: 0 };
const badgeStyle: React.CSSProperties = { position: 'absolute', top: 15, right: 20, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: '#d92a17', color: '#fff', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)' };
const btnStyle: React.CSSProperties = { padding: '15px 20px', background: '#333', border: '2px solid #555', color: '#fff', cursor: 'pointer', borderRadius: 8, fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' };
