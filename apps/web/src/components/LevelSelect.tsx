import React, { useEffect, useState } from 'react';
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
  const { user } = useGameStore();

  useEffect(() => {
    const loadLevels = async () => {
      try {
        setLoadError(null);
        const res = await apiClient.get('/api/game/levels');
        const incoming = Array.isArray(res.data) ? res.data : [];

        const normalized = incoming
          .filter((level: Partial<Level>) => level.levelNumber === 1)
          .map((level: Partial<Level>) => ({
            id: level.id as string,            levelNumber: Number(level.levelNumber ?? 1),
            name: 'Outskirts Breach',
            description: 'Breach the outer defense line, eliminate 6 enemy threats, destroy the mini tank, and reach extraction.',
            difficulty: Number(level.difficulty ?? 1),
            waves: Number(level.waves ?? 1),
            baseReward: Number(level.baseReward ?? 500),
            unlockRequirement: Number(level.unlockRequirement ?? 0),
            unlocked: true,
            completed: Boolean(level.completed)
          }));

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

  const handleStart = async (levelId: string) => {
    if (startingLevelId) return;

    try {
      setStartingLevelId(levelId);
      console.log('[LevelSelect] Starting deployment...');

      // Step 1: Check inventory
      console.log('[LevelSelect] Step 1: Fetching inventory...');
      const inventoryRes = await apiClient.get('/api/inventory');
      const equipped = inventoryRes.data?.equipped;

      console.log('[LevelSelect] Equipped:', equipped);

      if (!equipped?.characterId || !equipped?.weaponId) {
        alert('Please equip a character and weapon first. Go to Units and Armory to equip.');
        setStartingLevelId(null);
        return;
      }

      // Step 2: Start game session
      console.log('[LevelSelect] Step 2: Creating game session...');
      const startRes = await apiClient.post<StartRunResponse>('/api/game/start', {
        levelId,
        characterId: equipped.characterId,
        weaponId: equipped.weaponId
      });
      console.log('[LevelSelect] API Response:', startRes.data);

      const payload = startRes.data;

      // Step 3: Validate response
      if (
        !payload?.run?.id ||
        !payload?.run?.characterId ||
        !payload?.run?.weaponId ||
        !payload?.run?.levelId ||
        !payload?.sessionToken
      ) {
        console.error('[LevelSelect] Invalid payload:', payload);
        alert('Invalid response from server. Please check console for details.');
        setStartingLevelId(null);
        return;
      }

      // Step 4: Save to sessionStorage
      const sessionData = {
        ...payload,
        run: {
          ...payload.run,
          characterUpgradeLevel: payload.run.characterUpgradeLevel ?? 0,
          weaponUpgradeLevel: payload.run.weaponUpgradeLevel ?? 0
        }
      };

      console.log('[LevelSelect] Step 3: Saving to sessionStorage...');
      console.log('[LevelSelect] Session data:', sessionData);
      
      sessionStorage.setItem('hasActiveRun', JSON.stringify(sessionData));
      
      // Verify it was saved
      const saved = sessionStorage.getItem('hasActiveRun');
      console.log('[LevelSelect] Verification - Saved data:', saved);

      if (!saved) {
        alert('Failed to save session. Check if sessionStorage is available.');
        setStartingLevelId(null);
        return;
      }

      // Step 5: Navigate to game
      console.log('[LevelSelect] Step 4: Navigating to game...');
      setStartingLevelId(null);
      onStart();
      
    } catch (error) {      console.error('[LevelSelect] Deployment failed:', error);
      alert(`Failed to start Level 1: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStartingLevelId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', color: '#fff', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0a' }}>
        LOADING LEVEL 1...
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: '20px', color: '#fff', height: '100%', background: '#0a0a0a' }}>
        <button onClick={onBack} style={{ padding: '10px 20px', marginBottom: '20px', background: '#444', border: '2px solid #ff6b35', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>BACK</button>
        <div style={{ maxWidth: '520px', margin: '80px auto 0', padding: '20px', borderRadius: '12px', border: '2px solid #5a1f1f', background: '#1a1111', textAlign: 'center', color: '#ff8a80' }}>{loadError}</div>
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#fff', height: '100%', background: '#0a0a0a' }}>
        <button onClick={onBack} style={{ padding: '10px 20px', marginBottom: '20px', background: '#444', border: '2px solid #ff6b35', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>BACK</button>
        <div style={{ maxWidth: '560px', margin: '80px auto 0', padding: '22px', background: '#151515', border: '2px solid #333', borderRadius: '12px', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: '#ff6b35' }}>Level 1 Not Found</h2>
          <p style={{ color: '#bbb', marginBottom: 0 }}>Seed Level 1 in the database.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: '#fff', height: '100%', overflowY: 'auto', background: '#0a0a0a', boxSizing: 'border-box' }}>
      <button onClick={onBack} style={{ padding: '10px 20px', marginBottom: '20px', background: '#444', border: '2px solid #ff6b35', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>BACK</button>
      <h2 style={{ textAlign: 'center', color: '#ff6b35', marginBottom: '12px', textTransform: 'uppercase' }}>Level 1: Outskirts Breach</h2>
      
      <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {levels.map((level) => {
          const isStarting = startingLevelId === level.id;

          return (
            <div key={level.id} style={{ background: '#222', padding: '18px', borderRadius: '14px', border: '2px solid #ff6b35', boxShadow: '0 8px 22px rgba(0,0,0,0.28)' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>{level.name}</h3>
              <p style={{ margin: '0 0 12px 0', color: '#bbb', fontSize: '14px' }}>{level.description}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '12px', marginBottom: '16px' }}>                <div style={{ color: '#ddd' }}>Difficulty: <span style={{ color: '#4caf50', fontWeight: 700 }}>Beginner</span></div>
                <div style={{ color: '#ddd' }}>Threats: <span style={{ color: '#fff', fontWeight: 700 }}>6</span></div>
                <div style={{ color: '#ddd' }}>Reward: <span style={{ color: '#ffd700', fontWeight: 700 }}>{level.baseReward} $PIGS</span></div>
              </div>

              <button
                onClick={() => void handleStart(level.id)}
                disabled={!!startingLevelId}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: isStarting ? '#555' : '#ff6b35',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: startingLevelId ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  fontSize: '16px'
                }}
              >
                {isStarting ? 'DEPLOYING...' : 'DEPLOY NOW'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
