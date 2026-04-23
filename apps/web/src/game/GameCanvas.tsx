import React, { useEffect, useRef, useState } from 'react';
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

export const GameCanvas: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const isMountedRef = useRef(false);
  const isExitingRef = useRef(false);

  const [health, setHealth] = useState(100);
  const [kills, setKills] = useState(0);

  const { user, refreshProfile } = useGameStore();

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
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
      width: 800,
      height: 600,
      parent: containerRef.current,
      backgroundColor: '#000000',
      pixelArt: false,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
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

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onExit, refreshProfile]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 70%)',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '800px',
          height: '600px',
          maxWidth: '100%',
          overflow: 'hidden',
          border: '2px solid #ff6b35',
          boxShadow: '0 0 24px rgba(255, 107, 53, 0.35)',
          borderRadius: '8px',
          background: '#000'
        }}
      />
      <HUD
        health={health}
        maxHealth={100}
        pigs={user?.profile.currentPigs || 0}
        kills={kills}
      />
    </div>
  );
};
