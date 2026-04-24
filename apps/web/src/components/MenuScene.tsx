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

  const level = user?.profile.level || 1;
  const xp = user?.profile.xp || 0;
  const currentPigs = user?.profile.currentPigs || 0;

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
        minHeight: '100vh',
        width: '100%',
        background: '#050505',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0b0b0b',
          backgroundImage: `url(${HOME_ASSET}/main-background.png)`,
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <TopBar
          level={level}
          xp={xp}
          currentPigs={currentPigs}
          onSettings={() => handleNavigate('PROFILE')}
        />

        <div
          style={{
            padding: '18px 16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            flex: 1
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(150px, 240px)',
              gap: '12px',
              alignItems: 'start'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <img
                src={`${BRANDING_ASSET}/war-pigs-logo.png`}
                alt="War Pigs"
                style={{
                  width: '100%',
                  maxWidth: '210px',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
                draggable={false}
              />

              <img
                src={`${BRANDING_ASSET}/subtitle-banner.png`}
                alt="Tactical Swine Warfare"
                style={{
                  width: '100%',
                  maxWidth: '210px',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
                draggable={false}
              />

              <DailyRewardCard />
            </div>

            <div />
          </div>

          <button
            onClick={() => handleNavigate('CHAR_SELECT')}
            style={imageButtonStyle}
          >
            <img
              src={`${CTA_ASSET}/play-mission-button.png`}
              alt="Play Mission"
              style={fullImageStyle}
              draggable={false}
            />
          </button>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px',
              marginTop: '2px'
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
              disabled
            />
            <FeatureCard
              src={`${CARDS_ASSET}/shop-card.png`}
              alt="Shop"
              onClick={() => handleNavigate('SHOP')}
            />
          </div>
        </div>

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
        padding: '10px 10px 0'
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr auto auto',
          gap: '8px',
          alignItems: 'stretch'
        }}
      >
        <div style={panelStyle}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '52px minmax(0, 1fr)',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            <img
              src={`${TOPBAR_ASSET}/player-rank-badge.png`}
              alt="Player rank"
              style={{
                width: '52px',
                height: '52px',
                objectFit: 'contain',
                display: 'block'
              }}
              draggable={false}
            />

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 900,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
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
                  marginTop: '2px',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#d9d9d9',
                  textTransform: 'uppercase'
                }}
              >
                Level {level}
              </div>

              <div
                style={{
                  marginTop: '6px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '8px',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    height: '8px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.12)',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)'
                  }}
                >
                  <div
                    style={{
                      width: `${xpProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ff9f1a 0%, #ff7b00 100%)'
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#d4d4d4',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {xp} / {xpTarget} XP
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%'
            }}
          >
            <img
              src={`${TOPBAR_ASSET}/topbar-panel.png`}
              alt=""
              style={{
                ...fullImageStyle,
                position: 'absolute',
                inset: 0,
                objectFit: 'fill'
              }}
              draggable={false}
            />

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: 0
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle at 35% 35%, #ffcf40 0%, #ff9f1a 52%, #8a3f00 100%)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.14)'
                  }}
                />
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#fff4c2',
                    letterSpacing: '0.4px'
                  }}
                >
                  {currentPigs}
                </span>
              </div>

              <img
                src={`${TOPBAR_ASSET}/plus-button.png`}
                alt="Add"
                style={{
                  width: '24px',
                  height: '24px',
                  objectFit: 'contain',
                  display: 'block'
                }}
                draggable={false}
              />
            </div>
          </div>
        </div>

        <IconPanel icon={`${TOPBAR_ASSET}/mail-icon.png`} badgeCount={2} />
        <IconPanel icon={`${TOPBAR_ASSET}/settings-icon.png`} onClick={onSettings} />
      </div>
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
        ...panelStyle,
        width: '54px',
        minWidth: '54px',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <img
        src={icon}
        alt=""
        style={{
          width: '24px',
          height: '24px',
          objectFit: 'contain',
          display: 'block'
        }}
        draggable={false}
      />

      {typeof badgeCount === 'number' && badgeCount > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            minWidth: '18px',
            height: '18px',
            borderRadius: '999px',
            background: '#d73318',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.5)'
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
        maxWidth: '150px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      <img
        src={`${REWARD_ASSET}/reward-chest.png`}
        alt="Daily reward"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain'
        }}
        draggable={false}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#f6e7bc',
          fontSize: '11px',
          fontWeight: 800,
          textTransform: 'uppercase'
        }}
      >
        <img
          src={`${REWARD_ASSET}/timer-icon.png`}
          alt=""
          style={{
            width: '14px',
            height: '14px',
            objectFit: 'contain',
            display: 'block'
          }}
          draggable={false}
        />
        <span>23:59:12</span>
      </div>

      <button style={imageButtonStyle}>
        <img
          src={`${REWARD_ASSET}/claim-button.png`}
          alt="Claim"
          style={fullImageStyle}
          draggable={false}
        />
      </button>
    </div>
  );
};

const FeatureCard: React.FC<{
  src: string;
  alt: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ src, alt, onClick, disabled }) => {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        ...imageButtonStyle,
        opacity: disabled ? 0.72 : 1,
        filter: disabled ? 'grayscale(0.2)' : 'none'
      }}
    >
      <img
        src={src}
        alt={alt}
        style={fullImageStyle}
        draggable={false}
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
          minHeight: '86px'
        }}
      >
        <img
          src={`${NAV_ASSET}/bottom-nav-bar.png`}
          alt=""
          style={{
            ...fullImageStyle,
            position: 'absolute',
            inset: 0,
            objectFit: 'fill'
          }}
          draggable={false}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            padding: '10px 10px 8px',
            alignItems: 'end'
          }}
        >
          <NavItem
            src={`${NAV_ASSET}/nav-home-active.png`}
            alt="Home"
            onClick={onHome}
          />
          <NavItem
            src={`${NAV_ASSET}/nav-missions.png`}
            alt="Missions"
            onClick={onMissions}
          />
          <NavItem
            src={`${NAV_ASSET}/nav-clans.png`}
            alt="Clans"
            onClick={onClans}
          />
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
        padding: '0',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          maxWidth: '86px',
          height: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
        draggable={false}
      />
    </button>
  );
};

const panelStyle: React.CSSProperties = {
  minHeight: '62px',
  background: 'linear-gradient(180deg, rgba(20,20,20,0.94) 0%, rgba(9,9,9,0.92) 100%)',
  border: '1px solid rgba(176,128,49,0.55)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  padding: '8px',
  boxSizing: 'border-box'
};

const imageButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '0',
  margin: '0',
  cursor: 'pointer',
  display: 'block'
};

const fullImageStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  objectFit: 'contain',
  display: 'block'
};