import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

type Level = {
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
};

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
    sessionStorage.removeItem('currentRun');
    void loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      setLoadError(null);
      setIsLoading(true);

      const res = await apiClient.get('/api/game/levels');
      const incoming = Array.isArray(res.data) ? res.data : [];
      const normalized: Level[] = incoming
        .filter((level: Partial<Level>) => Boolean(level?.id))
        .map((level: Partial<Level>) => ({
          id: String(level.id),
          levelNumber: Number(level.levelNumber ?? 0),
          name: level.name || 'Unknown Mission',
          description: level.description || 'No description available.',
          difficulty: Number(level.difficulty ?? 1),
          waves: Number(level.waves ?? 1),
          baseReward: Number(level.baseReward ?? 0),
          unlockRequirement: Number(level.unlockRequirement ?? 0),
          unlocked: Boolean(level.unlocked),
          completed: Boolean(level.completed),
          isBossLevel: Boolean(level.isBossLevel)
        }))
        .filter((level) => level.levelNumber === 1)
        .sort((a, b) => a.levelNumber - b.levelNumber);

      setLevels(normalized);
    } catch (error) {
      console.error('[LevelSelect] Failed to load levels:', error);
      setLoadError('Failed to load Level 1.');
    } finally {
      setIsLoading(false);
    }
  };

  const summary = useMemo(() => {
    const unlocked = levels.filter((level) => level.unlocked).length;
    const completed = levels.filter((level) => level.completed).length;

    return {
      total: levels.length,
      unlocked,
      completed
    };
  }, [levels]);

  const handleStart = async (levelId: string) => {
    if (startingLevelId) return;

    try {
      setStartingLevelId(levelId);
      sessionStorage.removeItem('currentRun');

      const inventoryRes = await apiClient.get('/api/inventory');
      const equipped = inventoryRes.data?.equipped;

      if (!equipped?.characterId || !equipped?.weaponId) {        window.dispatchEvent(
          new CustomEvent('WAR_PIGS_NOTICE', {
            detail: {
              title: 'Loadout Required',
              message: 'Equip one unit and one weapon before deploying.',
              type: 'warning'
            }
          })
        );
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

        window.dispatchEvent(
          new CustomEvent('WAR_PIGS_NOTICE', {
            detail: {
              title: 'Mission Failed To Start',
              message: 'The server did not return a valid mission session.',
              type: 'error'
            }
          })
        );

        return;
      }

      sessionStorage.setItem('currentRun', JSON.stringify(payload));

      const savedRun = sessionStorage.getItem('currentRun');

      if (!savedRun) {
        window.dispatchEvent(
          new CustomEvent('WAR_PIGS_NOTICE', {
            detail: {              title: 'Mission Session Error',
              message: 'Mission session could not be saved on this device.',
              type: 'error'
            }
          })
        );

        return;
      }

      onStart();
    } catch (error: any) {
      console.error('[LevelSelect] Failed to start Level 1:', error);

      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to start Level 1.';

      window.dispatchEvent(
        new CustomEvent('WAR_PIGS_NOTICE', {
          detail: {
            title: 'Deployment Failed',
            message,
            type: 'error'
          }
        })
      );
    } finally {
      setStartingLevelId(null);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#ff6b35',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase'
        }}
      >
        Loading Level 1...
      </div>    );
  }

  if (loadError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#fff',
          padding: '20px',
          boxSizing: 'border-box'
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '10px 20px',
            background: '#444',
            border: '2px solid #ff6b35',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 800
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
    return (      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#fff',
          padding: '20px',
          boxSizing: 'border-box'
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '10px 20px',
            background: '#444',
            border: '2px solid #ff6b35',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 800
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
            Seed Level 1 in the database before deploying.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',        color: '#fff',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: '10px 20px',
          marginBottom: '26px',
          background: '#444',
          border: '2px solid #ff6b35',
          color: '#fff',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 800
        }}
      >
        BACK
      </button>

      <h2
        style={{
          textAlign: 'center',
          color: '#ff6b35',
          margin: '0 0 16px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}
      >
        Level 1
      </h2>

      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto 18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '10px'
        }}
      >
        <SummaryBox label="Missions" value={summary.total} />
        <SummaryBox label="Unlocked" value={summary.unlocked} />
        <SummaryBox label="Completed" value={summary.completed} />
      </div>

      <div        style={{
          maxWidth: '720px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {levels.map((level) => {
          const isStarting = startingLevelId === level.id;

          return (
            <div
              key={level.id}
              style={{
                background: '#222',
                padding: '18px',
                borderRadius: '14px',
                border: `2px solid ${level.unlocked ? '#ff6b35' : '#333'}`,
                opacity: level.unlocked ? 1 : 0.55
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
                  <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '24px' }}>
                    Mission {level.levelNumber}: {level.name}
                  </h3>

                  {level.completed ? (
                    <div
                      style={{
                        display: 'inline-block',
                        marginBottom: '10px',
                        padding: '3px 9px',
                        borderRadius: '999px',
                        background: '#18361c',
                        border: '1px solid #2e7d32',
                        color: '#7ee787',
                        fontSize: '12px',
                        fontWeight: 800
                      }}
                    >                      COMPLETED
                    </div>
                  ) : null}

                  <p style={{ color: '#bbb', margin: '0 0 12px', lineHeight: 1.45 }}>
                    {level.description}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <InfoPill label="Difficulty" value={String(level.difficulty)} />
                    <InfoPill label="Waves" value={String(level.waves)} />
                    <InfoPill label="Reward" value={`${level.baseReward} $PIGS`} />
                    <InfoPill
                      label="Status"
                      value={level.unlocked ? 'Ready' : `Requires Level ${level.unlockRequirement}`}
                    />
                  </div>
                </div>

                {level.unlocked ? (
                  <button
                    type="button"
                    disabled={Boolean(startingLevelId)}
                    onClick={() => void handleStart(level.id)}
                    style={{
                      minWidth: '130px',
                      padding: '12px 16px',
                      background: isStarting ? '#555' : '#ff6b35',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: startingLevelId ? 'not-allowed' : 'pointer',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {isStarting ? 'Deploying...' : 'Deploy'}
                  </button>
                ) : (
                  <div
                    style={{
                      minWidth: '110px',                      padding: '12px 16px',
                      background: '#111',
                      color: '#777',
                      borderRadius: '10px',
                      fontWeight: 900,
                      textAlign: 'center'
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

const SummaryBox: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  return (
    <div
      style={{
        background: '#161616',
        border: '1px solid #2d2d2d',
        borderRadius: '10px',
        padding: '10px 12px',
        textAlign: 'center'
      }}
    >
      <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 900 }}>{value}</div>
    </div>
  );
};

const InfoPill: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div
      style={{
        background: '#161616',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '8px 10px'
      }}
    >
      <div style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 800 }}>{value}</div>
    </div>  );
};
