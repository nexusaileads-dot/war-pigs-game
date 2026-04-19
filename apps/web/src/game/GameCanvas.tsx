import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HUD } from '../components/HUD';
import { useGameStore } from '../store/gameStore';

export const GameCanvas: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [health, setHealth] = useState(100);
  const { user, refreshProfile } = useGameStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const runDataRaw = sessionStorage.getItem('currentRun');
    if (!runDataRaw) {
      alert('No active mission found.');
      void onExit();
      return;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      backgroundColor: '#000000',
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      },
      scene: [BootScene, GameScene]
    };

    gameRef.current = new Phaser.Game(config);

    const handleGameEvent = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        type: 'STATE_CHANGE' | 'PLAYER_HIT';
        state?: 'victory' | 'defeat';
        damage?: number;
      }>;

      if (customEvent.detail.type === 'STATE_CHANGE') {
        if (customEvent.detail.state === 'victory') {
          await refreshProfile();
          alert('MISSION ACCOMPLISHED! +$PIGS added to armory.');
          sessionStorage.removeItem('currentRun');
          await onExit();
          return;
        }

        if (customEvent.detail.state === 'defeat') {
          sessionStorage.removeItem('currentRun');
          alert('KIA. Mission Failed.');
          await onExit();
          return;
        }
      }

      if (customEvent.detail.type === 'PLAYER_HIT') {
        setHealth((prev) => {
          const damage = customEvent.detail.damage ?? 10;
          const nextHealth = Math.max(0, prev - damage);

          if (nextHealth <= 0) {
            window.dispatchEvent(
              new CustomEvent('WAR_PIGS_EVENT', {
                detail: {
                  type: 'STATE_CHANGE',
                  state: 'defeat'
                }
              })
            );
          }

          return nextHealth;
        });
      }
    };

    window.addEventListener('WAR_PIGS_EVENT', handleGameEvent);

    return () => {
      window.removeEventListener('WAR_PIGS_EVENT', handleGameEvent);
      gameRef.current?.destroy(true);
      gameRef.current = null;
      setHealth(100);
    };
  }, [onExit, refreshProfile]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#000'
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '800px',
          height: '600px',
          overflow: 'hidden',
          border: '2px solid #ff6b35'
        }}
      />
      <HUD health={health} maxHealth={100} pigs={user?.profile.currentPigs || 0} />
    </div>
  );
};
