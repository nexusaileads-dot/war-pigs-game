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
          .sort((a: Level, b: Level) => a.levelNumber - b.levelNumber);

        setLevels(normalized);
      } catch (error) {
        console.error('[LevelSelect] Failed to load levels:', error);
        setLoadError('Failed to load missions.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadLevels();
  }, []);

  const summary = useMemo(() => {
    const unlocked = levels.filter((level) => level.unlocked).length;
    const completed = levels.filter((level) => level.completed).length;
    const bossCount = levels.filter((level) => level.isBossLevel).length;

    return {
      unlocked,
      completed,
      bossCount,
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
        alert('Equip a character and weapon before deploying.');
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

      const currentRunPayload = {
        run: {
          id: payload.run.id,
          characterId: payload.run.characterId,
          weaponId: payload.run.weaponId,
          levelId: payload.run.levelId,
          characterUpgradeLevel: Number(payload.run.characterUpgradeLevel ?? 0),
          weaponUpgradeLevel: Number(payload.run.weaponUpgradeLevel ?? 0)
        },
        sessionToken: payload.sessionToken
      };

      sessionStorage.setItem('currentRun', JSON.stringify(currentRunPayload));
      onStart();
    } catch (error) {
      console.error('[LevelSelect] Failed to start mission:', error);
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
          minHeight: '100vh',
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

  if (loadError) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          minHeight: '100vh',
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

  return (
    <div
      className="mobile-scroll-screen"
      style={{
        padding: '20px',
        color: '#fff',
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
        Select Mission
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
        <SummaryPill label="Missions" value={summary.total} color="#fff" />
        <SummaryPill label="Unlocked" value={summary.unlocked} color="#4caf50" />
        <SummaryPill label="Completed" value={summary.completed} color="#ff6b35" />
        <SummaryPill label="Boss Ops" value={summary.bossCount} color="#ffd54f" />
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
          const cardBorder = level.unlocked
            ? level.isBossLevel
              ? '#8b0000'
              : '#333'
            : '#222';

          return (
            <div
              key={level.id}
              style={{
                background: level.unlocked ? '#222' : '#111',
                padding: '16px',
                borderRadius: '12px',
                border: `2px solid ${cardBorder}`,
                opacity: level.unlocked ? 1 : 0.55,
                boxShadow: level.unlocked ? '0 6px 18px rgba(0,0,0,0.22)' : 'none'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
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
                      Mission {level.levelNumber}: {level.name}
                    </h3>

                    {level.isBossLevel ? (
                      <Badge
                        text="BOSS"
                        background="#4b1616"
                        color="#ffd54f"
                        border="#8b0000"
                      />
                    ) : null}

                    {level.completed ? (
                      <Badge
                        text="COMPLETED"
                        background="#18361c"
                        color="#7ee787"
                        border="#2e7d32"
                      />
                    ) : null}
                  </div>

                  <p style={{ margin: '0 0 10px 0', color: '#bbb', fontSize: '14px' }}>
                    {level.description}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ color: '#ddd' }}>
                      Difficulty:{' '}
                      <span style={{ color: '#ffb74d', fontWeight: 700 }}>
                        {level.difficulty}
                      </span>
                    </div>

                    <div style={{ color: '#ddd' }}>
                      Waves:{' '}
                      <span style={{ color: '#fff', fontWeight: 700 }}>{level.waves}</span>
                    </div>

                    <div style={{ color: '#ddd' }}>
                      Reward:{' '}
                      <span style={{ color: '#ffd700', fontWeight: 700 }}>
                        {level.baseReward} $PIGS
                      </span>
                    </div>

                    {!level.unlocked ? (
                      <div style={{ color: '#ff8a80' }}>
                        Requires Level{' '}
                        <span style={{ fontWeight: 700 }}>{level.unlockRequirement}</span>
                      </div>
                    ) : (
                      <div style={{ color: '#9e9e9e' }}>Ready for deployment</div>
                    )}
                  </div>
                </div>

                {level.unlocked ? (
                  <button
                    onClick={() => void handleStart(level.id)}
                    disabled={!!startingLevelId}
                    style={{
                      minWidth: '120px',
                      padding: '10px 14px',
                      background: isStarting ? '#555' : level.isBossLevel ? '#8b0000' : '#ff6b35',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: startingLevelId ? 'not-allowed' : 'pointer',
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

const SummaryPill: React.FC<{ label: string; value: number; color: string }> = ({
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

const Badge: React.FC<{
  text: string;
  background: string;
  color: string;
  border: string;
}> = ({ text, background, color, border }) => {
  return (
    <span
      style={{
        background,
        color,
        border: `1px solid ${border}`,
        borderRadius: '999px',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 700
      }}
    >
      {text}
    </span>
  );
};
