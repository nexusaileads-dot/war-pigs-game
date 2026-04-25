import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { TelegramProvider } from './components/TelegramProvider';
import { MenuScene } from './components/MenuScene';
import { CharacterSelect } from './components/CharacterSelect';
import { WeaponSelect } from './components/WeaponSelect';
import { LevelSelect } from './components/LevelSelect';
import { Shop } from './components/Shop';
import { Profile } from './components/Profile';
import { GameCanvas } from './game/GameCanvas';

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

const ComingSoon: React.FC<{
  title: string;
  subtitle: string;
  onBack: () => void;
}> = ({ title, subtitle, onBack }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        padding: '20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          background: '#444',
          border: '2px solid #ff6b35',
          color: '#fff',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          alignSelf: 'flex-start'
        }}
      >
        BACK
      </button>

      <div
        style={{
          maxWidth: '620px',
          margin: '80px auto 0',
          padding: '28px',
          borderRadius: '16px',
          border: '2px solid #2e2e2e',
          background: '#151515',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            fontSize: '14px',
            color: '#ffb74d',
            fontWeight: 800,
            letterSpacing: '0.08em',
            marginBottom: '10px',
            textTransform: 'uppercase'
          }}
        >
          War Pigs
        </div>

        <h1
          style={{
            margin: '0 0 12px 0',
            fontSize: '28px',
            color: '#ff6b35',
            textTransform: 'uppercase'
          }}
        >
          {title}
        </h1>

        <p
          style={{
            margin: 0,
            color: '#bdbdbd',
            fontSize: '14px',
            lineHeight: 1.6
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const { initAuth, isLoading, user, refreshProfile } = useGameStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>('MENU');

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    const hasRun = !!sessionStorage.getItem('currentRun');
    if (user && hasRun) {
      setCurrentScreen('GAME');
    }
  }, [user]);

  const handleGameExit = async () => {
    try {
      await refreshProfile();
    } catch (error) {
      console.error('[App] Failed to refresh profile on game exit:', error);
    }
    setCurrentScreen('MENU');
  };

  const authFailedMessage = useMemo(() => {
    const devEnabled = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true';
    return devEnabled
      ? 'AUTH FAILED. DEV LOGIN DID NOT COMPLETE.'
      : 'AUTH FAILED. LAUNCH VIA TELEGRAM.';
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0a0a0a',
          color: '#ff6b35',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        LOADING SWINE CORPS DATA...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0a0a0a',
          color: '#ff6b35',
          fontFamily: 'monospace',
          textAlign: 'center',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            padding: '20px',
            border: '2px solid #ff6b35',
            borderRadius: '12px',
            background: '#141414'
          }}
        >
          {authFailedMessage}
        </div>
      </div>
    );
  }

  let screen: React.ReactNode;

  switch (currentScreen) {
    case 'MENU':
      screen = <MenuScene onNavigate={(next) => setCurrentScreen(next as Screen)} />;
      break;

    case 'CHAR_SELECT':
      screen = (
        <CharacterSelect
          onBack={() => setCurrentScreen('MENU')}
          onStart={() => setCurrentScreen('LEVEL_SELECT')}
        />
      );
      break;

    case 'WEAPON_SELECT':
      screen = <WeaponSelect onBack={() => setCurrentScreen('MENU')} />;
      break;

    case 'LEVEL_SELECT':
      screen = (
        <LevelSelect
          onBack={() => setCurrentScreen('CHAR_SELECT')}
          onStart={() => setCurrentScreen('GAME')}
        />
      );
      break;

    case 'SHOP':
      screen = <Shop onBack={() => setCurrentScreen('MENU')} />;
      break;

    case 'PROFILE':
      screen = <Profile onBack={() => setCurrentScreen('MENU')} />;
      break;

    case 'PVP':
      screen = (
        <ComingSoon
          title="PVP Coming Soon"
          subtitle="Head-to-head battles, wagers, ranked matchmaking, and reward systems are still under construction."
          onBack={() => setCurrentScreen('MENU')}
        />
      );
      break;

    case 'CLANS':
      screen = (
        <ComingSoon
          title="Clans Coming Soon"
          subtitle="Clan creation, shared progression, and team competition features are planned but not live yet."
          onBack={() => setCurrentScreen('MENU')}
        />
      );
      break;

    case 'LEADERBOARD':
      screen = (
        <ComingSoon
          title="Leaderboard Coming Soon"
          subtitle="Global rankings, season points, and top commander standings will be added in a later update."
          onBack={() => setCurrentScreen('MENU')}
        />
      );
      break;

    case 'GAME':
      screen = <GameCanvas onExit={handleGameExit} />;
      break;

    default:
      screen = <MenuScene onNavigate={(next) => setCurrentScreen(next as Screen)} />;
      break;
  }

  return <TelegramProvider>{screen}</TelegramProvider>;
        }
