import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameScene } from '../game/scenes/GameScene';

type GameCanvasProps = {
  onExit?: () => void | Promise<void>;
};

export const GameCanvas: React.FC<GameCanvasProps> = ({ onExit }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isExitingRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const sessionData = sessionStorage.getItem('currentRun');

    if (!sessionData) {
      setError('No active mission session found. Please deploy from the mission screen.');
      console.error('[GameCanvas] Missing currentRun in sessionStorage');
      return;
    }

    try {
      const session = JSON.parse(sessionData);

      if (!session?.run?.id || !session?.sessionToken) {
        throw new Error('Invalid mission session payload.');
      }

      console.log('[GameCanvas] Starting Phaser mission:', session.run.id);
    } catch (err) {
      console.error('[GameCanvas] Invalid currentRun:', err);
      sessionStorage.removeItem('currentRun');
      setError('Mission session data is invalid.');
      return;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#000000',
      pixelArt: false,
      antialias: true,      roundPixels: false,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
        width: window.innerWidth,
        height: window.innerHeight
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: {
            x: 0,
            y: 1850
          },
          debug: false
        }
      },
      input: {
        activePointers: 5,
        keyboard: true,
        mouse: true,
        touch: true
      },
      render: {
        pixelArt: false,
        antialias: true
      },
      scene: [GameScene]
    };

    try {
      gameRef.current = new Phaser.Game(config);
      setIsReady(true);
    } catch (err) {
      console.error('[GameCanvas] Failed to initialize Phaser:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize game engine.');
      return;
    }

    const handleResize = () => {
      if (!gameRef.current) return;

      gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
    };

    const handleGameEvent = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        type?: string;
        state?: 'victory' | 'defeat' | 'paused';
      }>;
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

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('WAR_PIGS_EVENT', handleGameEvent);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
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
      await onExit();      return;
    }

    window.location.reload();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#000',
        touchAction: 'none',
        userSelect: 'none'
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#000',
          touchAction: 'none'
        }}
      />

      {!isReady && !error ? (
        <div style={overlayStyle}>
          <div
            style={{
              color: '#ff6b35',
              fontSize: '24px',
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            Deploying to Mission...
          </div>
        </div>
      ) : null}

      {error ? (        <div style={overlayStyle}>
          <div style={errorBoxStyle}>
            <h2
              style={{
                color: '#ff4444',
                margin: '0 0 10px',
                fontSize: '20px',
                textTransform: 'uppercase'
              }}
            >
              Mission Error
            </h2>

            <p
              style={{
                color: '#ccc',
                margin: '0 0 20px',
                fontSize: '14px',
                lineHeight: 1.45
              }}
            >
              {error}
            </p>

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
  padding: '20px',
  boxSizing: 'border-box'
};

const errorBoxStyle: React.CSSProperties = {
  background: '#1a1111',
  border: '2px solid #5a1f1f',
  borderRadius: '12px',  padding: '24px',
  textAlign: 'center',
  maxWidth: '90%',
  width: '400px'
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#ff6b35',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontWeight: 900,
  fontSize: '14px',
  cursor: 'pointer',
  textTransform: 'uppercase'
};
