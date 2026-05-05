import React, { useEffect, useState } from 'react';
import { GameNoticeProvider } from './components/GameNoticeProvider';
import { TelegramProvider } from './components/TelegramProvider';
import { MenuScene } from './components/MenuScene';
import { CharacterSelect } from './components/CharacterSelect';
import { WeaponSelect } from './components/WeaponSelect';
import { LevelSelect } from './components/LevelSelect';
import { GameCanvas } from './components/GameCanvas';

type Screen =
  | 'MENU'
  | 'CHAR_SELECT'
  | 'WEAPON_SELECT'
  | 'LEVEL_SELECT'
  | 'GAME';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('MENU');

  useEffect(() => {
    const activeRun = sessionStorage.getItem('currentRun');
    if (activeRun) {
      console.log('[App] Found active session on mount');
    }
  }, []);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const startGame = () => {
    const activeRun = sessionStorage.getItem('currentRun');
    
    if (!activeRun) {
      console.error('[App] Attempted to start game without valid session');
      navigateTo('LEVEL_SELECT');
      return;
    }

    console.log('[App] Starting game with session');
    navigateTo('GAME');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'MENU':
        return <MenuScene onNavigate={navigateTo} />;

      case 'CHAR_SELECT':
        return (
          <CharacterSelect
            onBack={() => navigateTo('MENU')}
            onStart={() => navigateTo('LEVEL_SELECT')}
          />
        );

      case 'WEAPON_SELECT':
        return (
          <WeaponSelect
            onBack={() => navigateTo('CHAR_SELECT')}
          />
        );

      case 'LEVEL_SELECT':
        return (
          <LevelSelect
            onBack={() => navigateTo('CHAR_SELECT')}
            onStart={startGame}
          />
        );

      case 'GAME':
        const activeRun = sessionStorage.getItem('currentRun');
        if (!activeRun) {
          console.warn('[App] Blocked GAME access: No currentRun');
          navigateTo('LEVEL_SELECT');
          return null;
        }
        return <GameCanvas />;

      default:
        return <MenuScene onNavigate={navigateTo} />;
    }
  };

  return (
    <TelegramProvider>
      <GameNoticeProvider>
        <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>
          {renderScreen()}
        </div>
      </GameNoticeProvider>
    </TelegramProvider>
  );
}
