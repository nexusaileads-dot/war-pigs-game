import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useTelegram } from './TelegramProvider';
import { WalletButton } from './WalletButton';

type Screen =
  | 'MENU'
  | 'CHAR_SELECT'
  | 'WEAPON_SELECT'
  | 'LEVEL_SELECT'
  | 'SHOP'
  | 'PROFILE'
  | 'PVP'
  | 'CLANS'
  | 'LEADERBOARD'
  | 'GAME';

interface Props {
  onNavigate: (screen: Screen) => void;
}

const ASSET_BASE = '/assets/ui/home';

export const MenuScene: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useGameStore();
  const { hapticFeedback, isTelegramWebApp } = useTelegram();

  // FIXED: Added optional chaining (?.) to prevent crashes if profile is null
  const level = user?.profile?.level || 2;
  const xp = user?.profile?.xp || 1460;
  const currentPigs = user?.profile?.currentPigs || 8690;

  const xpTarget = Math.max(2500, level * 1250);
  const xpProgress = Math.max(0, Math.min(100, (xp / xpTarget) * 100));

  const handleNavigate = (screen: Screen) => {
    if (isTelegramWebApp) {
      try {
        hapticFeedback?.('medium');
      } catch (error) {
        console.warn('[MenuScene] Haptic feedback failed:', error);
      }
    }
    onNavigate(screen);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100dvh',
        minHeight: '100%',
        background: '#030303',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        willChange: 'transform',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '430px',
          height: '100%',
          overflow: 'hidden',
          background: '#070707',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <img
          src={`${ASSET_BASE}/main-background.png`}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.background = '#070707';
            target.style.display = 'none';
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.03) 22%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0.18) 100%)',
            pointerEvents: 'none'
          }}
        />

        <TopBar
          level={level}
          xp={xp}
          xpTarget={xpTarget}
          xpProgress={xpProgress}
          currentPigs={currentPigs}
          onSettings={() => handleNavigate('PROFILE')}
        />

        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 12,
              width: 118,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              zIndex: 2,
              pointerEvents: 'none'
            }}
          >
            <img
              src={`${ASSET_BASE}/branding/war-pigs-logo.png`}
              alt="War Pigs"
              draggable={false}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit: 'contain'
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />

            <div
              style={{
                width: 104,
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch'
              }}
            >
              <img
                src={`${ASSET_BASE}/reward/reward-chest.png`}
                alt="Daily reward"
                draggable={false}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />

              <div
                style={{
                  marginTop: '-10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  paddingLeft: 4,
                  color: '#f7ecd0',
                  fontSize: 8,
                  fontWeight: 800,
                  lineHeight: 1
                }}
              >
                <img
                  src={`${ASSET_BASE}/reward/timer-icon.png`}
                  alt=""
                  draggable={false}
                  style={{
                    width: 10,
                    height: 10,
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span>23:59:12</span>
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 18,
              right: 12,
              zIndex: 20
            }}
          >
            <WalletButton />
          </div>

          <div style={{ flex: 1, minHeight: 0 }} />

          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
              position: 'relative',
              zIndex: 2
            }}
          >
            <button
              type="button"
              onClick={() => handleNavigate('CHAR_SELECT')}
              style={{
                width: '100%',
                maxWidth: 304,
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'block',
                lineHeight: 0,
                margin: 0,
                touchAction: 'manipulation'
              }}
            >
              <img
                src={`${ASSET_BASE}/cta/play-mission-button.png`}
                alt="Play Mission"
                draggable={false}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.background = '#ff6b35';
                  target.style.minHeight = '60px';
                  target.style.borderRadius = '8px';
                }}
              />
            </button>

            <div
              style={{
                width: '100%',
                padding: '0 10px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 4,
                alignItems: 'end',
                marginTop: '-2px',
                lineHeight: 0
              }}
            >
              <MenuCard
                src={`${ASSET_BASE}/cards/armory-card.png`}
                alt="Armory"
                onClick={() => handleNavigate('WEAPON_SELECT')}
              />
              <MenuCard
                src={`${ASSET_BASE}/cards/units-card.png`}
                alt="Units"
                onClick={() => handleNavigate('CHAR_SELECT')}
              />
              <MenuCard
                src={`${ASSET_BASE}/cards/pvp-card.png`}
                alt="PVP"
                onClick={() => handleNavigate('PVP')}
              />
              <MenuCard
                src={`${ASSET_BASE}/cards/shop-card.png`}
                alt="Shop"
                onClick={() => handleNavigate('SHOP')}
              />
            </div>

            <BottomNav
              onHome={() => handleNavigate('MENU')}
              onMissions={() => handleNavigate('LEVEL_SELECT')}
              onClans={() => handleNavigate('CLANS')}
              onLeaderboard={() => handleNavigate('LEADERBOARD')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const TopBar: React.FC<{
  level: number;
  xp: number;
  xpTarget: number;
  xpProgress: number;
  currentPigs: number;
  onSettings: () => void;
}> = ({ level, xp, xpTarget, xpProgress, currentPigs, onSettings }) => {
  return (
    <div
      style={{
        height: 76,
        zIndex: 3,
        display: 'grid',
        gridTemplateColumns: '1.7fr 1.15fr 0.58fr 0.58fr',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,10,10,0.72)',
        backdropFilter: 'blur(2px)',
        flexShrink: 0
      }}
    >
      <div style={topCellStyle}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr',
            gap: 8,
            alignItems: 'center',
            height: '100%',
            padding: '8px 10px'
          }}
        >
          <img
            src={`${ASSET_BASE}/topbar/player-rank-badge.png`}
            alt="Player rank"
            draggable={false}
            style={{
              width: 42,
              height: 42,
              objectFit: 'contain',
              display: 'block'
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              General Pig
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: '#f2ede0',
                textTransform: 'uppercase',
                marginTop: 2
              }}
            >
              Level {level}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 5,
                alignItems: 'center',
                marginTop: 6
              }}
            >
              <div
                style={{
                  height: 8,
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${xpProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #ffb300 0%, #ff7e00 100%)'
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: '#e2e2e2',
                  whiteSpace: 'nowrap'
                }}
              >
                {xp} / {xpTarget} XP
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={topCellStyle}>
        <div style={{ position: 'relative', height: '100%', padding: 8 }}>
          <img
            src={`${ASSET_BASE}/topbar/topbar-panel.png`}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              bottom: 8,
              width: 'calc(100% - 16px)',
              height: 'calc(100% - 16px)',
              objectFit: 'fill',
              display: 'block'
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle at 35% 35%, #ffd14d 0%, #ffb323 55%, #8a4e00 100%)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.12)'
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: '#fff1c9'
                }}
              >
                {currentPigs}
              </span>
            </div>
            <img
              src={`${ASSET_BASE}/topbar/plus-button.png`}
              alt="Add"
              draggable={false}
              style={{
                width: 20,
                height: 20,
                objectFit: 'contain',
                display: 'block'
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>

      <button style={iconCellStyle} type="button">
        <img
          src={`${ASSET_BASE}/topbar/mail-icon.png`}
          alt="Mail"
          draggable={false}
          style={{ width: 22, height: 22, objectFit: 'contain', display: 'block' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div style={badgeStyle}>2</div>
      </button>

      <button style={iconCellStyle} type="button" onClick={onSettings}>
        <img
          src={`${ASSET_BASE}/topbar/settings-icon.png`}
          alt="Settings"
          draggable={false}
          style={{ width: 22, height: 22, objectFit: 'contain', display: 'block' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </button>
    </div>
  );
};

const MenuCard: React.FC<{
  src: string;
  alt: string;
  onClick: () => void;
}> = ({ src, alt, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'block',
        lineHeight: 0,
        margin: 0,
        touchAction: 'manipulation'
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain'
        }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.background = '#333';
          target.style.minHeight = '40px';
          target.style.borderRadius = '4px';
        }}
      />
    </button>
  );
};

const BottomNav: React.FC<{
  onHome: () => void;
  onMissions: () => void;
  onClans: () => void;
  onLeaderboard: () => void;
}> = ({ onHome, onMissions, onClans, onLeaderboard }) => {
  return (
    <div
      style={{
        width: '100%',
        height: 78,
        position: 'relative',
        zIndex: 4,
        flexShrink: 0,
        lineHeight: 0,
        marginTop: '-2px'
      }}
    >
      <img
        src={`${ASSET_BASE}/nav/bottom-nav-bar.png`}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          display: 'block'
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.background = '#111';
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          alignItems: 'center',
          padding: '4px 4px 0'
        }}
      >
        <NavItem src={`${ASSET_BASE}/nav/nav-home-active.png`} alt="Home" onClick={onHome} />
        <NavItem src={`${ASSET_BASE}/nav/nav-missions.png`} alt="Missions" onClick={onMissions} />
        <NavItem src={`${ASSET_BASE}/nav/nav-clans.png`} alt="Clans" onClick={onClans} />
        <NavItem src={`${ASSET_BASE}/nav/nav-leaderboard.png`} alt="Leaderboard" onClick={onLeaderboard} />
      </div>
    </div>
  );
};

const NavItem: React.FC<{
  src: string;
  alt: string;
  onClick: () => void;
}> = ({ src, alt, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'transparent',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        touchAction: 'manipulation'
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: 72,
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain'
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </button>
  );
};

const topCellStyle: React.CSSProperties = {
  minHeight: 76,
  borderRight: '1px solid rgba(255,255,255,0.08)',
  boxSizing: 'border-box'
};

const iconCellStyle: React.CSSProperties = {
  minHeight: 76,
  border: 'none',
  borderRight: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  cursor: 'pointer',
  padding: 0
};

const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  minWidth: 16,
  height: 16,
  padding: '0 4px',
  borderRadius: 999,
  background: '#d92a17',
  color: '#fff',
  fontSize: 9,
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 0 2px rgba(0,0,0,0.35)'
};
