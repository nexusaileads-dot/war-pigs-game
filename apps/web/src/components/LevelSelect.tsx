import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface Level {
  id: string;
  levelNumber: number;
  name: string;
  description: string;
  difficulty: number;
  waves: number;
  baseReward: number;
  unlockRequirement: number;
  unlocked: boolean;
  completed: boolean;
  isBossLevel?: boolean;
}

export const LevelSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({
  onBack,
  onStart
}) => {
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingLevelId, setStartingLevelId] = useState<string | null>(null);

  useEffect(() => {
    const loadLevels = async () => {
      try {
        const res = await apiClient.get('/api/game/levels');
        setLevels(res.data);
      } catch (error) {
        console.error('Failed to load levels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadLevels();
  }, []);

  const handleStart = async (levelId: string) => {
    try {
      setStartingLevelId(levelId);

      const inventoryRes = await apiClient.get('/api/inventory');
      const { equipped } = inventoryRes.data;

      if (!equipped?.characterId || !equipped?.weaponId) {
        alert('Equip a character and weapon before deploying.');
        return;
      }

      const startRes = await apiClient.post('/api/game/start', {
        levelId,
        characterId: equipped.characterId,
        weaponId: equipped.weaponId
      });

      sessionStorage.setItem('currentRun', JSON.stringify(startRes.data));
      onStart();
    } catch (error) {
      console.error('Failed to start mission:', error);
      alert('Failed to start mission.');
    } finally {
      setStartingLevelId(null);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0a0a0a'
        }}
      >
        LOADING MISSIONS...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        color: '#fff',
        height: '100%',
        overflowY: 'auto',
        background: '#0a0a0a'
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          background: '#444',
          border: '2px solid #ff6b35',
          color: '#fff',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        BACK
      </button>

      <h2
        style={{
          textAlign: 'center',
          color: '#ff6b35',
          marginBottom: '20px',
          textTransform: 'uppercase'
        }}
      >
        Select Mission
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {levels.map((level) => {
          const isStarting = startingLevelId === level.id;

          return (
            <div
              key={level.id}
              style={{
                background: level.unlocked ? '#222' : '#111',
                padding: '16px',
                borderRadius: '12px',
                border: `2px solid ${level.unlocked ? '#333' : '#222'}`,
                opacity: level.unlocked ? 1 : 0.55
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>
                    Mission {level.levelNumber}: {level.name}
                  </h3>
                  <p style={{ margin: '0 0 8px 0', color: '#bbb', fontSize: '14px' }}>
                    {level.description}
                  </p>
                  <div style={{ fontSize: '12px', color: '#999', lineHeight: 1.6 }}>
                    <div>Difficulty: {level.difficulty}</div>
                    <div>Waves: {level.waves}</div>
                    <div>Base Reward: {level.baseReward} $PIGS</div>
                    {level.isBossLevel ? <div>BOSS MISSION</div> : null}
                    {!level.unlocked ? (
                      <div>Requires Level {level.unlockRequirement}</div>
                    ) : level.completed ? (
                      <div style={{ color: '#4caf50' }}>Completed</div>
                    ) : null}
                  </div>
                </div>

                {level.unlocked ? (
                  <button
                    onClick={() => void handleStart(level.id)}
                    disabled={isStarting}
                    style={{
                      minWidth: '100px',
                      padding: '10px 14px',
                      background: isStarting ? '#555' : '#ff6b35',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isStarting ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {isStarting ? 'DEPLOYING...' : 'DEPLOY'}
                  </button>
                ) : (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#1a1a1a',
                      color: '#777',
                      borderRadius: '8px',
                      fontWeight: 'bold'
                    }}
                  >
                    LOCKED
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
