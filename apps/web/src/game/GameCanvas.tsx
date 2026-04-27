import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { useGameStore } from '../store/gameStore';
import { useGameNotice } from '../components/GameNoticeProvider';

type WarPigsEventDetail =
  | {
      type: 'STATE_CHANGE';
      state?: 'victory' | 'defeat' | 'paused';
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

  const [isPaused, setIsPaused] = useState(false);
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : GAME_BASE_WIDTH,
    height: typeof window !== 'undefined' ? window.innerHeight : GAME_BASE_HEIGHT
  });

  const { refreshProfile } = useGameStore();
  const { showNotice } = useGameNotice();

  const isLandscape = viewport.width >= viewport.height;

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
      showNotice({
        title: 'No Active Mission',
        message: 'No active mission session was found.',
        variant: 'warning'
      });

      void onExit();
      return;
    }

    try {
      JSON.parse(runDataRaw);
    } catch (error) {
      console.error('[GameCanvas] Invalid currentRun JSON:', error);
      sessionStorage.removeItem('currentRun');

      showNotice({
        title: 'Mission Error',
        message: 'Mission session data is corrupted.',
        variant: 'error'
      });

      void onExit();
      return;
    }

    isExitingRef.current = false;
    setIsPaused(false);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#000000',
      pixelArt: false,
      antialias: true,
      roundPixels: false,
      width: GAME_BASE_WIDTH,
      height: GAME_BASE_HEIGHT,
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
        activePointers: 5
      },
      scene: [BootScene, GameScene]
    };

    try {
      gameRef.current = new Phaser.Game(config);
    } catch (error) {
      console.error('[GameCanvas] Failed to create Phaser game:', error);

      showNotice({
        title: 'Game Failed',
        message: 'The mission could not be started.',
        variant: 'error'
      });

      void onExit();
      return;
    }

    const handleResize = () => {
      if (!gameRef.current) return;
      gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const handleGameEvent = async (event: Event) => {
      const customEvent = event as CustomEvent<WarPigsEventDetail>;
      const detail = customEvent.detail;

      if (!detail || isExitingRef.current) return;

      if (detail.type === 'PLAYER_HIT') {
        return;
      }

      if (detail.type === 'KILLS_UPDATE') {
        return;
      }

      if (detail.type === 'STATE_CHANGE') {
        if (detail.state === 'paused') {
          setIsPaused(true);
          return;
        }

        isExitingRef.current = true;
        sessionStorage.removeItem('currentRun');

        if (detail.state === 'victory') {
          try {
            await refreshProfile();
          } catch (error) {
            console.error('[GameCanvas] Failed to refresh profile after victory:', error);
          }

          if (isMountedRef.current) {
            showNotice({
              title: 'Mission Accomplished',
              message: '+$PIGS added to your armory.',
              variant: 'success'
            });
          }

          await onExit();
          return;
        }

        if (detail.state === 'defeat') {
          if (isMountedRef.current) {
            showNotice({
              title: 'Mission Failed',
              message: 'Your squad was eliminated.',
              variant: 'error'
            });
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
  }, [isLandscape, onExit, refreshProfile, showNotice]);

  const resumeGame = () => {
    if (!gameRef.current) return;

    const scene = gameRef.current.scene.getScene('GameScene');

    if (scene?.scene?.isPaused()) {
      scene.scene.resume();
    }

    setIsPaused(false);
  };

  const quitMission = async () => {
    if (isExitingRef.current) return;

    isExitingRef.current = true;
    sessionStorage.removeItem('currentRun');

    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    await onExit();
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
    >
      {!isLandscape ? (
        <RotateDeviceScreen />
      ) : (
        <>
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

          {isPaused ? <PauseOverlay onResume={resumeGame} onQuit={() => void quitMission()} /> : null}
        </>
      )}
    </div>
  );
};

const RotateDeviceScreen: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 70%)',
        boxSizing: 'border-box'
      }}
    >
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
          War Pigs side-scroller missions are optimized for landscape mode.
        </div>
      </div>
    </div>
  );
};

const PauseOverlay: React.FC<{
  onResume: () => void;
  onQuit: () => void;
}> = ({ onResume, onQuit }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: '22px',
          borderRadius: '18px',
          border: '2px solid #ff6b35',
          background: 'linear-gradient(180deg, #1d1d1d 0%, #090909 100%)',
          boxShadow: '0 18px 44px rgba(255,107,53,0.25)',
          color: '#fff',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            fontSize: '28px',
            fontWeight: 900,
            color: '#ff6b35',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}
        >
          Paused
        </div>

        <div
          style={{
            fontSize: '14px',
            color: '#bdbdbd',
            marginBottom: '18px'
          }}
        >
          Mission is on standby.
        </div>

        <button
          type="button"
          onClick={onResume}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '12px',
            border: 'none',
            background: '#ff6b35',
            color: '#fff',
            fontWeight: 900,
            fontSize: '15px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          Resume
        </button>

        <button
          type="button"
          onClick={onQuit}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '2px solid #555',
            background: '#151515',
            color: '#ddd',
            fontWeight: 900,
            fontSize: '15px',
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Quit Mission
        </button>
      </div>
    </div>
  );
};
