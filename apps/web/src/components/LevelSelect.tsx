import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

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

type StartRunPayload = {
  run: {
    id: string;
    characterId: string;
    weaponId: string;
    levelId: string;
    characterUpgradeLevel?: number;
    weaponUpgradeLevel?: number;
  };
  sessionToken: string;
};

export const LevelSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({
  onBack,
  onStart
}) => {
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingLevelId, setStartingLevelId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Use existing store state instead of re-fetching inventory
  const { user } = useGameStore();

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
            name: level.name || 'Unknown Level',
            description: level.description || 'No description available.',
            difficulty: Number(level.difficulty ?? 1),
            waves: Number(level.waves ?? 1),
            baseReward: Number(level.baseReward ?? 0),
            unlockRequirement: Number(level.unlockRequirement ?? 0),
            unlocked: Boolean(level.unlocked),
            completed: Boolean(level.completed),
            isBossLevel: Boolean(level.isBossLevel)
          }))
          // Removed hardcoded filter for levelNumber === 1 to support scalability
          .sort((a: Level, b: Level) => a.levelNumber - b.levelNumber);

        setLevels(normalized);
      } catch (error) {
        console.error('[LevelSelect] Failed to load levels:', error);
        setLoadError('Failed to load mission data.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadLevels();
  }, []);

  const summary = useMemo(() => {
    const unlocked = levels.filter((level) => level.unlocked).length;
    const completed = levels.filter((level) => level.completed).length;
    return { unlocked, completed, total: levels.length };
  }, [levels]);

  const handleStart = async (levelId: string) => {
    if (startingLevelId) return;
    setDeployError(null);

    // Check for equipment using store state to avoid extra network request
    const equippedCharacter = user?.profile?.equippedCharacterId;
    const equippedWeapon = user?.profile?.equippedWeaponId;

    if (!equippedCharacter || !equippedWeapon) {
      setDeployError('You must equip a character and weapon in the armory first.');
      return;
    }

    try {
      setStartingLevelId(levelId);

      const startRes = await apiClient.post<StartRunPayload>('/api/game/start', {
        levelId,
        characterId: equippedCharacter,
        weaponId: equippedWeapon
      });

      const payload = startRes.data;

      if (!payload?.run?.id || !payload?.sessionToken) {
        console.error('[LevelSelect] Invalid start payload:', payload);
        setDeployError('Mission session could not be created.');
        return;
      }

      // Fixed: Use 'hasActiveRun' to match App.tsx and GameScene.ts
      sessionStorage.setItem('hasActiveRun', JSON.stringify({
        ...payload,
        run: {
          ...payload.run,
          characterUpgradeLevel: payload.run.characterUpgradeLevel ?? 0,
          weaponUpgradeLevel: payload.run.weaponUpgradeLevel ?? 0
        }
      }));

      onStart();
    } catch (error) {
      console.error('[LevelSelect] Failed to start level:', error);
      setDeployError('Failed to deploy to mission.');
    } finally {
      setStartingLevelId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={centerStyle}>LOADING MISSION DATA...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={containerStyle}>
        <button onClick={onBack} style={backButtonStyle}>BACK</button>
        <div style={errorBoxStyle}>{loadError}</div>
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div style={containerStyle}>
        <button onClick={onBack} style={backButtonStyle}>BACK</button>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, color: '#ff6b35' }}>No Missions Available</h2>
          <p style={{ color: '#bbb', marginBottom: 0 }}>Seed or create mission levels in the API database.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <button onClick={onBack} style={backButtonStyle}>BACK</button>
      <h2 style={{ textAlign: 'center', color: '#ff6b35', marginBottom: 12, textTransform: 'uppercase' }}>Missions</h2>

      <div style={{ maxWidth: 860, margin: '0 auto 18px', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <InfoPill label="Available" value={String(summary.total)} color="#ffffff" />
        <InfoPill label="Unlocked" value={String(summary.unlocked)} color="#4caf50" />
        <InfoPill label="Completed" value={String(summary.completed)} color="#ff6b35" />
      </div>

      {deployError && (
        <div style={{ maxWidth: 860, margin: '0 auto 12px', padding: 10, background: '#5a1f1f', color: '#ff8a80', borderRadius: 8, textAlign: 'center' }}>
          {deployError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860, margin: '0 auto' }}>
        {levels.map((level) => {
          const isStarting = startingLevelId === level.id;

          return (
            <div key={level.id} style={{ background: level.unlocked ? '#222' : '#111', padding: 18, borderRadius: 14, border: `2px solid ${level.unlocked ? '#ff6b35' : '#222'}`, opacity: level.unlocked ? 1 : 0.55, boxShadow: level.unlocked ? '0 8px 22px rgba(0,0,0,0.28)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, color: '#fff' }}>Level {level.levelNumber}: {level.name}</h3>
                    {level.isBossLevel ? (
                      <span style={{ background: '#4b1616', color: '#ffd54f', border: '1px solid #8b0000', borderRadius: '999px', padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>BOSS</span>
                    ) : null}
                    {level.completed ? (
                      <span style={{ background: '#18361c', color: '#7ee787', border: '1px solid #2e7d32', borderRadius: '999px', padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>COMPLETED</span>
                    ) : null}
                  </div>

                  <p style={{ margin: '0 0 12px 0', color: '#bbb', fontSize: 14 }}>{level.description}</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, fontSize: 12 }}>
                    <Spec label="Difficulty" value={String(level.difficulty)} color="#ffb74d" />
                    <Spec label="Waves" value={String(level.waves)} color="#fff" />
                    <Spec label="Objective" value={level.isBossLevel ? 'Boss Kill' : 'Extraction'} color="#90caf9" />
                    <Spec label="Reward" value={`${level.baseReward} PIGS`} color="#ffd700" />
                  </div>
                </div>

                {level.unlocked ? (
                  <button onClick={() => void handleStart(level.id)} disabled={!!startingLevelId} style={{ minWidth: 130, padding: '12px 16px', background: isStarting ? '#555' : '#ff6b35', color: '#fff', border: 'none', borderRadius: 10, cursor: startingLevelId ? 'not-allowed' : 'pointer', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {isStarting ? 'DEPLOYING...' : 'DEPLOY'}
                  </button>
                ) : (
                  <div style={{ padding: '10px 14px', background: '#1a1a1a', color: '#777', borderRadius: 8, fontWeight: 'bold' }}>LOCKED</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InfoPill: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ background: '#161616', border: '1px solid #2d2d2d', borderRadius: 10, padding: '10px 14px', color: '#ddd', fontSize: 14 }}>{label}: <span style={{ color, fontWeight: 700 }}>{value}</span></div>
);

const Spec: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ color: '#ddd' }}>{label}: <span style={{ color, fontWeight: 700 }}>{value}</span></div>
);

// --- Styles ---
const containerStyle: React.CSSProperties = { padding: 20, color: '#fff', height: '100%', overflowY: 'auto', background: '#0a0a0a', boxSizing: 'border-box', minHeight: '100vh' };
const centerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' };
const backButtonStyle: React.CSSProperties = { padding: '10px 20px', marginBottom: 20, background: '#444', border: '2px solid #ff6b35', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' };
const errorBoxStyle: React.CSSProperties = { maxWidth: 520, margin: '80px auto 0', padding: 20, borderRadius: 12, border: '2px solid #5a1f1f', background: '#1a1111', textAlign: 'center', color: '#ff8a80' };
const cardStyle: React.CSSProperties = { maxWidth: 560, margin: '80px auto 0', padding: 22, background: '#151515', border: '2px solid #333', borderRadius: 12, textAlign: 'center' };
