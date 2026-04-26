import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameNotice } from './GameNoticeProvider';

interface ApiLevel {
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
  const [levelOne, setLevelOne] = useState<ApiLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startingLevelId, setStartingLevelId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { showNotice } = useGameNotice();

  useEffect(() => {
    const loadLevels = async () => {
      try {
        setLoadError(null);

        const res = await apiClient.get('/api/game/levels');
        const incoming = Array.isArray(res.data) ? res.data : [];

        const normalized = incoming
          .filter((level: Partial<ApiLevel>) => !!level?.id)
          .map((level: Partial<ApiLevel>) => ({
            id: level.id as string,
            levelNumber: Number(level.levelNumber ?? 0),
            name: level.name || 'Outskirts Breach',
            description: level.description || 'Break through the wolf outpost.',
            difficulty: Number(level.difficulty ?? 1),
            waves: Number(level.waves ?? 1),
            baseReward: Number(level.baseReward ?? 0),
            unlockRequirement: Number(level.unlockRequirement ?? 0),
            unlocked: Boolean(level.unlocked),
            completed: Boolean(level.completed),
            isBossLevel: Boolean(level.isBossLevel)
          }))
          .sort((a: ApiLevel, b: ApiLevel) => a.levelNumber - b.levelNumber);

        const firstLevel =
          normalized.find((level: ApiLevel) => level.levelNumber === 1) || normalized[0] || null;

        setLevelOne(firstLevel);
      } catch (error) {
        console.error('[LevelSelect] Failed to load levels:', error);
        setLoadError('Failed to load Level 1.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadLevels();
  }, []);

  const missionStatus = useMemo(() => {
    if (!levelOne) {
      return {
        label: 'Unavailable',
        color: '#ff8a80'
      };
    }

    if (levelOne.completed) {
      return {
        label: 'Completed',
        color: '#7ee787'
      };
    }

    if (levelOne.unlocked) {
      return {
        label: 'Ready',
        color: '#ffd166'
      };
    }

    return {
      label: `Requires Level ${levelOne.unlockRequirement}`,
      color: '#ff8a80'
    };
  }, [levelOne]);

  const handleStart = async () => {
    if (!levelOne || startingLevelId) return;

    if (!levelOne.unlocked) {
      showNotice({
        title: 'Mission Locked',
        message: `Level 1 requires player level ${levelOne.unlockRequirement}.`,
        variant: 'warning'
      });
      return;
    }

    try {
      setStartingLevelId(levelOne.id);

      const inventoryRes = await apiClient.get('/api/inventory');
      const equipped = inventoryRes.data?.equipped;

      if (!equipped?.characterId || !equipped?.weaponId) {
        showNotice({
          title: 'Loadout Required',
          message: 'Equip a unit and weapon before deploying.',
          variant: 'warning'
        });
        return;
      }

      const startRes = await apiClient.post<StartRunResponse>('/api/game/start', {
        levelId: levelOne.id,
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
        showNotice({
          title: 'Mission Error',
          message: 'Mission session could not be created.',
          variant: 'error'
        });
        return;
      }

      sessionStorage.setItem(
        'currentRun',
        JSON.stringify({
          run: {
            id: payload.run.id,
            characterId: payload.run.characterId,
            weaponId: payload.run.weaponId,
            levelId: payload.run.levelId,
            characterUpgradeLevel: Number(payload.run.characterUpgradeLevel ?? 0),
            weaponUpgradeLevel: Number(payload.run.weaponUpgradeLevel ?? 0)
          },
          sessionToken: payload.sessionToken
        })
      );

      onStart();
    } catch (error) {
      console.error('[LevelSelect] Failed to start Level 1:', error);
      showNotice({
        title: 'Deployment Failed',
        message: 'Failed to start Level 1.',
        variant: 'error'
      });
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
        LOADING LEVEL 1...
      </div>
    );
  }

  if (loadError || !levelOne) {
    return (
      <div
        className="mobile-scroll-screen"
        style={{
          padding: '20px',
          color: '#fff',
          background: '#0a0a0a'
        }}
      >
        <button onClick={onBack} style={backButtonStyle}>
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
          {loadError || 'Level 1 is not available from the API.'}
        </div>
      </div>
    );
  }

  const isStarting = startingLevelId === levelOne.id;

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
      <button onClick={onBack} style={backButtonStyle}>
        BACK
      </button>

      <div
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        <div
          style={{
            padding: '18px',
            borderRadius: '18px',
            background: 'linear-gradient(180deg, #24140d 0%, #101010 100%)',
            border: '2px solid #ff6b35',
            boxShadow: '0 16px 40px rgba(255,107,53,0.12)'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 900,
              color: '#ffd166',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}
          >
            Level 1
          </div>

          <h1
            style={{
              margin: 0,
              color: '#fff',
              fontSize: '30px',
              lineHeight: 1.05,
              textTransform: 'uppercase'
            }}
          >
            Outskirts Breach
          </h1>

          <p
            style={{
              margin: '10px 0 0',
              color: '#cfcfcf',
              fontSize: '15px',
              lineHeight: 1.45
            }}
          >
            Break through the desert wolf outpost, clear patrols, destroy the mini tank, and reach
            extraction.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '10px'
          }}
        >
          <InfoCard label="Mission Type" value="Side-Scroller Assault" />
          <InfoCard label="Objective" value="14 Kills + Extraction" />
          <InfoCard label="Threats" value="Soldiers, Drones, Mini Tank" />
          <InfoCard label="Reward" value={`${levelOne.baseReward} $PIGS`} />
          <InfoCard label="Difficulty" value={String(levelOne.difficulty)} />
          <InfoCard label="Status" value={missionStatus.label} color={missionStatus.color} />
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '14px',
            background: '#161616',
            border: '1px solid #333'
          }}
        >
          <h3
            style={{
              margin: '0 0 10px',
              color: '#ff6b35',
              textTransform: 'uppercase'
            }}
          >
            Mission Plan
          </h3>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              color: '#d6d6d6',
              fontSize: '14px',
              lineHeight: 1.4
            }}
          >
            <div>1. Learn movement, jumping, and shooting in the first outpost section.</div>
            <div>2. Use crates and rooftops to handle enemy patrols.</div>
            <div>3. Shoot down drones before they flank you.</div>
            <div>4. Destroy or survive the mini tank near extraction.</div>
            <div>5. Reach the extraction marker to complete the level.</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={isStarting || !levelOne.unlocked}
          style={{
            width: '100%',
            padding: '16px 20px',
            border: 'none',
            borderRadius: '16px',
            background: isStarting || !levelOne.unlocked ? '#555' : '#ff6b35',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 900,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: isStarting || !levelOne.unlocked ? 'not-allowed' : 'pointer',
            boxShadow:
              isStarting || !levelOne.unlocked ? 'none' : '0 14px 34px rgba(255,107,53,0.24)'
          }}
        >
          {isStarting ? 'Deploying...' : 'Deploy Level 1'}
        </button>
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color = '#fff'
}) => {
  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '12px',
        background: '#151515',
        border: '1px solid #2f2f2f',
        minHeight: '74px'
      }}
    >
      <div
        style={{
          color: '#888',
          fontSize: '10px',
          fontWeight: 900,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          marginBottom: '6px'
        }}
      >
        {label}
      </div>

      <div
        style={{
          color,
          fontSize: '14px',
          fontWeight: 900,
          lineHeight: 1.25
        }}
      >
        {value}
      </div>
    </div>
  );
};

const backButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  marginBottom: '20px',
  background: '#444',
  border: '2px solid #ff6b35',
  color: '#fff',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold'
};
