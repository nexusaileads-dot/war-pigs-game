import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { BootScene } from './scenes/BootScene';
import { UIScene } from './scenes/UIScene';
import { gameConfig } from './config/gameConfig';
import { HUD } from '../components/HUD';

export const GameCanvas: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState('playing');

  useEffect(() => {
    if (!containerRef.current) return;

    const config = { ...gameConfig, parent: containerRef.current, scene: [BootScene, GameScene, UIScene] };
    const game = new Phaser.Game(config);

    const handleEvent = (e: any) => {
      if (e.detail?.type === 'STATE_CHANGE') setGameState(e.detail.state);
    };

    window.addEventListener('WAR_PIGS_EVENT', handleEvent);
    return () => {
      window.removeEventListener('WAR_PIGS_EVENT', handleEvent);
      game.destroy(true);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <HUD health={100} maxHealth={100} wpigs={0} />
      
      <button onClick={onExit} style={{ position: 'absolute', top: 10, right: 10, background: 'red', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer' }}>Exit</button>
      
      {(gameState === 'victory' || gameState === 'defeat') && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: gameState === 'victory' ? '#4caf50' : '#f44336' }}>{gameState.toUpperCase()}</h1>
          <button onClick={onExit} style={{ padding: '10px 20px', background: '#ff6b35', border: 'none', color: '#fff', borderRadius: '5px', marginTop: '20px' }}>Return</button>
        </div>
      )}
    </div>
  );
};
