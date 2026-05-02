import React, { useEffect, useMemo, useState } from 'react';
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

type StartRunResponse = {
  run?: {
    id?: string;
    characterId?: string;
    weaponId?: string;
    levelId?: string;
    characterUpgradeLevel?: number;
    weaponUpgradeLevel?: number;
  };
  sessionToken?: string;
};

export const LevelSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({
  onBack,
  onStart
}) => {
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingLevelId, setStartingLevelId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadLevels = async () => {
      try {
        setLoadError(null);

        const res = await apiClient.get('/api/game/levels');
        const incoming = Array.isArray(res.data) ? res.data : [];

        const normalized = incoming
          .filter((level: Partial<Level>) => !!level?.id)
          .map((level: Partial<Level>) => ({
            id: level.id as string,
            levelNumber: Number(level.levelNumber ?? 0),
            name: level.name || 'Outskirts Breach',
            description:
              level.levelNumber === 1
                ? 'Clear 6 threats, destroy the mini tank, and reach extraction.'
                : level.description || 'No description available.',
            difficulty: Number(level.difficulty ?? 1),
            waves: Number(level.waves ?? 1),
            baseReward: Number(level.baseReward ?? 0),
            unlockRequirement: Number(level.unlockRequirement ?? 0),
            unlocked: Boolean(level.unlocked),
            completed: Boolean(level.completed),
            isBossLevel: Boolean(level.isBossLevel)
          }))
          .filter((level: Level) => level.levelNumber === 1)
          .sort((a: Level, b: Level) => a.levelNumber - b.levelNumber);

        setLevels(normalized);
      } catch (error) {
        console.error('[LevelSelect] Failed to load levels:', error);
        setLoadError('Failed to load Level 1.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadLevels();
  }, []);

  const summary = useMemo(() => {
    const unlocked = levels.filter((level) => level.unlocked).length;
    const completed = levels.filter((level) => level.completed).length;

    return {
      unlocked,
      completed,
      total: levels.length
    };
  }, [levels]);

  const handleStart = async (levelId: string) => {
    if (startingLevelId) return;

    try {
      setStartingLevelId(levelId);

      const inventoryRes = await apiClient.get('/api/inventory');
      const equipped = inventoryRes.data?.equipped;

      if (!equipped?.characterId || !equipped?.weaponId) {
        alert('Equip a unit and weapon before deployment.');
        return;
      }

      const startRes = await apiClient.post<StartRunResponse>('/api/game/start', {
        levelId,
        characterId: equipped.characterId,
        weaponId: equipped.weaponId
      });

      const payload = startRes.data;

      if (
        !payload?.run?.id ||
        !payload?.run?.characterId ||
        !payload?.run?.weaponId ||
        !payload?.run?.levelId ||
        !payload?.sessionToken
      ) {
        console.error('[LevelSelect] Invalid start payload:', payload);
        alert('Mission session could not be created.');
        return;
      }

      sessionStorage.setItem(
        'currentRun',
        JSON.stringify({
          ...payload,
          run: {
            ...payload.run,
            characterUpgradeLevel: payload.run.characterUpgradeLevel ?? 0,
            weaponUpgradeLevel: payload.run.weaponUpgradeLevel ?? 0
          }
        })
      );

      onStart();
    } catch (error) {
      console.error('[LevelSelect] Failed to start Level 1:', error);
      alert('Failed to start Level 1.');
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
        LOADING LEVEL 1...
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          height: '100%',
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

        <div
          style={{
            maxWidth: '520px',
            margin: '80px auto 0',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #5a1f1f',
            background: '#1a1111',
            textAlign: 'center',
            color: '#ff8a80'
          }}
        >
          {loadError}
        </div>
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          height: '100%',
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

        <div
          style={{
            maxWidth: '560px',
            margin: '80px auto 0',
            padding: '22px',
            background: '#151515',
            border: '2px solid #333',
            borderRadius: '12px',
            textAlign: 'center'
          }}
        >
          <h2 style={{ marginTop: 0, color: '#ff6b35' }}>Level 1 Not Found</h2>
          <p style={{ color: '#bbb', marginBottom: 0 }}>
            Seed or create mission levelNumber 1 in the API database.
          </p>
        </div>
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
        background: '#0a0a0a',
        boxSizing: 'border-box'
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
          marginBottom: '12px',
          textTransform: 'uppercase'
        }}
      >
        Level 1
      </h2>

      <div
        style={{
          maxWidth: '860px',
          margin: '0 auto 18px',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <InfoPill label="Available" value={String(summary.total)} color="#ffffff" />
        <InfoPill label="Unlocked" value={String(summary.unlocked)} color="#4caf50" />
        <InfoPill label="Completed" value={String(summary.completed)} color="#ff6b35" />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          maxWidth: '860px',
          margin: '0 auto'
        }}
      >
        {levels.map((level) => {
          const isStarting = startingLevelId === level.id;

          return (
            <div
              key={level.id}
              style={{
                background: level.unlocked ? '#222' : '#111',
                padding: '18px',
                borderRadius: '14px',
                border: `2px solid ${level.unlocked ? '#ff6b35' : '#222'}`,
                opacity: level.unlocked ? 1 : 0.55,
                boxShadow: level.unlocked ? '0 8px 22px rgba(0,0,0,0.28)' : 'none'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '14px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginBottom: '8px'
                    }}
                  >
                    <h3 style={{ margin: 0, color: '#fff' }}>
                      Level {level.levelNumber}: Outskirts Breach
                    </h3>

                    <span
                      style={{
                        background: '#4b1616',
                        color: '#ffd54f',
                        border: '1px solid #8b0000',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    >
                      MINI TANK
                    </span>

                    {level.completed ? (
                      <span
                        style={{
                          background: '#18361c',
                          color: '#7ee787',
                          border: '1px solid #2e7d32',
                          borderRadius: '999px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        COMPLETED
                      </span>
                    ) : null}
                  </div>

                  <p style={{ margin: '0 0 12px 0', color: '#bbb', fontSize: '14px' }}>
                    Clear 4 soldiers, 1 drone, and 1 mini tank. Reach extraction after all threats are removed.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <Spec label="Difficulty" value="1" color="#ffb74d" />
                    <Spec label="Threats" value="6" color="#fff" />
                    <Spec label="Objective" value="Extraction" color="#90caf9" />
                    <Spec label="Reward" value={`${level.baseReward} $PIGS`} color="#ffd700" />
                  </div>
                </div>

                {level.unlocked ? (
                  <button
                    onClick={() => void handleStart(level.id)}
                    disabled={!!startingLevelId}
                    style={{
                      minWidth: '130px',
                      padding: '12px 16px',
                      background: isStarting ? '#555' : '#ff6b35',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: startingLevelId ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
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

const InfoPill: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color
}) => {
  return (
    <div
      style={{
        background: '#161616',
        border: '1px solid #2d2d2d',
        borderRadius: '10px',
        padding: '10px 14px',
        color: '#ddd',
        fontSize: '14px'
      }}
    >
      {label}: <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
};

const Spec: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color
}) => {
  return (
    <div style={{ color: '#ddd' }}>
      {label}: <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
};
