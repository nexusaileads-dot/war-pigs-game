import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useTelegram } from './TelegramProvider';

interface Props {
  onNavigate: (
    screen: 'MENU' | 'CHAR_SELECT' | 'WEAPON_SELECT' | 'LEVEL_SELECT' | 'SHOP' | 'PROFILE' | 'GAME'
  ) => void;
}

const HOME_ASSET = '/assets/ui/home';
const TOPBAR_ASSET = `${HOME_ASSET}/topbar`;
const BRANDING_ASSET = `${HOME_ASSET}/branding`;
const REWARD_ASSET = `${HOME_ASSET}/reward`;
const CTA_ASSET = `${HOME_ASSET}/cta`;
const CARDS_ASSET = `${HOME_ASSET}/cards`;
const NAV_ASSET = `${HOME_ASSET}/nav`;

export const MenuScene: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useGameStore();
  const { hapticFeedback } = useTelegram();

  const level = user?.profile.level || 2;
  const xp = user?.profile.xp || 1060;
  const currentPigs = user?.profile.currentPigs || 8190;

  const handleNavigate = (
    screen: 'MENU' | 'CHAR_SELECT' | 'WEAPON_SELECT' | 'LEVEL_SELECT' | 'SHOP' | 'PROFILE' | 'GAME'
  ) => {
    try {
      hapticFeedback('medium');
    } catch (error) {
      console.error('[MenuScene] Haptic feedback failed:', error);
    }

    onNavigate(screen);
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        background: '#040404'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          height: '100dvh',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#090909',
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.12)), url(${HOME_ASSET}/main-background.png)`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center top',
          backgroundSize: '100% 100%'
        }}
      >
        <TopBar
          level={level}
          xp={xp}
          currentPigs={currentPigs}
          onSettings={() => handleNavigate('PROFILE')}
        />

        <main
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '6px 10px 0'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '112px 1fr',
              gap: '4px',
              alignItems: 'start'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '2px'
              }}
            >
              <img
                src={`${BRANDING_ASSET}/war-pigs-logo.png`}
                alt="War Pigs"
                draggable={false}
                style={{
                  width: '100%',
                  maxWidth: '104px',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain'
                }}
              />

              <img
                src={`${BRANDING_ASSET}/subtitle-banner.png`}
                alt="Tactical Swine Warfare"
                draggable={false}
                style={{
                  width: '100%',
                  maxWidth: '104px',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain'
                }}
              />

              <DailyRewardCard />
            </div>

            <div />
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '4px'
            }}
          >
            <button
              onClick={() => handleNavigate('CHAR_SELECT')}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                width: '100%',
                maxWidth: '286px',
                position: 'relative',
                display: 'block'
              }}
            >
              <img
                src={`${CTA_ASSET}/play-mission-button.png`}
                alt="Play Mission"
                draggable={false}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain'
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f6f0df',
                  fontWeight: 900,
                  fontSize: '23px',
                  letterSpacing: '0.8px',
                  textShadow:
                    '0 2px 0 rgba(0,0,0,0.88), 0 0 8px rgba(0,0,0,0.45)',
                  pointerEvents: 'none',
                  transform: 'translateY(-2px)'
                }}
              >
                PLAY MISSION
              </span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '3px',
              marginBottom: '0'
            }}
          >
            <FeatureCard
              src={`${CARDS_ASSET}/armory-card.png`}
              alt="Armory"
              onClick={() => handleNavigate('WEAPON_SELECT')}
            />
            <FeatureCard
              src={`${CARDS_ASSET}/units-card.png`}
              alt="Units"
              onClick={() => handleNavigate('CHAR_SELECT')}
            />
            <FeatureCard
              src={`${CARDS_ASSET}/pvp-card.png`}
              alt="PVP"
              onClick={() => handleNavigate('PROFILE')}
            />
            <FeatureCard
              src={`${CARDS_ASSET}/shop-card.png`}
              alt="Shop"
              onClick={() => handleNavigate('SHOP')}
            />
          </div>
        </main>

        <BottomNav
          onHome={() => handleNavigate('MENU')}
          onMissions={() => handleNavigate('LEVEL_SELECT')}
          onClans={() => handleNavigate('PROFILE')}
          onLeaderboard={() => handleNavigate('PROFILE')}
        />
      </div>
    </div>
  );
};

const TopBar: React.FC<{
  level: number;
  xp: number;
  currentPigs: number;
  onSettings: () => void;
}> = ({ level, xp, currentPigs, onSettings }) => {
  const xpTarget = Math.max(2500, level * 1250);
  const xpProgress = Math.max(0, Math.min(100, (xp / xpTarget) * 100));

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        display: 'grid',
        gridTemplateColumns: '1.6fr 1.05fr 0.55fr 0.55fr',
        minHeight: '76px',
        borderBottom: '1px solid rgba(160,117,39,0.22)'
      }}
    >
      <div style={topCellStyle}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr',
            gap: '8px',
            alignItems: 'center',
            height: '100%',
            padding: '8px 10px'
          }}
        >
          <img
            src={`${TOPBAR_ASSET}/player-rank-badge.png`}
            alt="Player rank"
            draggable={false}
            style={{
              width: '42px',
              height: '42px',
              objectFit: 'contain',
              display: 'block'
            }}
          />

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 900,
                lineHeight: 1.05,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              General Pig
            </div>

            <div
              style={{
                marginTop: '2px',
                fontSize: '9px',
                fontWeight: 800,
                color: '#e6e1d5',
                textTransform: 'uppercase'
              }}
            >
              Level {level}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '5px',
                alignItems: 'center',
                marginTop: '6px'
              }}
            >
              <div
                style={{
                  height: '8px',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.11)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)'
                }}
              >
                <div
                  style={{
                    width: `${xpProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #ffb400 0%, #ff7c00 100%)'
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: '8px',
                  fontWeight: 800,
                  color: '#d7d7d7',
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
        <div
          style={{
            height: '100%',
            position: 'relative',
            padding: '9px 8px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <img
            src={`${TOPBAR_ASSET}/topbar-panel.png`}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              inset: '9px 8px',
              width: 'calc(100% - 16px)',
              height: 'calc(100% - 18px)',
              objectFit: 'fill',
              display: 'block'
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 9px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px'
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle at 35% 35%, #ffd04f 0%, #ffac20 58%, #8f4900 100%)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.12)'
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 900,
                  color: '#fff0c7',
                  letterSpacing: '0.3px'
                }}
              >
                {currentPigs}
              </span>
            </div>

            <img
              src={`${TOPBAR_ASSET}/plus-button.png`}
              alt="Add"
              draggable={false}
              style={{
                width: '20px',
                height: '20px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
        </div>
      </div>

      <IconPanel icon={`${TOPBAR_ASSET}/mail-icon.png`} badgeCount={2} />
      <IconPanel icon={`${TOPBAR_ASSET}/settings-icon.png`} onClick={onSettings} />
    </div>
  );
};

const IconPanel: React.FC<{
  icon: string;
  badgeCount?: number;
  onClick?: () => void;
}> = ({ icon, badgeCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        ...topCellStyle,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0
      }}
    >
      <img
        src={icon}
        alt=""
        draggable={false}
        style={{
          width: '22px',
          height: '22px',
          objectFit: 'contain',
          display: 'block'
        }}
      />

      {typeof badgeCount === 'number' && badgeCount > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            minWidth: '16px',
            height: '16px',
            borderRadius: '999px',
            background: '#d62f18',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.42)'
          }}
        >
          {badgeCount}
        </div>
      ) : null}
    </button>
  );
};

