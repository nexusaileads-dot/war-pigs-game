import React, { useEffect, useState } from 'react';
import { GameNoticeProvider } from './components/GameNoticeProvider';
import { TelegramProvider } from './components/TelegramProvider';
import { MenuScene } from './components/MenuScene';
import { CharacterSelect } from './components/CharacterSelect';
import { WeaponSelect } from './components/WeaponSelect';
import { LevelSelect } from './components/LevelSelect';

// TODO: Import your actual Game component.
// Based on your error logs, this component is likely named GameCanvas.
// import { GameCanvas } from './components/GameCanvas';

type Screen =
  | 'MENU'
  | 'CHAR_SELECT'
  | 'WEAPON_SELECT'
  | 'LEVEL_SELECT'
  | 'GAME';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('MENU');

  // Optional: Check for active run on mount to resume if needed
  useEffect(() => {
    const activeRun = sessionStorage.getItem('currentRun');
    if (activeRun) {
      // You can auto-resume here if desired:
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

    // Session verified, proceed to game
    navigateTo('GAME');
  };

  const renderScreen = () => {    switch (currentScreen) {
      case 'MENU':
        return <MenuScene onNavigate={navigateTo} />;

      case 'CHAR_SELECT':
        return (
          <CharacterSelect
            onBack={() => navigateTo('MENU')}
            // Flow: MENU → CHAR_SELECT → LEVEL_SELECT
            // Assuming CharacterSelect leads to LevelSelect once loadout is ready
            onStart={() => navigateTo('LEVEL_SELECT')}
          />
        );

      case 'WEAPON_SELECT':
        return (
          <WeaponSelect
            onBack={() => navigateTo('CHAR_SELECT')}
            // Note: Your WeaponSelect component currently only accepts onBack.
            // If you need a "Next" button here, update the component props.
          />
        );

      case 'LEVEL_SELECT':
        return (
          <LevelSelect
            onBack={() => navigateTo('CHAR_SELECT')}
            // LevelSelect calls this ONLY after successfully creating a session
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

        // TODO: Replace with your actual Game component
        // return <GameCanvas />;
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
            <h2>GAME CANVAS PLACEHOLDER</h2>
          </div>
        );

      default:        return <MenuScene onNavigate={navigateTo} />;
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
