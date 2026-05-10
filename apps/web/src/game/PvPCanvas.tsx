import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { PvPScene } from './scenes/PvPScene';

type PvPCanvasProps = {
  roomData: any;
  onExit: () => void;
};

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

export const PvPCanvas: React.FC<PvPCanvasProps> = ({ roomData, onExit }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#1a1a1a',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 1400 },
          debug: false
        }
      },
      input: { activePointers: 3 },
      scene: [PvPScene] // Load only the PvP Scene
    };

    try {
      const game = new Phaser.Game(config);
      gameRef.current = game;

      // Start the scene and pass the matchmaking room data into it
      game.scene.start('PvPScene', { roomData });
    } catch (err) {
      console.error('[PvPCanvas] Failed to initialize Phaser:', err);
      setError('Failed to initialize PvP Engine.');
    }

    const handlePvPEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === 'PVP_EXIT') {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
        }
        onExit();
      }
    };

    window.addEventListener('WAR_PIGS_PVP_EVENT', handlePvPEvent);

    return () => {
      window.removeEventListener('WAR_PIGS_PVP_EVENT', handlePvPEvent);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [roomData, onExit]);

  if (error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#ff4444', flexDirection: 'column' }}>
        <h2>{error}</h2>
        <button onClick={onExit} style={{ padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #ff6b35', borderRadius: 8, cursor: 'pointer' }}>RETURN TO MENU</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
    
