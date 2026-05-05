import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

interface Level {
  id: string;
  levelNumber: number;
  name: string;
  description: string;
  baseReward: number;
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
  
  // Get equipped items from store
  const { user, refreshProfile } = useGameStore();
  const equippedChar = user?.profile?.equippedCharacterId || null;
  const equippedWpn = user?.profile?.equippedWeaponId || null;
  const isLoadoutReady = !!(equippedChar && equippedWpn);

  useEffect(() => {
    const loadLevels = async () => {
      try {
        setLoadError(null);
        const res = await apiClient.get('/api/game/levels');
        const incoming = Array.isArray(res.data) ? res.data : [];

        const normalized = incoming
          .filter((level: Partial<Level>) => level.levelNumber === 1)
          .map((level: Partial<Level>) => ({            id: level.id as string,
            levelNumber: Number(level.levelNumber ?? 1),
            name: 'Outskirts Breach',
            description: 'Breach the outer defense line, eliminate 6 enemy threats, destroy the mini tank, and reach extraction.',
            baseReward: Number(level.baseReward ?? 500),
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
    if (!isLoadoutReady || startingLevelId) return;

    try {
      setStartingLevelId(levelId);
      console.log('[LevelSelect] Starting deployment with loadout:', { equippedChar, equippedWpn });

      const startRes = await apiClient.post<StartRunResponse>('/api/game/start', {
        levelId,
        characterId: equippedChar,
        weaponId: equippedWpn
      });

      console.log('[LevelSelect] API Response:', startRes.data);

      const payload = startRes.data;

      if (
        !payload?.run?.id ||
        !payload?.run?.characterId ||
        !payload?.run?.weaponId ||
        !payload?.run?.levelId ||
        !payload?.sessionToken
      ) {
        console.error('[LevelSelect] Invalid payload:', payload);
        alert('Server returned invalid session. Check console for details.');
        setStartingLevelId(null);
        return;
      }
      const sessionData = {
        ...payload,
        run: {
          ...payload.run,
          characterUpgradeLevel: payload.run.characterUpgradeLevel ?? 0,
          weaponUpgradeLevel: payload.run.weaponUpgradeLevel ?? 0
        }
      };

      sessionStorage.setItem('hasActiveRun', JSON.stringify(sessionData));
      console.log('[LevelSelect] Session saved. Navigating to game...');
      
      setStartingLevelId(null);
      onStart();
      
    } catch (error) {
      console.error('[LevelSelect] Deployment failed:', error);
      alert(`Failed to start mission: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStartingLevelId(null);
    }
  };

  // Helper to format asset names
  const formatName = (id: string) => id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  if (isLoading) return <div style={centerStyle}>LOADING MISSION DATA...</div>;
  if (loadError) return <ErrorState onBack={onBack} message={loadError} />;
  if (levels.length === 0) return <ErrorState onBack={onBack} message="Level 1 not found in database." />;

  return (
    <div style={containerStyle}>
      <button onClick={onBack} style={backButtonStyle}>BACK</button>
      <h2 style={titleStyle}>Level 1: Outskirts Breach</h2>

      {/* LOADOUT VERIFICATION SECTION */}
      <div style={loadoutBoxStyle}>
        <div style={loadoutTitleStyle}>CURRENT LOADOUT</div>
        
        <div style={loadoutGridStyle}>
          <div style={loadoutSlotStyle}>
            <div style={slotLabelStyle}>UNIT</div>
            {equippedChar ? (
              <div style={slotValueStyle}>{formatName(equippedChar)}</div>
            ) : (
              <div style={slotEmptyStyle}>Not Equipped</div>
            )}
            {!equippedChar && (
              <button onClick={() => alert('Go to Units tab to equip a character')} style={fixButtonStyle}>
                FIX →
              </button>            )}
          </div>

          <div style={loadoutSlotStyle}>
            <div style={slotLabelStyle}>WEAPON</div>
            {equippedWpn ? (
              <div style={slotValueStyle}>{formatName(equippedWpn)}</div>
            ) : (
              <div style={slotEmptyStyle}>Not Equipped</div>
            )}
            {!equippedWpn && (
              <button onClick={() => alert('Go to Armory tab to equip a weapon')} style={fixButtonStyle}>
                FIX →
              </button>
            )}
          </div>
        </div>

        {!isLoadoutReady && (
          <div style={warningStyle}>
            ⚠️ You must equip a Unit and Weapon before deployment.
          </div>
        )}
      </div>

      {/* LEVEL CARD */}
      <div style={levelCardStyle}>
        <p style={descStyle}>{levels[0].description}</p>
        
        <div style={statsGridStyle}>
          <Stat label="Difficulty" value="Beginner" color="#4caf50" />
          <Stat label="Threats" value="6" color="#fff" />
          <Stat label="Reward" value={`${levels[0].baseReward} $PIGS`} color="#ffd700" />
        </div>

        <button
          onClick={() => void handleStart(levels[0].id)}
          disabled={!isLoadoutReady || !!startingLevelId}
          style={{
            width: '100%',
            padding: '14px',
            marginTop: '16px',
            background: (!isLoadoutReady || startingLevelId) ? '#444' : '#ff6b35',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            cursor: (!isLoadoutReady || startingLevelId) ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            fontSize: '16px'          }}
        >
          {startingLevelId ? 'DEPLOYING...' : isLoadoutReady ? 'DEPLOY NOW' : 'EQUIP LOADOUT FIRST'}
        </button>
      </div>
    </div>
  );
};

// --- Subcomponents ---
const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
    <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>{label}</div>
    <div style={{ color, fontSize: '14px', fontWeight: 800 }}>{value}</div>
  </div>
);

const ErrorState: React.FC<{ onBack: () => void; message: string }> = ({ onBack, message }) => (
  <div style={containerStyle}>
    <button onClick={onBack} style={backButtonStyle}>BACK</button>
    <div style={{ maxWidth: 520, margin: '80px auto 0', padding: 20, borderRadius: 12, border: '2px solid #5a1f1f', background: '#1a1111', textAlign: 'center', color: '#ff8a80' }}>
      {message}
    </div>
  </div>
);

// --- Styles ---
const containerStyle: React.CSSProperties = { padding: 20, color: '#fff', background: '#0a0a0a', minHeight: '100vh', boxSizing: 'border-box' };
const centerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#fff' };
const titleStyle: React.CSSProperties = { textAlign: 'center', color: '#ff6b35', margin: '0 0 20px 0', textTransform: 'uppercase', fontSize: 22, fontWeight: 900 };
const backButtonStyle: React.CSSProperties = { padding: '10px 20px', marginBottom: 20, background: '#444', border: '2px solid #ff6b35', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' };

const loadoutBoxStyle: React.CSSProperties = { background: '#161616', border: '2px solid #333', borderRadius: 14, padding: 16, marginBottom: 20 };
const loadoutTitleStyle: React.CSSProperties = { color: '#888', fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 };
const loadoutGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const loadoutSlotStyle: React.CSSProperties = { background: '#111', padding: 12, borderRadius: 10, border: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', gap: 6 };
const slotLabelStyle: React.CSSProperties = { color: '#666', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
const slotValueStyle: React.CSSProperties = { color: '#fff', fontSize: 15, fontWeight: 800 };
const slotEmptyStyle: React.CSSProperties = { color: '#ff6b6b', fontSize: 14, fontWeight: 600 };
const fixButtonStyle: React.CSSProperties = { marginTop: 4, padding: '6px 0', background: 'transparent', border: '1px dashed #ff6b35', color: '#ff6b35', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 };
const warningStyle: React.CSSProperties = { marginTop: 12, padding: '8px 12px', background: '#331a1a', border: '1px solid #5a1f1f', borderRadius: 8, color: '#ff8a80', fontSize: 12, textAlign: 'center' };

const levelCardStyle: React.CSSProperties = { background: '#222', padding: 18, borderRadius: 14, border: '2px solid #ff6b35', boxShadow: '0 8px 22px rgba(0,0,0,0.28)' };
const descStyle: React.CSSProperties = { margin: '0 0 16px 0', color: '#bbb', fontSize: 14, lineHeight: 1.4 };
const statsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 };
