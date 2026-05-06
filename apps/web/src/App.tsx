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

  // Initialize auth on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Check for active run on mount (e.g., if user refreshes during a game)
  useEffect(() => {
    const activeRun = sessionStorage.getItem('currentRun');
    if (activeRun) {
      console.log('[App] Found active session on mount');
      // Optional: Resume game automatically
      // setCurrentScreen('GAME');
    }
  }, []);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  // STRICT GUARD: Validates session before allowing access to GAME screen
  const startGame = () => {
    const activeRun = sessionStorage.getItem('currentRun');
    
    if (!activeRun) {
      console.error('[App] Attempted to start game without valid session. Redirecting to Level Select.');
      navigateTo('LEVEL_SELECT');
      return;
    }

    console.log('[App] Starting game with session');
    navigateTo('GAME');
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  // Show Auth screen if not logged in
  if (!user || !token) {
    return (
      <TelegramProvider>
        <GameNoticeProvider>
           <AuthScene />
        </GameNoticeProvider>
      </TelegramProvider>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'MENU':        return <MenuScene onNavigate={navigateTo} />;

      case 'CHAR_SELECT':
        return (
          <CharacterSelect
            onBack={() => navigateTo('MENU')}
            // Flow: Select Character -> Select Weapon
            onStart={() => navigateTo('WEAPON_SELECT')}
          />
        );

      case 'WEAPON_SELECT':
        return (
          <WeaponSelect
            onBack={() => navigateTo('CHAR_SELECT')}
            // Flow: Select Weapon -> Select Level
            onStart={() => navigateTo('LEVEL_SELECT')}
          />
        );

      case 'LEVEL_SELECT':
        return (
          <LevelSelect
            onBack={() => navigateTo('WEAPON_SELECT')}
            // Flow: Deploy -> Start Game (after session created)
            onStart={startGame}
          />
        );

      case 'GAME':
        // STRICT GUARD: Prevents rendering GameCanvas if session is missing
        const activeRun = sessionStorage.getItem('currentRun');
        if (!activeRun) {
          console.warn('[App] Blocked GAME access: No currentRun in sessionStorage.');
          navigateTo('LEVEL_SELECT');
          return null;
        }

        // Render the actual Phaser game
        return <GameCanvas onExit={() => navigateTo('MENU')} />;

      default:
        return <MenuScene onNavigate={navigateTo} />;
    }
  };

  return (
    <TelegramProvider>
      <GameNoticeProvider>
        <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>
          {renderScreen()}
          {/* Logout button for testing */}
          <button 
            onClick={logout}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              border: '1px solid #333',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </GameNoticeProvider>
    </TelegramProvider>
  );
}
