import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { WalletButton } from './WalletButton';

type Screen = 'MENU' | 'CHAR_SELECT' | 'WEAPON_SELECT' | 'LEVEL_SELECT' | 'SHOP' | 'PROFILE' | 'PVP' | 'CLANS' | 'LEADERBOARD' | 'GAME';
interface Props { onNavigate: (screen: Screen) => void; }

const ASSET_BASE = '/assets/ui/home';

export const MenuScene: React.FC<Props> = ({ onNavigate }) => {
  const { user, logout, connectedWalletAddress } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showBank, setShowBank] = useState(false);
  
  // Bank Form State
  const [bankMode, setBankMode] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [amount, setAmount] = useState('');

  const level = user?.profile?.level || 1;
  const xp = user?.profile?.xp || 0;
  const currentPigs = user?.profile?.currentPigs || 0;
  // Fallback for on-chain balance display (we will sync this with the actual Solana RPC later)
  const cryptoPigs = user?.wallet?.claimedRewards || 0; 
  const username = user?.username || user?.firstName || 'Player';

  const xpTarget = Math.max(2500, level * 1250);
  const xpProgress = Math.max(0, Math.min(100, (xp / xpTarget) * 100));

  const handleNavigate = (screen: Screen) => {
    setShowSettings(false);
    setShowBank(false);
    onNavigate(screen);
  };

  const handleBankAction = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return alert('Enter a valid amount.');
    // Placeholder for actual Web3 transaction logic
    alert(`Initiating ${bankMode} of ${amount} $PIGS via Solana. Awaiting Smart Contract approval...`);
    setAmount('');
  };

  return (
    <div style={{ width: '100%', height: '100dvh', background: '#030303', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '1280px', height: '100%', maxHeight: '720px', overflow: 'hidden', background: '#070707', color: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }}>
        
        <img src={`${ASSET_BASE}/main-background.png`} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />

        <TopBar 
          level={level} xp={xp} xpTarget={xpTarget} xpProgress={xpProgress} 
          currentPigs={currentPigs} cryptoPigs={cryptoPigs} username={username} 
          onSettings={() => setShowSettings(true)} 
          onOpenBank={() => setShowBank(true)} 
        />

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          {/* Left Column: Branding & Rewards */}
          <div style={{ position: 'absolute', top: 15, left: '2%', width: 'clamp(100px, 15vw, 160px)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 2, pointerEvents: 'none' }}>
            <img src={`${ASSET_BASE}/branding/war-pigs-logo.png`} alt="War Pigs" draggable={false} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <div style={{ width: '80%', marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'stretch', pointerEvents: 'auto', cursor: 'pointer' }}>
              <img src={`${ASSET_BASE}/reward/reward-chest.png`} alt="Daily reward" draggable={false} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>

          {/* Wallet Button */}
          <div style={{ position: 'absolute', top: 15, right: '2%', zIndex: 20 }}>
            <WalletButton />
          </div>

          <div style={{ flex: 1, minHeight: 0 }} />

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2vh', position: 'relative', zIndex: 2, paddingBottom: 15 }}>
            <button type="button" onClick={() => handleNavigate('LEVEL_SELECT')} style={{ width: '100%', maxWidth: 'clamp(250px, 40vw, 400px)', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'block', lineHeight: 0, margin: '0 auto' }}>
              <img src={`${ASSET_BASE}/cta/play-mission-button.png`} alt="Play Mission" draggable={false} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { const t = e.target as HTMLImageElement; t.style.background = '#ff6b35'; t.style.minHeight = '60px'; t.style.borderRadius = '8px'; }} />
            </button>

            <div style={{ width: '100%', maxWidth: '900px', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '2vw', alignItems: 'end', margin: '0 auto' }}>
              <MenuCard src={`${ASSET_BASE}/cards/armory-card.png`} alt="Armory" onClick={() => handleNavigate('WEAPON_SELECT')} />
              <MenuCard src={`${ASSET_BASE}/cards/units-card.png`} alt="Units" onClick={() => handleNavigate('CHAR_SELECT')} />
              <MenuCard src={`${ASSET_BASE}/cards/pvp-card.png`} alt="PVP" onClick={() => handleNavigate('PVP')} />
              <MenuCard src={`${ASSET_BASE}/cards/shop-card.png`} alt="Shop" onClick={() => handleNavigate('SHOP')} />
            </div>
          </div>

          <BottomNav onHome={() => handleNavigate('MENU')} onMissions={() => handleNavigate('LEVEL_SELECT')} onClans={() => handleNavigate('CLANS')} onLeaderboard={() => handleNavigate('LEADERBOARD')} />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#222', padding: 30, borderRadius: 15, width: '80%', maxWidth: 400, border: '2px solid #ff6b35' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', fontSize: 24, color: '#ff6b35', textTransform: 'uppercase' }}>Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 20 }}>
              <button onClick={() => alert('Sound Toggled')} style={btnStyle}>SOUND: ON</button>
              <button onClick={() => alert('Music Toggled')} style={btnStyle}>MUSIC: ON</button>
              <button onClick={() => { logout(); setShowSettings(false); }} style={{ ...btnStyle, background: '#d92a17', border: 'none' }}>LOGOUT</button>
              <button onClick={() => setShowSettings(false)} style={{ ...btnStyle, background: '#444', border: 'none' }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Modal (Deposit / Withdraw) */}
      {showBank && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#141414', padding: 30, borderRadius: 15, width: '90%', maxWidth: 450, border: '2px solid #ffb300', boxShadow: '0 0 30px rgba(255, 179, 0, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 24, color: '#ffb300', textTransform: 'uppercase' }}>TREASURY</h3>
              <button onClick={() => setShowBank(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✖</button>
            </div>

            {!connectedWalletAddress ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#aaa' }}>
                <p>You must connect a Solana wallet to Deposit or Withdraw $PIGS.</p>
                <p style={{ fontSize: 12, color: '#ff6b35' }}>Use the SELECT WALLET button in the top right.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <button onClick={() => setBankMode('DEPOSIT')} style={{ flex: 1, padding: 12, background: bankMode === 'DEPOSIT' ? '#ff6b35' : '#333', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: 8, cursor: 'pointer' }}>DEPOSIT (To Game)</button>
                  <button onClick={() => setBankMode('WITHDRAW')} style={{ flex: 1, padding: 12, background: bankMode === 'WITHDRAW' ? '#ff6b35' : '#333', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: 8, cursor: 'pointer' }}>WITHDRAW (To Wallet)</button>
                </div>

                <div style={{ background: '#000', padding: 15, borderRadius: 8, marginBottom: 20, border: '1px solid #333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 5 }}>
                    <span>{bankMode === 'DEPOSIT' ? 'Wallet Balance' : 'Game Balance'}</span>
                    <span>{bankMode === 'DEPOSIT' ? `$PIGS ${cryptoPigs}` : `PIGS ${currentPigs}`}</span>
                  </div>
                  <input 
                    type="number" 
                    placeholder="Enter Amount..." 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: 24, outline: 'none' }}
                  />
                </div>

                <button onClick={handleBankAction} style={{ width: '100%', padding: 15, background: '#4caf50', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: 16, borderRadius: 8, cursor: 'pointer' }}>
                  CONFIRM {bankMode}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- TopBar with Dual Currency Support ---
const TopBar: React.FC<{ level: number; xp: number; xpTarget: number; xpProgress: number; currentPigs: number; cryptoPigs: number; username: string; onSettings: () => void; onOpenBank: () => void; }> = ({ level, xp, xpTarget, xpProgress, currentPigs, cryptoPigs, username, onSettings, onOpenBank }) => {
  return (
    <div style={{ height: 'clamp(60px, 10vh, 80px)', zIndex: 3, display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 0.5fr 0.5fr', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(4px)', flexShrink: 0 }}>
      
      {/* Player Stats */}
      <div style={topCellStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'clamp(30px, 5vw, 50px) 1fr', gap: '1vw', alignItems: 'center', height: '100%', padding: '0 2vw' }}>
          <img src={`${ASSET_BASE}/topbar/player-rank-badge.png`} alt="Rank" draggable={false} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 'clamp(10px, 1.5vw, 14px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username}</div>
            <div style={{ fontSize: 'clamp(8px, 1vw, 11px)', fontWeight: 800, color: '#f2ede0', textTransform: 'uppercase', marginTop: 2 }}>Level {level}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 5, alignItems: 'center', marginTop: 4 }}>
              <div style={{ height: 'clamp(6px, 1vh, 10px)', background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg, #ffb300 0%, #ff7e00 100%)' }} />
              </div>
              <div style={{ fontSize: 'clamp(7px, 1vw, 10px)', fontWeight: 800, color: '#e2e2e2', whiteSpace: 'nowrap' }}>{xp}/{xpTarget}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Currency Panel */}
      <div style={topCellStyle}>
        <div style={{ position: 'relative', height: '100%', padding: '1vh 1vw' }}>
          <img src={`${ASSET_BASE}/topbar/topbar-panel.png`} alt="" draggable={false} style={{ position: 'absolute', top: '10%', left: '5%', right: '5%', bottom: '10%', width: '90%', height: '80%', objectFit: 'fill' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5%' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Game Pigs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 'clamp(14px, 2vw, 18px)', height: 'clamp(14px, 2vw, 18px)', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ffd14d 0%, #ffb323 55%, #8a4e00 100%)', boxShadow: '0 0 0 1px rgba(255,255,255,0.12)' }} />
                <span style={{ fontSize: 'clamp(11px, 1.5vw, 14px)', fontWeight: 900, color: '#fff1c9' }}>{currentPigs}</span>
              </div>
              {/* $PIGS Token (On-Chain) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 'clamp(14px, 2vw, 18px)', height: 'clamp(14px, 2vw, 18px)', borderRadius: '50%', background: '#111', border: '1px solid #ff6b35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 'bold', color: '#ff6b35' }}>$</div>
                <span style={{ fontSize: 'clamp(11px, 1.5vw, 14px)', fontWeight: 900, color: '#ff6b35' }}>{cryptoPigs}</span>
              </div>
            </div>

            <img onClick={onOpenBank} src={`${ASSET_BASE}/topbar/plus-button.png`} alt="Bank" draggable={false} style={{ width: 'clamp(20px, 3vw, 28px)', height: 'clamp(20px, 3vw, 28px)', objectFit: 'contain', cursor: 'pointer' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
        </div>
      </div>

      <button style={iconCellStyle} type="button">
        <img src={`${ASSET_BASE}/topbar/mail-icon.png`} alt="Mail" draggable={false} style={{ width: 'clamp(18px, 3vw, 28px)', height: 'clamp(18px, 3vw, 28px)', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div style={badgeStyle}>2</div>
      </button>
      <button style={iconCellStyle} type="button" onClick={onSettings}>
        <img src={`${ASSET_BASE}/topbar/settings-icon.png`} alt="Settings" draggable={false} style={{ width: 'clamp(18px, 3vw, 28px)', height: 'clamp(18px, 3vw, 28px)', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
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
  <div style={{ width: '100%', height: 'clamp(60px, 12vh, 90px)', position: 'relative', zIndex: 4, flexShrink: 0, lineHeight: 0, marginTop: '-2px' }}>
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
    <img src={src} alt={alt} draggable={false} style={{ width: '100%', maxWidth: '90px', height: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
  </button>
);

const topCellStyle: React.CSSProperties = { height: '100%', borderRight: '1px solid rgba(255,255,255,0.08)', boxSizing: 'border-box' };
const iconCellStyle: React.CSSProperties = { height: '100%', border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', padding: 0 };
const badgeStyle: React.CSSProperties = { position: 'absolute', top: '10%', right: '15%', minWidth: 'clamp(12px, 2vw, 20px)', height: 'clamp(12px, 2vw, 20px)', padding: '0 4px', borderRadius: 999, background: '#d92a17', color: '#fff', fontSize: 'clamp(8px, 1.2vw, 11px)', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)' };
const btnStyle: React.CSSProperties = { padding: '15px 20px', background: '#333', border: '2px solid #555', color: '#fff', cursor: 'pointer', borderRadius: 8, fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' };
