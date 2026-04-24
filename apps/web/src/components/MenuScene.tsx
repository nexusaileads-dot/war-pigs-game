import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useTelegram } from './TelegramProvider';

interface Props {
  onNavigate: (
    screen: 'MENU' | 'CHAR_SELECT' | 'WEAPON_SELECT' | 'LEVEL_SELECT' | 'SHOP' | 'PROFILE' | 'GAME'
  ) => void;
}

const HOME = '/assets/ui/home';
const TOPBAR = `${HOME}/topbar`;
const BRANDING = `${HOME}/branding`;
const REWARD = `${HOME}/reward`;
const CTA = `${HOME}/cta`;
const CARDS = `${HOME}/cards`;
const NAV = `${HOME}/nav`;

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

  const xpTarget = Math.max(2500, level * 1250);
  const xpProgress = Math.max(0, Math.min(100, (xp / xpTarget) * 100));

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#030303',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '430px',
          height: '100dvh',
          minHeight: '100vh',
          overflow: 'hidden',
          background: '#070707',
          color: '#fff'
        }}
      >
        <img
          src={`${HOME}/main-background.png`}
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
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.05) 18%, rgba(0,0,0,0.08) 65%, rgba(0,0,0,0.18) 100%)',
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '76px',
            zIndex: 3,
            display: 'grid',
            gridTemplateColumns: '1.7fr 1.15fr 0.58fr 0.58fr',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(10,10,10,0.72)',
            backdropFilter: 'blur(2px)'
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
                src={`${TOPBAR}/player-rank-badge.png`}
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
                    fontSize: '10px',
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
                    fontSize: '9px',
                    fontWeight: 800,
                    color: '#f2ede0',
                    textTransform: 'uppercase',
                    marginTop: '2px'
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
                      background: 'rgba(255,255,255,0.12)',
                      borderRadius: '999px',
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
                      fontSize: '8px',
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
            <div
              style={{
                position: 'relative',
                height: '100%',
                padding: '8px'
              }}
            >
              <img
                src={`${TOPBAR}/topbar-panel.png`}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  right: '8px',
                  bottom: '8px',
                  width: 'calc(100% - 16px)',
                  height: 'calc(100% - 16px)',
                  objectFit: 'fill',
                  display: 'block'
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle at 35% 35%, #ffd14d 0%, #ffb323 55%, #8a4e00 100%)',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.12)'
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 900,
                      color: '#fff1c9'
                    }}
                  >
                    {currentPigs}
                  </span>
                </div>

                <img
                  src={`${TOPBAR}/plus-button.png`}
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

          <button style={iconCellStyle} type="button">
            <img
              src={`${TOPBAR}/mail-icon.png`}
              alt="Mail"
              draggable={false}
              style={{ width: '22px', height: '22px', objectFit: 'contain', display: 'block' }}
            />
            <div style={badgeStyle}>2</div>
          </button>

          <button style={iconCellStyle} type="button" onClick={() => handleNavigate('PROFILE')}>
            <img
              src={`${TOPBAR}/settings-icon.png`}
              alt="Settings"
              draggable={false}
              style={{ width: '22px', height: '22px', objectFit: 'contain', display: 'block' }}
            />
          </button>
        </div>

        <div
          style={{
            position: 'absolute',
            top: '76px',
            left: 0,
            right: 0,
            bottom: '78px',
            zIndex: 2,
            padding: '8px 12px 6px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div
            style={{
              width: '118px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}
          >
            <img
              src={`${BRANDING}/war-pigs-logo.png`}
              alt="War Pigs"
              draggable={false}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit: 'contain'
              }}
            />

            <img
              src={`${BRANDING}/subtitle-banner.png`}
              alt="Tactical Swine Warfare"
              draggable={false}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit: 'contain',
                marginTop: '-8px'
              }}
            />

            <div
              style={{
                width: '104px',
                marginTop: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch'
              }}
            >
              <img
                src={`${REWARD}/reward-chest.png`}
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
                  marginTop: '-2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  paddingLeft: '2px',
                  color: '#f7ecd0',
                  fontSize: '8px',
                  fontWeight: 800,
                  lineHeight: 1
                }}
              >
                <img
                  src={`${REWARD}/timer-icon.png`}
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
                type="button"
                style={{
                  marginTop: '2px',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <img
                  src={`${REWARD}/claim-button.png`}
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
          </div>

          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <button
              type="button"
              onClick={() => handleNavigate('CHAR_SELECT')}
              style={{
                alignSelf: 'center',
                position: 'relative',
                width: '100%',
                maxWidth: '300px',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer'
              }}
            >
              <img
                src={`${CTA}/play-mission-button.png`}
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
                  color: '#f6f1df',
                  fontSize: '24px',
                  fontWeight: 900,
                  letterSpacing: '0.7px',
                  textTransform: 'uppercase',
                  textShadow: '0 2px 0 rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.45)',
                  transform: 'translateY(-2px)',
                  pointerEvents: 'none'
                }}
              >
                PLAY MISSION
              </span>
            </button>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4px',
                alignItems: 'end'
              }}
            >
              <MenuCard
                src={`${CARDS}/armory-card.png`}
                alt="Armory"
                onClick={() => handleNavigate('WEAPON_SELECT')}
              />
              <MenuCard
                src={`${CARDS}/units-card.png`}
                alt="Units"
                onClick={() => handleNavigate('CHAR_SELECT')}
              />
              <MenuCard
                src={`${CARDS}/pvp-card.png`}
                alt="PVP"
                onClick={() => handleNavigate('PROFILE')}
              />
              <MenuCard
                src={`${CARDS}/shop-card.png`}
                alt="Shop"
                onClick={() => handleNavigate('SHOP')}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '78px',
            zIndex: 4
          }}
        >
          <img
            src={`${NAV}/bottom-nav-bar.png`}
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
              height: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              alignItems: 'center',
              padding: '4px 4px 0'
            }}
          >
            <NavItem src={`${NAV}/nav-home-active.png`} alt="Home" onClick={() => handleNavigate('MENU')} />
            <NavItem
              src={`${NAV}/nav-missions.png`}
              alt="Missions"
              onClick={() => handleNavigate('LEVEL_SELECT')}
            />
            <NavItem src={`${NAV}/nav-clans.png`} alt="Clans" onClick={() => handleNavigate('PROFILE')} />
            <NavItem
              src={`${NAV}/nav-leaderboard.png`}
              alt="Leaderboard"
              onClick={() => handleNavigate('PROFILE')}
            />
          </div>
        </div>
      </div>
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
        display: 'block'
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
        cursor: 'pointer'
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: '72px',
          maxWidth: '100%',
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
  borderRight: '1px solid rgba(255,255,255,0.08)',
  boxSizing: 'border-box'
};

const iconCellStyle: React.CSSProperties = {
  minHeight: '76px',
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
  top: '10px',
  right: '10px',
  minWidth: '16px',
  height: '16px',
  padding: '0 4px',
  borderRadius: '999px',
  background: '#d92a17',
  color: '#fff',
  fontSize: '9px',
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 0 2px rgba(0,0,0,0.35)'
};
