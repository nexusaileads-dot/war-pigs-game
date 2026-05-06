import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameScene } from '../game/scenes/GameScene';

export const GameCanvas: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Prevent double initialization
    if (!containerRef.current || gameRef.current) return;

    // 1. Validate session before starting
    const sessionData = sessionStorage.getItem('currentRun');
    if (!sessionData) {
      setError('No active mission session found. Please deploy from the menu.');
      console.error('[GameCanvas] Session missing in sessionStorage');
      return;
    }

    try {
      // Parse session to verify it's valid JSON
      const session = JSON.parse(sessionData);
      if (!session?.run?.id || !session?.sessionToken) {
        throw new Error('Invalid session payload');
      }

      console.log('[GameCanvas] Initializing Phaser with session:', session.run.id);

      // 2. Phaser Configuration - MATCHES YOUR GameScene.ts REQUIREMENTS
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO, // Automatically picks WebGL or Canvas
        parent: containerRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#f0b66d', // Match your sky color
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          min: { width: 320, height: 480 },
          max: { width: 1920, height: 1080 }
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 1850 }, // Match your GRAVITY_Y constant
            debug: false
          }        },
        scene: [GameScene], // Your updated GameScene class
        autoFocus: true,
        input: {
          keyboard: true,
          mouse: true,
          touch: true
        },
        render: {
          pixelArt: false,
          antialias: true
        }
      };

      // 3. Create Game Instance
      console.log('[GameCanvas] Creating Phaser.Game instance...');
      gameRef.current = new Phaser.Game(config);

      // Listen for Phaser ready event
      gameRef.current.events.on('ready', () => {
        console.log('[GameCanvas] Phaser engine initialized successfully');
        setIsReady(true);
      });

      gameRef.current.events.on('start', () => {
        console.log('[GameCanvas] GameScene started');
      });

      gameRef.current.events.on('shutdown', () => {
        console.log('[GameCanvas] GameScene shutdown');
      });

      // 4. Handle Window Resizing
      const handleResize = () => {
        if (gameRef.current) {
          gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
        }
      };

      window.addEventListener('resize', handleResize);

      // 5. Cleanup on Unmount
      return () => {
        window.removeEventListener('resize', handleResize);
        if (gameRef.current) {
          console.log('[GameCanvas] Destroying Phaser instance');
          gameRef.current.destroy(true);
          gameRef.current = null;
        }
      };    } catch (err) {
      console.error('[GameCanvas] Initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize game engine');
    }
  }, []);

  // Error State UI
  if (error) {
    return (
      <div style={errorContainerStyle}>
        <div style={errorBoxStyle}>
          <h2 style={{ color: '#ff4444', marginBottom: '10px', fontSize: '20px' }}>MISSION ERROR</h2>
          <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '14px' }}>{error}</p>
          <button 
            onClick={() => {
              sessionStorage.removeItem('currentRun');
              window.location.reload();
            }} 
            style={retryButtonStyle}
          >
            RETURN TO MENU
          </button>
        </div>
      </div>
    );
  }

  // Loading State UI
  if (!isReady) {
    return (
      <div style={loadingContainerStyle}>
        <div style={{ color: '#ff6b35', fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
          DEPLOYING TO MISSION...
        </div>
      </div>
    );
  }

  // Active Game Canvas
  return (
    <div
      ref={containerRef}
      style={canvasContainerStyle}
      onContextMenu={(e) => e.preventDefault()} // Disable right-click context menu
    />
  );
};

// --- Styles ---
const errorContainerStyle: React.CSSProperties = {  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0a0a0a'
};

const errorBoxStyle: React.CSSProperties = {
  background: '#1a1111',
  border: '2px solid #5a1f1f',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center',
  maxWidth: '90%',
  width: '400px'
};

const retryButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#ff6b35',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontWeight: 'bold',
  fontSize: '14px',
  cursor: 'pointer',
  textTransform: 'uppercase'
};

const loadingContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0a0a0a'
};

const canvasContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#000',
  touchAction: 'none', // Prevents browser zoom/scroll on mobile
  overflow: 'hidden',
  position: 'relative'
};
