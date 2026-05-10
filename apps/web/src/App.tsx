import React, { useEffect, useState } from 'react';
import { GameNoticeProvider } from './components/GameNoticeProvider';
import { LandscapeOverlay } from './components/LandscapeOverlay';
import { MenuScene } from './components/MenuScene';
import { CharacterSelect } from './components/CharacterSelect';
import { WeaponSelect } from './components/WeaponSelect';
import { LevelSelect } from './components/LevelSelect';
import { Shop } from './components/Shop';
import { PvPMenu } from './components/PvPMenu';
import { GameCanvas } from './game/GameCanvas'; 
import { PvPCanvas } from './game/PvPCanvas'; // ADDED THIS IMPORT
import { AuthScene } from './components/AuthScene';
import { useGameStore } from './store/gameStore';

type Screen =
  | 'MENU'
  | 'CHAR_SELECT'
  | 'WEAPON_SELECT'
  | 'LEVEL_SELECT'
  | 'SHOP'
  | 'PVP'
  | 'PVP_GAME'
  | 'GAME';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('MENU');
  const [pvpRoomData, setPvpRoomData] = useState<any>(null);
  const { user, token, isLoading, initAuth, logout } = useGameStore();

  // Initialize auth ONCE on mount
  useEffect(() => {
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Check for active PvE run on mount
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

  const startPvPGame = (roomData: any) => {
    setPvpRoomData(roomData);
    navigateTo('PVP_GAME');
  };

  if (isLoading) {
    return (
      <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', color: '#ff6b35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
        LOADING...
      </div>
    );
  }

  // If no user or token, show Auth
  if (!user || !token) {
    return (
      <GameNoticeProvider>
         <LandscapeOverlay />
         <AuthScene />
      </GameNoticeProvider>
    );
  }

  // Render Game Screens
  const renderScreen = () => {
    switch (currentScreen) {
      case 'MENU': return <MenuScene onNavigate={navigateTo} />;
      case 'CHAR_SELECT': return <CharacterSelect onBack={() => navigateTo('MENU')} onStart={() => navigateTo('WEAPON_SELECT')} />;
      case 'WEAPON_SELECT': return <WeaponSelect onBack={() => navigateTo('CHAR_SELECT')} onStart={() => navigateTo('LEVEL_SELECT')} />;
      case 'LEVEL_SELECT': return <LevelSelect onBack={() => navigateTo('WEAPON_SELECT')} onStart={startGame} />;
      case 'SHOP': return <Shop onBack={() => navigateTo('MENU')} />;
      case 'PVP': return <PvPMenu onBack={() => navigateTo('MENU')} onMatchFound={startPvPGame} />;
      case 'GAME':
        const activeRun = sessionStorage.getItem('currentRun');
        if (!activeRun) {
          navigateTo('LEVEL_SELECT');
          return null;
        }
        return <GameCanvas onExit={() => navigateTo('MENU')} />;
      case 'PVP_GAME':
        if (!pvpRoomData) {
          navigateTo('PVP');
          return null;
        }
        // FIX: Now mounts the actual PvP Canvas and passes the socket room data!
        return <PvPCanvas roomData={pvpRoomData} onExit={() => navigateTo('PVP')} />;
      default: return <MenuScene onNavigate={navigateTo} />;
    }
  };

  return (
    <GameNoticeProvider>
      <LandscapeOverlay />
      <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>
        {renderScreen()}
        {currentScreen !== 'GAME' && currentScreen !== 'PVP_GAME' && (
          <button 
            onClick={logout}
            style={{
              position: 'absolute', top: 20, right: 20, zIndex: 9999,
              background: '#333', color: '#fff', border: '2px solid #555',
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            LOGOUT
          </button>
        )}
      </div>
    </GameNoticeProvider>
  );
}
