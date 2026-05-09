import React, { useEffect, useState } from 'react';
import { GameNoticeProvider } from './components/GameNoticeProvider';
import { TelegramProvider } from './components/TelegramProvider';
import { MenuScene } from './components/MenuScene';
import { CharacterSelect } from './components/CharacterSelect';
import { WeaponSelect } from './components/WeaponSelect';
import { LevelSelect } from './components/LevelSelect';
import { GameCanvas } from './components/GameCanvas';
import { AuthScene } from './components/AuthScene';
import { useGameStore } from './store/gameStore';

type Screen =
  | 'MENU'
  | 'CHAR_SELECT'
  | 'WEAPON_SELECT'
  | 'LEVEL_SELECT'
  | 'GAME';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('MENU');
  const { user, token, isLoading, initAuth, logout } = useGameStore();

  // Initialize auth ONCE on mount
  useEffect(() => {
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array ensures this runs only once

  // Check for active run on mount
  useEffect(() => {
    const activeRun = sessionStorage.getItem('currentRun');
    if (activeRun && user) {
      // Optional: Resume game automatically
      // setCurrentScreen('GAME');
    }
  }, [user]);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const startGame = () => {
    const activeRun = sessionStorage.getItem('currentRun');
    if (!activeRun) {
      console.error('[App] Attempted to start game without valid session.');
      navigateTo('LEVEL_SELECT');
      return;
    }
    navigateTo('GAME');
  };

  if (isLoading) {
    return (
      <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  // If no user or token, show Auth
  if (!user || !token) {
    return (
      <TelegramProvider>
        <GameNoticeProvider>
           <AuthScene />
        </GameNoticeProvider>
      </TelegramProvider>
    );
  }

  // Render Game Screens
  const renderScreen = () => {
    switch (currentScreen) {
      case 'MENU': return <MenuScene onNavigate={navigateTo} />;
      case 'CHAR_SELECT': return <CharacterSelect onBack={() => navigateTo('MENU')} onStart={() => navigateTo('WEAPON_SELECT')} />;
      case 'WEAPON_SELECT': return <WeaponSelect onBack={() => navigateTo('CHAR_SELECT')} onStart={() => navigateTo('LEVEL_SELECT')} />;
      case 'LEVEL_SELECT': return <LevelSelect onBack={() => navigateTo('WEAPON_SELECT')} onStart={startGame} />;
      case 'GAME':
        const activeRun = sessionStorage.getItem('currentRun');
        if (!activeRun) {
          navigateTo('LEVEL_SELECT');
          return null;
        }
        return <GameCanvas onExit={() => navigateTo('MENU')} />;
      default: return <MenuScene onNavigate={navigateTo} />;
    }
  };

  return (
    <TelegramProvider>
      <GameNoticeProvider>
        <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>
          {renderScreen()}
          <button 
            onClick={logout}
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 9999,
              background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #333',
              padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </GameNoticeProvider>
    </TelegramProvider>
  );
}
