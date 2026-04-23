import React, { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HUD } from '../components/HUD';
import { useGameStore } from '../store/gameStore';

type WarPigsEventDetail =
  | {
      type: 'STATE_CHANGE';
      state?: 'victory' | 'defeat';
    }
  | {
      type: 'PLAYER_HIT';
      damage?: number;
    }
  | {
      type: 'KILLS_UPDATE';
      kills?: number;
    };

const GAME_BASE_WIDTH = 1600;
const GAME_BASE_HEIGHT = 900;

export const GameCanvas: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const isMountedRef = useRef(false);
  const isExitingRef = useRef(false);

  const [health, setHealth] = useState(100);
  const [kills, setKills] = useState(0);
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : GAME_BASE_WIDTH,
    height: typeof window !== 'undefined' ? window.innerHeight : GAME_BASE_HEIGHT
  });

  const { user, refreshProfile } = useGameStore();

  const isLandscape = viewport.width >= viewport.height;
  const frameSize = useMemo(() => {
    const availableWidth = Math.max(320, viewport.width - 16);
    const availableHeight = Math.max(240, viewport.height - 16);
    const aspect = GAME_BASE_WIDTH / GAME_BASE_HEIGHT;

    let width = availableWidth;
    let height = width / aspect;

    if (height > availableHeight) {
      height = availableHeight;
      width = height * aspect;
    }

    return {
      width: Math.floor(width),
      height: Math.floor(height)
    };
  }, [viewport.height, viewport.width]);

  useEffect(() => {
    isMountedRef.current = true;

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!isLandscape) return;
    if (!containerRef.current) return;
    if (gameRef.current) return;

    const runDataRaw = sessionStorage.getItem('currentRun');
    if (!runDataRaw) {
      alert('No active mission found.');
      void onExit();
      return;
    }

    try {
      JSON.parse(runDataRaw);
    } catch (error) {
      console.error('[GameCanvas] Invalid currentRun JSON:', error);
      sessionStorage.removeItem('currentRun');
      alert('Mission session is corrupted.');
      void onExit();
      return;
    }

    setHealth(100);
    setKills(0);
    isExitingRef.current = false;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#000000',
      pixelArt: false,
      width: GAME_BASE_WIDTH,
      height: GAME_BASE_HEIGHT,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_BASE_WIDTH,
        height: GAME_BASE_HEIGHT
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      },
      scene: [BootScene, GameScene]
    };

    try {
      gameRef.current = new Phaser.Game(config);
    } catch (error) {
      console.error('[GameCanvas] Failed to create Phaser game:', error);
      alert('Game failed to start.');
      void onExit();
      return;
    }

    const handleResize = () => {
      if (!gameRef.current) return;
      gameRef.current.scale.refresh();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const handleGameEvent = async (event: Event) => {
      const customEvent = event as CustomEvent<WarPigsEventDetail>;
      const detail = customEvent.detail;

      if (!detail || isExitingRef.current) return;

      if (detail.type === 'PLAYER_HIT') {
        setHealth((prev) => Math.max(0, prev - (detail.damage ?? 10)));
        return;
      }

      if (detail.type === 'KILLS_UPDATE') {
        setKills(detail.kills ?? 0);
        return;
      }

      if (detail.type === 'STATE_CHANGE') {
        isExitingRef.current = true;
        sessionStorage.removeItem('currentRun');

        if (detail.state === 'victory') {
          try {
            await refreshProfile();
          } catch (error) {
            console.error('[GameCanvas] Failed to refresh profile after victory:', error);
          }

          if (isMountedRef.current) {
            alert('MISSION ACCOMPLISHED! +$PIGS added to armory.');
          }

          await onExit();
          return;
        }

        if (detail.state === 'defeat') {
          if (isMountedRef.current) {
            alert('KIA. Mission Failed.');
          }

          await onExit();
        }
      }
    };

    window.addEventListener('WAR_PIGS_EVENT', handleGameEvent);

    return () => {
      window.removeEventListener('WAR_PIGS_EVENT', handleGameEvent);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [isLandscape, onExit, refreshProfile]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        height: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 70%)',
        padding: '8px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {!isLandscape ? (
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '28px 22px',
            border: '2px solid #ff6b35',
            borderRadius: '16px',
            background: 'rgba(0,0,0,0.82)',
            boxShadow: '0 0 24px rgba(255, 107, 53, 0.28)',
            textAlign: 'center',
            color: '#fff'
          }}
        >
          <div
            style={{
              fontSize: '42px',
              marginBottom: '14px'
            }}
          >
            ↺
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#ff6b35',
              marginBottom: '10px',
              textTransform: 'uppercase'
            }}
          >
            Rotate Device
          </div>
          <div
            style={{
              fontSize: '15px',
              lineHeight: 1.5,
              color: '#cfcfcf'
            }}
          >
            War Pigs is now optimized for landscape mode for movement, aiming, and camera tracking.
          </div>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: `${frameSize.width}px`,
              height: `${frameSize.height}px`,
              overflow: 'hidden',
              border: '2px solid #ff6b35',
              boxShadow: '0 0 24px rgba(255, 107, 53, 0.35)',
              borderRadius: '10px',
              background: '#000',
              flexShrink: 0
            }}
          />
          <HUD
            health={health}
            maxHealth={100}
            pigs={user?.profile.currentPigs || 0}
            kills={kills}
          />
        </>
      )}
    </div>
  );
};