const DailyRewardCard: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }}
    >
      <img
        src={`${REWARD_ASSET}/reward-chest.png`}
        alt="Daily reward"
        draggable={false}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain'
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          color: '#f2e7c4',
          fontSize: '8px',
          fontWeight: 800,
          lineHeight: 1
        }}
      >
        <img
          src={`${REWARD_ASSET}/timer-icon.png`}
          alt=""
          draggable={false}
          style={{
            width: '10px',
            height: '10px',
            objectFit: 'contain',
            display: 'block'
          }}
        />
        <span>23:59:12</span>
      </div>

      <button
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          display: 'block',
          width: '100%'
        }}
      >
        <img
          src={`${REWARD_ASSET}/claim-button.png`}
          alt="Claim"
          draggable={false}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            objectFit: 'contain'
          }}
        />
      </button>
    </div>
  );
};

const FeatureCard: React.FC<{
  src: string;
  alt: string;
  onClick: () => void;
}> = ({ src, alt, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        display: 'block',
        width: '100%'
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
        position: 'relative',
        zIndex: 2,
        marginTop: 'auto'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '72px'
        }}
      >
        <img
          src={`${NAV_ASSET}/bottom-nav-bar.png`}
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
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            alignItems: 'end',
            padding: '6px 4px 2px'
          }}
        >
          <NavItem src={`${NAV_ASSET}/nav-home-active.png`} alt="Home" onClick={onHome} />
          <NavItem src={`${NAV_ASSET}/nav-missions.png`} alt="Missions" onClick={onMissions} />
          <NavItem src={`${NAV_ASSET}/nav-clans.png`} alt="Clans" onClick={onClans} />
          <NavItem
            src={`${NAV_ASSET}/nav-leaderboard.png`}
            alt="Leaderboard"
            onClick={onLeaderboard}
          />
        </div>
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
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: '100%',
          maxWidth: '68px',
          height: 'auto',
          display: 'block',
          objectFit: 'contain'
        }}
      />
    </button>
  );
};

const topCellStyle: React.CSSProperties = {
  minHeight: '76px',
  background: 'linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(10,10,10,0.95) 100%)',
  borderRight: '1px solid rgba(160,117,39,0.22)',
  boxSizing: 'border-box'
};
