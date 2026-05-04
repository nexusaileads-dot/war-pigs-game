import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { AppAlertProvider } from './components/AppAlertProvider';
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

const VALID_SCREENS: Screen[] = ['MENU', 'CHAR_SELECT', 'WEAPON_SELECT', 'LEVEL_SELECT', 'SHOP', 'PROFILE', 'GAME'];

export default function App() {
  const { initAuth, isLoading, user, refreshProfile } = useGameStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>('MENU');

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // Safe session resume check
  useEffect(() => {
    if (user && sessionStorage.getItem('hasActiveRun') === 'true') {
      setCurrentScreen('GAME');
    }
  }, [user]);

  // Validated navigation handler
  const navigateTo = (next: string) => {
    if (VALID_SCREENS.includes(next as Screen)) {
      setCurrentScreen(next as Screen);
    }
  };

  const handleGameExit = async () => {
    // Clear resume flag to prevent stuck state
    sessionStorage.removeItem('hasActiveRun');
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
      <AppAlertProvider>
        <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0a', color: '#ff6b35', fontFamily: 'monospace', letterSpacing: '0.05em', padding: '24px', boxSizing: 'border-box' }}>
          LOADING SWINE CORPS DATA...
        </div>
      </AppAlertProvider>
    );
  }

  if (!user) {
    return (
      <AppAlertProvider>
        <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0a', color: '#ff6b35', fontFamily: 'monospace', textAlign: 'center', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '520px', padding: '20px', border: '2px solid #ff6b35', borderRadius: '12px', background: '#141414' }}>
            {authFailedMessage}
          </div>
        </div>
      </AppAlertProvider>
    );
  }

  let screen: React.ReactNode;

  switch (currentScreen) {
    case 'MENU':
      screen = <MenuScene onNavigate={navigateTo} />;
      break;

    case 'CHAR_SELECT':
      screen = (
        <CharacterSelect
          onBack={() => navigateTo('MENU')}
          onStart={() => navigateTo('LEVEL_SELECT')}
        />
      );
      break;

    case 'WEAPON_SELECT':
      screen = <WeaponSelect onBack={() => navigateTo('MENU')} />;
      break;

    case 'LEVEL_SELECT':
      screen = (
        <LevelSelect
          onBack={() => navigateTo('CHAR_SELECT')}
          onStart={() => {
            sessionStorage.setItem('hasActiveRun', 'true');
            navigateTo('GAME');
          }}
        />
      );
      break;

    case 'SHOP':
      screen = <Shop onBack={() => navigateTo('MENU')} />;
      break;

    case 'PROFILE':
      screen = <Profile onBack={() => navigateTo('MENU')} />;
      break;

    case 'GAME':
      screen = <GameCanvas onExit={handleGameExit} />;
      break;

    default:
      screen = <MenuScene onNavigate={navigateTo} />;
      break;
  }

  // Providers are already mounted in main.tsx. Do not nest duplicates.
  return <AppAlertProvider>{screen}</AppAlertProvider>;
}
