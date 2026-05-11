import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { WalletButton } from './WalletButton';
import { BankModal } from './BankModal';

type Screen = 'MENU' | 'CHAR_SELECT' | 'WEAPON_SELECT' | 'LEVEL_SELECT' | 'SHOP' | 'PROFILE' | 'PVP' | 'CLANS' | 'LEADERBOARD' | 'GAME';
interface Props { onNavigate: (screen: Screen) => void; }

const ASSET_BASE = '/assets/ui/home';

export const MenuScene: React.FC<Props> = ({ onNavigate }) => {
  const { user, logout } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showBank, setShowBank] = useState(false);

  const level = user?.profile?.level || 1;
  const xp = user?.profile?.xp || 1460;
  const currentPigs = user?.profile?.currentPigs || 3000;
  const username = user?.username || user?.firstName || 'Player';

  const xpTarget = Math.max(2500, level * 1250);
  const xpProgress = Math.max(0, Math.min(100, (xp / xpTarget) * 100));

  const handleNavigate = (screen: Screen) => {
    setShowSettings(false);
    onNavigate(screen);
  };

  const openBank = () => {
    setShowSettings(false);
    setShowBank(true);
  };

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
      
      <div style={{ position: 'relative', width: '100%', maxWidth: '1280px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Background Image */}
        <img src={`${ASSET_BASE}/main-background.png`} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />

        {/* TOP BAR: STRICTLY 14% OF SCREEN HEIGHT */}
        <div style={{ height: '14vh', minHeight: '50px', zIndex: 10 }}>
          <TopBar level={level} xp={xp} xpTarget={xpTarget} xpProgress={xpProgress} currentPigs={currentPigs} username={username} onSettings={() => setShowSettings(true)} />
        </div>

        {/* MIDDLE AREA: STRICTLY 72% OF SCREEN HEIGHT */}
        <div style={{ height: '72vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          
          {/* Logo - Pinned to top left of middle area */}
          <div style={{ position: 'absolute', top: '2vh', left: '2vw', height: '15vh', pointerEvents: 'none' }}>
            <img src={`${ASSET_BASE}/branding/war-pigs-logo.png`} alt="War Pigs" draggable={false} style={{ height: '100%', width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>

          {/* Play Mission Button - Huge (35% of middle area) */}
          <button type="button" onClick={() => handleNavigate('LEVEL_SELECT')} style={{ height: '35%', padding: 0, margin: '0 0 4vh 0', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <img src={`${ASSET_BASE}/cta/play-mission-button.png`} alt="Play Mission" draggable={false} style={{ height: '100%', width: 'auto', objectFit: 'contain' }} onError={(e) => { const t = e.target as HTMLImageElement; t.style.background = '#ff6b35'; t.style.minWidth = '200px'; t.style.borderRadius = '8px'; }} />
          </button>

          {/* Cards Row - Huge (45% of middle area) */}
          <div style={{ height: '45%', width: '90%', display: 'flex', justifyContent: 'center', gap: '2vw' }}>
            <MenuCard src={`${ASSET_BASE}/cards/armory-card.png`} alt="Armory" onClick={() => handleNavigate('WEAPON_SELECT')} />
            <MenuCard src={`${ASSET_BASE}/cards/units-card.png`} alt="Units" onClick={() => handleNavigate('CHAR_SELECT')} />
            <MenuCard src={`${ASSET_BASE}/cards/pvp-card.png`} alt="PVP" onClick={() => handleNavigate('PVP')} />
            <MenuCard src={`${ASSET_BASE}/cards/shop-card.png`} alt="Shop" onClick={() => handleNavigate('SHOP')} />
          </div>

        </div>

        {/* BOTTOM NAV: STRICTLY 14% OF SCREEN HEIGHT */}
        <div style={{ height: '14vh', minHeight: '50px', zIndex: 10 }}>
          <BottomNav onHome={() => handleNavigate('MENU')} onMissions={() => handleNavigate('LEVEL_SELECT')} onClans={() => handleNavigate('CLANS')} onLeaderboard={() => handleNavigate('LEADERBOARD')} />
        </div>

      </div>

      {showBank && <BankModal onClose={() => setShowBank(false)} />}

      {/* Settings Modal (Now holds the Bank buttons) */}
      {showSettings && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#111', padding: 30, borderRadius: 16, width: '90%', maxWidth: 350, border: '2px solid #ff6b35', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', fontSize: 22, color: '#ff6b35', textTransform: 'uppercase' }}>Settings & Bank</h3>
            
            <button onClick={openBank} style={{ ...btnStyle, background: '#4caf50', border: 'none' }}>🏦 DEPOSIT / WITHDRAW $PIGS</button>
            <hr style={{ width: '100%', borderColor: '#333', margin: '5px 0' }} />
            
            <button onClick={() => alert('Sound Toggled')} style={btnStyle}>🔊 SOUND: ON</button>
            <button onClick={() => alert('Music Toggled')} style={btnStyle}>🎵 MUSIC: ON</button>
            
            <button onClick={() => { logout(); setShowSettings(false); }} style={{ ...btnStyle, background: '#d92a17', border: 'none', marginTop: 10 }}>LOGOUT</button>
            <button onClick={() => setShowSettings(false)} style={{ ...btnStyle, background: 'transparent', color: '#888', border: '1px solid #333' }}>CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Subcomponents ---

const TopBar: React.FC<{ level: number; xp: number; xpTarget: number; xpProgress: number; currentPigs: number; username: string; onSettings: () => void; }> = ({ level, xp, xpTarget, xpProgress, currentPigs, username, onSettings }) => {
  const CURRENT_PIG_PRICE_USD = 0.0000067;
  const fiatValue = (currentPigs * CURRENT_PIG_PRICE_USD).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <div style={{ height: '100%', display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(4px)' }}>
      
      {/* Player Info */}
      <div style={{ flex: 1.5, ...topCellStyle, display: 'flex', alignItems: 'center', padding: '0 2vw', gap: '1vw' }}>
        <img src={`${ASSET_BASE}/topbar/player-rank-badge.png`} alt="Rank" draggable={false} style={{ height: '60%', width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 'clamp(11px, 1.5vw, 16px)', fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <div style={{ fontSize: 'clamp(9px, 1vw, 12px)', fontWeight: 800, color: '#f2ede0' }}>LVL {level}</div>
            <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.12)', borderRadius: 999 }}>
              <div style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg, #ffb300 0%, #ff7e00 100%)', borderRadius: 999 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Currency Explicitly Labeled */}
      <div style={{ flex: 1.2, ...topCellStyle, position: 'relative', padding: '1vh 1vw' }}>
        <img src={`${ASSET_BASE}/topbar/topbar-panel.png`} alt="" draggable={false} style={{ position: 'absolute', inset: '5%', width: '90%', height: '90%', objectFit: 'fill' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1vw' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <img src="/assets/sprites/pig-token.png" alt="" style={{ width: 'clamp(14px, 2vw, 20px)', height: 'clamp(14px, 2vw, 20px)', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <span style={{ fontSize: 'clamp(12px, 1.8vw, 16px)', fontWeight: 900, color: '#fff1c9', lineHeight: 1 }}>{currentPigs} $PIGS</span>
            </div>
            <span style={{ fontSize: 'clamp(9px, 1.2vw, 12px)', fontWeight: 800, color: '#4caf50', marginTop: 2 }}>≈ {fiatValue}</span>
          </div>
        </div>
      </div>

      {/* Wallet Button - Fixed Scaling so it doesn't look massive */}
      <div style={{ flex: 1, ...iconCellStyle }}>
        <div style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
          <WalletButton />
        </div>
      </div>

      {/* Settings (Also acts as Bank trigger now) */}
      <button style={{ flex: 0.4, ...iconCellStyle }} type="button" onClick={onSettings}>
        <img src={`${ASSET_BASE}/topbar/settings-icon.png`} alt="Settings" draggable={false} style={{ height: '40%', width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </button>
    </div>
  );
};

const MenuCard: React.FC<{ src: string; alt: string; onClick: () => void }> = ({ src, alt, onClick }) => (
  <button type="button" onClick={onClick} style={{ height: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'transform 0.1s ease-in-out' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
    <img src={src} alt={alt} draggable={false} style={{ height: '100%', width: 'auto', objectFit: 'contain' }} onError={(e) => { const t = e.target as HTMLImageElement; t.style.background = '#333'; t.style.minWidth = '80px'; t.style.borderRadius = '8px'; }} />
  </button>
);

const BottomNav: React.FC<{ onHome: () => void; onMissions: () => void; onClans: () => void; onLeaderboard: () => void; }> = ({ onHome, onMissions, onClans, onLeaderboard }) => (
  <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 4 }}>
    <img src={`${ASSET_BASE}/nav/bottom-nav-bar.png`} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.background = '#111'; }} />
    <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'center', padding: '0 20px', maxWidth: 800, margin: '0 auto' }}>
      <NavItem src={`${ASSET_BASE}/nav/nav-home-active.png`} alt="Home" onClick={onHome} />
      <NavItem src={`${ASSET_BASE}/nav/nav-missions.png`} alt="Missions" onClick={onMissions} />
      <NavItem src={`${ASSET_BASE}/nav/nav-clans.png`} alt="Clans" onClick={onClans} />
      <NavItem src={`${ASSET_BASE}/nav/nav-leaderboard.png`} alt="Leaderboard" onClick={onLeaderboard} />
    </div>
  </div>
);

const NavItem: React.FC<{ src: string; alt: string; onClick: () => void }> = ({ src, alt, onClick }) => (
  <button type="button" onClick={onClick} style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
    <img src={src} alt={alt} draggable={false} style={{ height: '70%', width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
  </button>
);

const topCellStyle: React.CSSProperties = { borderRight: '1px solid rgba(255,255,255,0.08)', boxSizing: 'border-box' };
const iconCellStyle: React.CSSProperties = { border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '0 1vw' };
const btnStyle: React.CSSProperties = { padding: '12px', background: '#333', border: '1px solid #555', color: '#fff', cursor: 'pointer', borderRadius: 8, fontWeight: 'bold', fontSize: 14 };
                                                                                       
