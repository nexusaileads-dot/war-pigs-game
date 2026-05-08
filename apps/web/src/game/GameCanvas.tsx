import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

type GameCanvasProps = {
  onExit?: () => void | Promise<void>;
};

// Define a fixed landscape resolution for the game (16:9 aspect ratio)
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

export const GameCanvas: React.FC<GameCanvasProps> = ({ onExit }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isExitingRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const sessionData = sessionStorage.getItem('currentRun');

    if (!sessionData) {
      setError('No active mission session found. Deploy from the mission screen.');
      console.error('[GameCanvas] Missing currentRun in sessionStorage');
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      if (!session?.run?.id || !session?.sessionToken) {
        throw new Error('Invalid mission session payload.');
      }
      console.log('[GameCanvas] Starting mission:', session.run.id);
    } catch (err) {
      console.error('[GameCanvas] Invalid currentRun:', err);
      sessionStorage.removeItem('currentRun');
      setError('Mission session data is invalid.');
      return;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#1a1a1a',
      scale: {
        mode: Phaser.Scale.FIT,        // Fit the game within the screen, maintaining aspect ratio
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center it
        width: GAME_WIDTH,
        height: GAME_HEIGHT
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 1850 },
          debug: false
        }
      },
      input: {
        activePointers: 3
      },
      scene: [BootScene, GameScene]
    };

    try {
      gameRef.current = new Phaser.Game(config);
      setIsBooting(false);
    } catch (err) {
      console.error('[GameCanvas] Failed to initialize Phaser:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize game engine.');
      return;
    }

    const handleGameEvent = async (event: Event) => {
      const customEvent = event as CustomEvent<{ type?: string; state?: 'victory' | 'defeat' | 'paused' }>;
      const detail = customEvent.detail;

      if (!detail || isExitingRef.current) return;
      if (detail.type !== 'STATE_CHANGE') return;
      if (detail.state === 'paused') return;

      if (detail.state === 'victory' || detail.state === 'defeat') {
        isExitingRef.current = true;
        sessionStorage.removeItem('currentRun');

        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
        }

        if (onExit) {
          await onExit();
        }
      }
    };

    window.addEventListener('WAR_PIGS_EVENT', handleGameEvent);

    return () => {
      window.removeEventListener('WAR_PIGS_EVENT', handleGameEvent);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onExit]);

  const returnToMenu = async () => {
    sessionStorage.removeItem('currentRun');
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    if (onExit) {
      await onExit();
      return;
    }
    window.location.reload();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />

      {isBooting && !error ? (
        <div style={overlayStyle}>
          <div style={{ color: '#ff6b35', fontSize: '24px', fontWeight: 900 }}>
            DEPLOYING...
          </div>
        </div>
      ) : null}

      {error ? (
        <div style={overlayStyle}>
          <div style={errorBoxStyle}>
            <h2 style={{ color: '#ff4444', margin: '0 0 10px' }}>ERROR</h2>
            <p style={{ color: '#ccc', margin: '0 0 20px' }}>{error}</p>
            <button type="button" onClick={() => void returnToMenu()} style={buttonStyle}>
              Return to Menu
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0a0a0a',
  padding: '20px'
};

const errorBoxStyle: React.CSSProperties = {
  background: '#1a1111',
  border: '2px solid #5a1f1f',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center',
  width: '400px'
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#ff6b35',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontWeight: 900,
  cursor: 'pointer'
};
