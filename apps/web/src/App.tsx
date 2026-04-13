import React, { useEffect, useState } from 'react';
import { TelegramProvider } from './components/TelegramProvider';
import { GameCanvas } from './game/GameCanvas';
import { Profile } from './components/Profile';
import { Shop } from './components/Shop';
import { CharacterSelect } from './components/CharacterSelect';
import { WeaponSelect } from './components/WeaponSelect';
import { LevelSelect } from './components/LevelSelect';
import { apiClient } from './api/client';

type Screen = 'MENU' | 'GAME' | 'PROFILE' | 'SHOP' | 'CHAR_SELECT' | 'WEAPON_SELECT' | 'LEVEL_SELECT';

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('MENU');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const tg = window.Telegram?.WebApp;
        if (tg?.initData) {
          const { data } = await apiClient.post('/api/auth/telegram', { initData: tg.initData });
          localStorage.setItem('token', data.token);
          setUser(data.user);
        } else if (import.meta.env.DEV) {
          const { data } = await apiClient.get('/api/auth/me');
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff6b35' }}>🐷 Loading...</div>;
  }

  if (!user) {
    return <div style={{ textAlign: 'center', color: '#fff', paddingTop: '50px' }}>⚠️ Failed to authenticate via Telegram.</div>;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'GAME': return <GameCanvas onExit={() => setCurrentScreen('MENU')} />;
      case 'PROFILE': return <Profile onBack={() => setCurrentScreen('MENU')} />;
      case 'SHOP': return <Shop onBack={() => setCurrentScreen('MENU')} />;
      case 'CHAR_SELECT': return <CharacterSelect onBack={() => setCurrentScreen('MENU')} onStart={() => setCurrentScreen('LEVEL_SELECT')} />;
      case 'WEAPON_SELECT': return <WeaponSelect onBack={() => setCurrentScreen('MENU')} />;
      case 'LEVEL_SELECT': return <LevelSelect onBack={() => setCurrentScreen('CHAR_SELECT')} onStart={() => setCurrentScreen('GAME')} />;
      default: return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
          <h1 style={{ color: '#ff6b35' }}>WAR PIGS</h1>
          <button onClick={() => setCurrentScreen('CHAR_SELECT')} style={btnStyle}>DEPLOY</button>
          <button onClick={() => setCurrentScreen('PROFILE')} style={btnStyle}>PROFILE</button>
          <button onClick={() => setCurrentScreen('SHOP')} style={btnStyle}>ARMORY</button>
        </div>
      );
    }
  };

  return <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>{renderScreen()}</div>;
}

const btnStyle = { padding: '15px 30px', background: '#333', color: '#fff', border: '2px solid #ff6b35', borderRadius: '8px', cursor: 'pointer', width: '200px', fontWeight: 'bold' };

export default function App() {
  return (
    <TelegramProvider>
      <AppContent />
    </TelegramProvider>
  );
}
