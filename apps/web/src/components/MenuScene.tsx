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
      
      <div style={{ position: 'relative', width: '100%', maxWidth: '1280px', height: '100%', maxHeight: '720px', overflow: 'hidden', background: '#070707', color: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }}>
        
        {/* Background Image */}
        <img src={`${ASSET_BASE}/main-background.png`} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />

        {/* Top Navigation Bar */}
        <TopBar level={level} xp={xp} xpTarget={xpTarget} xpProgress={xpProgress} currentPigs={currentPigs} username={username} onSettings={() => setShowSettings(true)} onBank={() => setShowBank(true)} />

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          
          {/* Top Left Branding */}
          <div style={{ position: 'absolute', top: '2vh', left: '2vw', height: '15vh', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 2, pointerEvents: 'none' }}>
            <img src={`${ASSET_BASE}/branding/war-pigs-logo.png`} alt="War Pigs" draggable={false} style={{ height: '100%', width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>

          {/* Central Play Area - Scales dynamically to fit the screen */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3vh', position: 'relative', zIndex: 2, padding: '2vh 0' }}>
            
            {/* Play Mission Button */}
            <button type="button" onClick={() => handleNavigate('LEVEL_SELECT')} style={{ height: '35%', maxHeight: '120px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'block', transition: 'transform 0.1s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <img src={`${ASSET_BASE}/cta/play-mission-button.png`} alt="Play Mission" draggable={false} style={{ height: '100%', width: 'auto', objectFit: 'contain' }} onError={(e) => { const t = e.target as HTMLImageElement; t.style.background = '#ff6b35'; t.style.minWidth = '200px'; t.style.borderRadius = '8px'; }} />
            </button>

            {/* Menu Cards Row */}
            <div style={{ height: '30%', maxHeight: '100px', width: '90%', maxWidth: '800px', display: 'flex', justifyContent: 'center', gap: '2vw' }}>
              <MenuCard src={`${ASSET_BASE}/cards/armory-card.png`} alt="Armory" onClick={() => handleNavigate('WEAPON_SELECT')} />
              <MenuCard src={`${ASSET_BASE}/cards/units-card.png`} alt="Units" onClick={() => handleNavigate('CHAR_SELECT')} />
              <MenuCard src={`${ASSET_BASE}/cards/pvp-card.png`} alt="PVP" onClick={() => handleNavigate('PVP')} />
              <MenuCard src={`${ASSET_BASE}/cards/shop-card.png`} alt="Shop" onClick={() => handleNavigate('SHOP')} />
            </div>

          </div>

          {/* Bottom Navigation */}
          <BottomNav onHome={() => handleNavigate('MENU')} onMissions={() => handleNavigate('LEVEL_SELECT')} onClans={() => handleNavigate('CLANS')} onLeaderboard={() => handleNavigate('LEADERBOARD')} />
        </div>
      </div>

      {showBank && <BankModal onClose={() => setShowBank(false)} />}

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
    </div>
  );
};

// --- Responsive Subcomponents ---

const TopBar: React.FC<{ level: number; xp: number; xpTarget: number; xpProgress: number; currentPigs: number; username: string; onSettings: () => void; onBank: () => void; }> = ({ level, xp, xpTarget, xpProgress, currentPigs, username, onSettings, onBank }) => {
  const CURRENT_PIG_PRICE_USD = 0.0000067;
  const fiatValue = (currentPigs * CURRENT_PIG_PRICE_USD).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <div style={{ height: '14vh', minHeight: '60px', maxHeight: '80px', zIndex: 3, display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(4px)', flexShrink: 0 }}>
      
      {/* Player Info */}
      <div style={{ flex: 1.5, ...topCellStyle, display: 'flex', alignItems: 'center', padding: '0 2vw', gap: '1vw' }}>
        <img src={`${ASSET_BASE}/topbar/player-rank-badge.png`} alt="Rank" draggable={false} style={{ height: '60%', width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 'clamp(12px, 1.5vw, 16px)', fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <div style={{ fontSize: 'clamp(9px, 1vw, 12px)', fontWeight: 800, color: '#f2ede0' }}>LVL {level}</div>
            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.12)', borderRadius: 999 }}>
              <div style={{ width: `${xpProgress}%`, height: '100%', background: 'linear-gradient(90deg, #ffb300 0%, #ff7e00 100%)', borderRadius: 999 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Currency & Bank (Click anywhere here to open Bank) */}
      <div onClick={onBank} style={{ flex: 1.2, ...topCellStyle, position: 'relative', padding: '1vh 1vw', cursor: 'pointer' }}>
        <img src={`${ASSET_BASE}/topbar/topbar-panel.png`} alt="" draggable={false} style={{ position: 'absolute', top: '10%', left: '5%', right: '5%', bottom: '10%', width: '90%', height: '80%', objectFit: 'fill' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/assets/sprites/pig-token.png" alt="PIGS" style={{ width: 'clamp(18px, 3vw, 26px)', height: 'clamp(18px, 3vw, 26px)', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/26/ffd700/000?text=$'; }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 'clamp(12px, 1.8vw, 16px)', fontWeight: 900, color: '#fff1c9', lineHeight: 1 }}>{currentPigs}</span>
              <span style={{ fontSize: 'clamp(9px, 1vw, 11px)', fontWeight: 800, color: '#4caf50', marginTop: 2 }}>≈ {fiatValue}</span>
            </div>
          </div>
          <img src={`${ASSET_BASE}/topbar/plus-button.png`} alt="Add" draggable={false} style={{ width: 'clamp(16px, 2.5vw, 24px)', height: 'clamp(16px, 2.5vw, 24px)', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>
      </div>

      {/* FIX: Wallet Button moved to TopBar next to settings */}
      <div style={{ flex: 1, ...iconCellStyle }}>
        <WalletButton />
      </div>

      <button style={{ flex: 0.4, ...iconCellStyle }} type="button" onClick={onSettings}>
        <img src={`${ASSET_BASE}/topbar/settings-icon.png`} alt="Settings" draggable={false} style={{ width: 'clamp(18px, 3vw, 28px)', height: 'clamp(18px, 3vw, 28px)', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </button>
    </div>
  );
};

const MenuCard: React.FC<{ src: string; alt: string; onClick: () => void }> = ({ src, alt, onClick }) => (
  <button type="button" onClick={onClick} style={{ height: '100%', flex: 1, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'center', transition: 'transform 0.1s ease-in-out' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
    <img src={src} alt={alt} draggable={false} style={{ height: '100%', width: 'auto', objectFit: 'contain' }} onError={(e) => { const t = e.target as HTMLImageElement; t.style.background = '#333'; t.style.minWidth = '60px'; t.style.borderRadius = '8px'; }} />
  </button>
);

const BottomNav: React.FC<{ onHome: () => void; onMissions: () => void; onClans: () => void; onLeaderboard: () => void; }> = ({ onHome, onMissions, onClans, onLeaderboard }) => (
  <div style={{ width: '100%', height: '15vh', minHeight: '60px', maxHeight: '90px', position: 'relative', zIndex: 4, flexShrink: 0 }}>
    <img src={`${ASSET_BASE}/nav/bottom-nav-bar.png`} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.background = '#111'; }} />
    <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'center', padding: '1vh 2vw 0', maxWidth: 800, margin: '0 auto' }}>
      <NavItem src={`${ASSET_BASE}/nav/nav-home-active.png`} alt="Home" onClick={onHome} />
      <NavItem src={`${ASSET_BASE}/nav/nav-missions.png`} alt="Missions" onClick={onMissions} />
      <NavItem src={`${ASSET_BASE}/nav/nav-clans.png`} alt="Clans" onClick={onClans} />
      <NavItem src={`${ASSET_BASE}/nav/nav-leaderboard.png`} alt="Leaderboard" onClick={onLeaderboard} />
    </div>
  </div>
);

const NavItem: React.FC<{ src: string; alt: string; onClick: () => void }> = ({ src, alt, onClick }) => (
  <button type="button" onClick={onClick} style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
    <img src={src} alt={alt} draggable={false} style={{ height: '80%', width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
  </button>
);

const topCellStyle: React.CSSProperties = { borderRight: '1px solid rgba(255,255,255,0.08)', boxSizing: 'border-box' };
const iconCellStyle: React.CSSProperties = { border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '0 1vw' };
const btnStyle: React.CSSProperties = { padding: '15px 20px', background: '#333', border: '2px solid #555', color: '#fff', cursor: 'pointer', borderRadius: 8, fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' };
