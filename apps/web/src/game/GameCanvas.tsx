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
  const { user } = useGameStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scene: [BootScene, GameScene]
    };

    gameRef.current = new Phaser.Game(config);

    const handleGameEvent = (e: any) => {
      if (e.detail.type === 'STATE_CHANGE' && e.detail.state === 'victory') {
        alert("MISSION ACCOMPLISHED! +$PIGS added to armory.");
        onExit();
      }
      if (e.detail.type === 'PLAYER_HIT') {
        setHealth((prev) => {
          const newHealth = Math.max(0, prev - 10);
          if (newHealth <= 0) {
            alert("KIA. Mission Failed.");
            onExit();
          }
          return newHealth;
        });
      }
    };

    window.addEventListener('WAR_PIGS_EVENT', handleGameEvent);

    return () => {
      window.removeEventListener('WAR_PIGS_EVENT', handleGameEvent);
      gameRef.current?.destroy(true);
    };
  }, [onExit]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000' }}>
      <div ref={containerRef} style={{ width: '800px', height: '600px', overflow: 'hidden', border: '2px solid #ff6b35' }} />
      <HUD health={health} maxHealth={100} pigs={user?.profile.currentPigs || 0} />
    </div>
  );
};