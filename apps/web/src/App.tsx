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
import { SolanaWalletProvider } from './providers/SolanaWalletProvider';

type Screen =
  | 'MENU'
  | 'CHAR_SELECT'
  | 'WEAPON_SELECT'
  | 'LEVEL_SELECT'
  | 'SHOP'
  | 'PROFILE'
  | 'GAME';

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

    case 'GAME':
      screen = <GameCanvas onExit={handleGameExit} />;
      break;

    default:
      screen = <MenuScene onNavigate={(next) => setCurrentScreen(next as Screen)} />;
      break;
  }

  return (
    <SolanaWalletProvider>
      <TelegramProvider>{screen}</TelegramProvider>
    </SolanaWalletProvider>
  );
        }
