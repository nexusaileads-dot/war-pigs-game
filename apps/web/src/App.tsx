import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { MenuScene } from './components/MenuScene';
import { CharacterSelect } from './components/CharacterSelect';
import { WeaponSelect } from './components/WeaponSelect';
import { Shop } from './components/Shop';
import { Profile } from './components/Profile';
import { GameCanvas } from './game/GameCanvas';

export default function App() {
  const { initAuth, isLoading, user } = useGameStore();
  const [currentScreen, setCurrentScreen] = useState('MENU');

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0a', color: '#ff6b35', fontFamily: 'monospace' }}>
        LOADING SWINE CORPS DATA...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0a', color: '#ff6b35', fontFamily: 'monospace' }}>
        AUTH FAILED. LAUNCH VIA TELEGRAM.
      </div>
    );
  }

  switch (currentScreen) {
    case 'MENU':
      return <MenuScene onNavigate={setCurrentScreen} />;
    case 'CHAR_SELECT':
      return <CharacterSelect onBack={() => setCurrentScreen('MENU')} onStart={() => setCurrentScreen('GAME')} />;
    case 'WEAPON_SELECT':
      return <WeaponSelect onBack={() => setCurrentScreen('MENU')} />;
    case 'SHOP':
      return <Shop onBack={() => setCurrentScreen('MENU')} />;
    case 'PROFILE':
      return <Profile onBack={() => setCurrentScreen('MENU')} />;
    case 'GAME':
      return <GameCanvas onExit={() => setCurrentScreen('MENU')} />;
    default:
      return <MenuScene onNavigate={setCurrentScreen} />;
  }
}