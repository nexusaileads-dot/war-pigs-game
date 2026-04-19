import React, { useEffect, useState } from 'react';
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
  | 'GAME';

export default function App() {
  const { initAuth, isLoading, user, refreshProfile } = useGameStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>('MENU');

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  const handleGameExit = async () => {
    await refreshProfile();
    setCurrentScreen('MENU');
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0a0a0a',
          color: '#ff6b35',
          fontFamily: 'monospace'
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
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0a0a0a',
          color: '#ff6b35',
          fontFamily: 'monospace',
          textAlign: 'center',
          padding: '24px'
        }}
      >
        AUTH FAILED. LAUNCH VIA TELEGRAM.
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

  return <TelegramProvider>{screen}</TelegramProvider>;
          }
