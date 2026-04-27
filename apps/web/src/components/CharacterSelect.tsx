import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

type CharacterDetails = {
  characterId: string;
  name: string;
  classType: string;
  description?: string | null;
  upgradeLevel?: number | null;
};

type InventoryItem = {
  id: string;
  type: 'CHARACTER' | 'WEAPON';
  acquiredAt?: string;
  timesUsed?: number;
  details: CharacterDetails;
};

type CharacterMeta = {
  icon: string;
  classIcon: string;
  powerName: string;
  baseCooldown: number;
  effect: string;
  upgradeFocus: string;
  health: number;
  speedLabel: string;
  speedValue: number;
  maxLevel: number;
};

const MAX_CHARACTER_LEVEL = 5;

const CHARACTER_META: Record<string, CharacterMeta> = {
  grunt_bacon: {
    icon: 'Grunt-Bacon.png',
    classIcon: 'assault.png',
    powerName: 'Mud Slow',
    baseCooldown: 6,
    effect: 'Slows nearby enemies for a short duration.',
    upgradeFocus: 'Slow strength, radius, and duration',
    health: 100,
    speedLabel: 'Balanced',
    speedValue: 240,
    maxLevel: MAX_CHARACTER_LEVEL
  },
  iron_tusk: {
    icon: 'Iron-Tusk.png',
    classIcon: 'tank.png',
    powerName: 'Iron Slam',
    baseCooldown: 7,
    effect: 'Shockwave push that damages enemies around the unit.',
    upgradeFocus: 'Shockwave damage, knockback, and radius',
    health: 160,
    speedLabel: 'Slow',
    speedValue: 180,
    maxLevel: MAX_CHARACTER_LEVEL
  },
  swift_hoof: {
    icon: 'Swift-Hoof.png',
    classIcon: 'scout.png',
    powerName: 'Scout Dash',
    baseCooldown: 4.5,
    effect: 'Fast mobility burst for repositioning.',
    upgradeFocus: 'Dash distance, speed, and cooldown',
    health: 85,
    speedLabel: 'Very Fast',
    speedValue: 300,
    maxLevel: MAX_CHARACTER_LEVEL
  },
  precision_squeal: {
    icon: 'Precision-Squeal.png',
    classIcon: 'sniper.png',
    powerName: 'Focus Mode',
    baseCooldown: 7,
    effect: 'Boosts precision, projectile speed, damage, and pierce.',
    upgradeFocus: 'Damage bonus, pierce, duration, and cooldown',
    health: 90,
    speedLabel: 'Balanced',
    speedValue: 220,
    maxLevel: MAX_CHARACTER_LEVEL
  },
  blast_ham: {
    icon: 'Blast-Ham.png',
    classIcon: 'Demolition.png',
    powerName: 'Demolition Burst',
    baseCooldown: 6.5,
    effect: 'Fires explosive burst rockets toward enemies.',
    upgradeFocus: 'Rocket count, blast damage, radius, and cooldown',
    health: 115,
    speedLabel: 'Medium',
    speedValue: 210,
    maxLevel: MAX_CHARACTER_LEVEL
  },
  general_goldsnout: {
    icon: 'General-Goldsnout.png',
    classIcon: 'Elite.png',
    powerName: 'Rally Order',
    baseCooldown: 8,
    effect: 'Temporary combat efficiency boost.',
    upgradeFocus: 'Buff strength, duration, and cooldown',
    health: 125,
    speedLabel: 'Fast',
    speedValue: 255,
    maxLevel: MAX_CHARACTER_LEVEL
  }
};

const DEFAULT_META: CharacterMeta = {
  icon: 'Grunt-Bacon.png',
  classIcon: 'assault.png',
  powerName: 'Mud Slow',
  baseCooldown: 6,
  effect: 'Slows nearby enemies for a short duration.',
  upgradeFocus: 'Cooldown, radius, duration, and effect strength',
  health: 100,
  speedLabel: 'Balanced',
  speedValue: 240,
  maxLevel: MAX_CHARACTER_LEVEL
};

const getUpgradeCost = (level: number) => 200 + level * 150;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { data?: { error?: string } } }).response?.data?.error
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }

  return fallback;
};

export const CharacterSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({
  onBack,
  onStart
}) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedCharacterId, setEquippedCharacterId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradingCharacterId, setUpgradingCharacterId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile.currentPigs || 0;

  const getMeta = (characterId: string) => CHARACTER_META[characterId] || DEFAULT_META;

  const loadInventory = useCallback(async () => {
    try {
      setLoadError(null);

      const res = await apiClient.get('/api/inventory');
      const items = Array.isArray(res.data?.items) ? res.data.items : [];

      const characters = items.filter(
        (item: InventoryItem) => item.type === 'CHARACTER' && item.details?.characterId
      );

      setInventory(characters);

      const equippedId =
        res.data?.equipped?.characterId || characters[0]?.details.characterId || null;

      setEquippedCharacterId(equippedId);
      setSelectedCharacterId((current) => current || equippedId);
    } catch (error) {
      console.error('Failed to load character inventory:', error);
      setLoadError('Failed to load unit inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const selectedCharacter = useMemo(
    () => inventory.find((item) => item.details.characterId === selectedCharacterId) || null,
    [inventory, selectedCharacterId]
  );

  const getCharacterImage = (characterId: string) => {
    return `/assets/sprites/${getMeta(characterId).icon}`;
  };

  const getClassIcon = (characterId: string, classType: string) => {
    const meta = getMeta(characterId);

    const classMap: Record<string, string> = {
      ASSAULT: 'assault.png',
      TANK: 'tank.png',
      SNIPER: 'sniper.png',
      SCOUT: 'scout.png',
      DEMOLITION: 'Demolition.png',
      ELITE: 'Elite.png'
    };

    return `/assets/sprites/${meta.classIcon || classMap[classType.toUpperCase()] || 'assault.png'}`;
  };

  const getUpgradeLevel = (character: InventoryItem) => {
    return Math.max(0, Number(character.details.upgradeLevel ?? 0));
  };

  const getCharacterStats = (character: InventoryItem) => {
    const meta = getMeta(character.details.characterId);
    const level = getUpgradeLevel(character);
    const cooldown = Math.max(2.2, meta.baseCooldown - level * 0.35);

    return {
      level,
      health: meta.health + level * 10,
      speedValue: meta.speedValue + level * 6,
      speedLabel: meta.speedLabel,
      cooldown: `${cooldown.toFixed(1)}s`,
      powerName: meta.powerName,
      effect: meta.effect,
      upgradeFocus: meta.upgradeFocus,
      maxLevel: meta.maxLevel
    };
  };

  const confirmSelection = async () => {
    if (!selectedCharacterId) {
      alert('Select a unit first.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { characterId: selectedCharacterId });
      await refreshProfile();
      setEquippedCharacterId(selectedCharacterId);
      onStart();
    } catch (error) {
      console.error('Failed to equip character:', error);
      alert(getErrorMessage(error, 'Failed to equip unit.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const upgradeCharacter = async (characterId: string) => {
    if (upgradingCharacterId) return;

    try {
      setUpgradingCharacterId(characterId);

      await apiClient.post('/api/inventory/upgrade-character', {
        characterId
      });

      await Promise.all([loadInventory(), refreshProfile()]);
      setSelectedCharacterId(characterId);
      alert('Unit upgraded.');
    } catch (error) {
      console.error('Failed to upgrade character:', error);
      alert(getErrorMessage(error, 'Unit upgrade failed.'));
    } finally {
      setUpgradingCharacterId(null);
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
        LOADING UNITS...
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
          {loadError}
        </div>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          minHeight: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <button onClick={onBack} style={{ ...backButtonStyle, alignSelf: 'flex-start' }}>
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
          <h2 style={{ marginTop: 0, color: '#ff6b35' }}>No Units Available</h2>
          <p style={{ color: '#bbb', marginBottom: 0 }}>
            Your inventory has no character units yet. Buy one in the shop first.
          </p>
        </div>
      </div>
    );
  }

  const selectedStats = selectedCharacter ? getCharacterStats(selectedCharacter) : null;

  return (
    <div
      className="mobile-scroll-screen"
      style={{
        padding: '20px',
        color: '#fff',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '18px'
        }}
      >
        <button onClick={onBack} style={backButtonStyle}>
          BACK
        </button>

        <h2
          style={{
            textAlign: 'center',
            color: '#ff6b35',
            margin: 0,
            textTransform: 'uppercase'
          }}
        >
          Units
        </h2>

        <div
          style={{
            minWidth: '92px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '6px',
            color: '#ffd700',
            fontWeight: 800
          }}
        >
          <img
            src="/assets/sprites/pig-token.png"
            style={{ width: '18px', height: '18px', objectFit: 'contain' }}
            alt=""
          />
          {currentPigs}
        </div>
      </div>

      {selectedCharacter && selectedStats ? (
        <div
          style={{
            background: '#161616',
            border: '2px solid #ff6b35',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '18px',
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            flexWrap: 'wrap',
            boxShadow: '0 8px 22px rgba(255,107,53,0.12)'
          }}
        >
          <div
            style={{
              background: '#101010',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #333',
              width: '92px',
              height: '92px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <img
              src={getCharacterImage(selectedCharacter.details.characterId)}
              alt={selectedCharacter.details.name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.src = '/assets/sprites/Grunt-Bacon.png';
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
              CURRENT UNIT
            </div>

            <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>
              {selectedCharacter.details.name}
            </div>

            <div style={{ color: '#ffb74d', fontWeight: 800, marginTop: '4px' }}>
              {selectedCharacter.details.classType} · LVL {selectedStats.level}/
              {selectedStats.maxLevel}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
                gap: '8px',
                marginTop: '10px'
              }}
            >
              <SpecPill label="Health" value={selectedStats.health} />
              <SpecPill label="Speed" value={`${selectedStats.speedLabel} (${selectedStats.speedValue})`} />
              <SpecPill label="Power" value={selectedStats.powerName} />
              <SpecPill label="Cooldown" value={selectedStats.cooldown} />
            </div>

            <div style={{ color: '#9be38f', fontSize: '12px', marginTop: '10px', fontWeight: 700 }}>
              Effect: {selectedStats.effect}
            </div>

            <div style={{ color: '#8fcfff', fontSize: '12px', marginTop: '6px', fontWeight: 700 }}>
              Upgrade Path: {selectedStats.upgradeFocus}
            </div>

            {selectedCharacter.details.description ? (
              <div style={{ color: '#bbb', fontSize: '13px', marginTop: '8px' }}>
                {selectedCharacter.details.description}
              </div>
            ) : null}
          </div>

          <div
            style={{
              background: '#101010',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #333',
              width: '62px',
              height: '62px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <img
              src={getClassIcon(
                selectedCharacter.details.characterId,
                selectedCharacter.details.classType
              )}
              alt={selectedCharacter.details.classType}
              style={{ width: '38px', height: '38px', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.src = '/assets/sprites/assault.png';
              }}
            />
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {inventory.map((item) => {
          const characterId = item.details.characterId;
          const stats = getCharacterStats(item);
          const isSelected = selectedCharacterId === characterId;
          const isEquipped = equippedCharacterId === characterId;
          const isMaxed = stats.level >= stats.maxLevel;
          const upgradeCost = getUpgradeCost(stats.level);
          const canAfford = currentPigs >= upgradeCost;
          const isUpgrading = upgradingCharacterId === characterId;

          return (
            <div
              key={characterId}
              style={{
                background: isSelected ? '#2a1b14' : '#222',
                padding: '14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                border: `2px solid ${isSelected ? '#ff6b35' : '#333'}`,
                color: '#fff',
                boxShadow: isSelected ? '0 8px 20px rgba(255,107,53,0.18)' : 'none'
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCharacterId(characterId)}
                style={{
                  background: '#111',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  width: '76px',
                  height: '76px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer'
                }}
              >
                <img
                  src={getCharacterImage(characterId)}
                  alt={item.details.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.src = '/assets/sprites/Grunt-Bacon.png';
                  }}
                />
              </button>

              <button
                type="button"
                onClick={() => setSelectedCharacterId(characterId)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <h3 style={{ margin: '0 0 5px 0', fontSize: '19px', color: '#fff' }}>
                  {item.details.name}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '6px',
                    color: '#888',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  <span>CLASS: {item.details.classType}</span>
                  <span>HP: {stats.health}</span>
                  <span>LVL: {stats.level}/{stats.maxLevel}</span>
                </div>

                <div
                  style={{
                    color: '#ffb74d',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '4px'
                  }}
                >
                  POWER: {stats.powerName} · CD: {stats.cooldown}
                </div>

                <div style={{ color: '#8fcfff', fontSize: '12px', fontWeight: 700 }}>
                  Upgrade: {stats.upgradeFocus}
                </div>

                <p style={{ margin: '6px 0 0 0', color: '#777', fontSize: '11px' }}>
                  Used {item.timesUsed ?? 0} time{item.timesUsed === 1 ? '' : 's'}
                </p>
              </button>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                  alignItems: 'flex-end',
                  flexShrink: 0
                }}
              >
                {isEquipped ? <Tag color="#4caf50" text="EQUIPPED" /> : null}
                {isSelected ? <Tag color="#ff6b35" text="SELECTED" /> : null}

                <button
                  type="button"
                  disabled={isMaxed || !canAfford || isUpgrading}
                  onClick={() => void upgradeCharacter(characterId)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isMaxed
                      ? '#2e7d32'
                      : !canAfford || isUpgrading
                        ? '#555'
                        : '#ff6b35',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '11px',
                    cursor: isMaxed || !canAfford || isUpgrading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isMaxed ? 'MAXED' : isUpgrading ? 'UPGRADING...' : `UPGRADE ${upgradeCost}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => void confirmSelection()}
        disabled={!selectedCharacterId || isSubmitting}
        style={{
          padding: '14px 20px',
          background: !selectedCharacterId || isSubmitting ? '#555' : '#ff6b35',
          border: 'none',
          color: '#fff',
          borderRadius: '10px',
          cursor: !selectedCharacterId || isSubmitting ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginTop: 'auto'
        }}
      >
        {isSubmitting ? 'EQUIPPING...' : 'CONFIRM LOADOUT'}
      </button>
    </div>
  );
};

const SpecPill: React.FC<{ label: string; value: string | number }> = ({ label, value }) => {
  return (
    <div
      style={{
        background: '#222',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '8px 10px'
      }}
    >
      <div
        style={{
          color: '#888',
          fontSize: '10px',
          textTransform: 'uppercase',
          marginBottom: '2px',
          fontWeight: 800
        }}
      >
        {label}
      </div>
      <div style={{ color: '#fff', fontSize: '12px', fontWeight: 900 }}>{value}</div>
    </div>
  );
};

const Tag: React.FC<{ color: string; text: string }> = ({ color, text }) => {
  return (
    <span
      style={{
        color,
        fontWeight: 'bold',
        fontSize: '11px',
        whiteSpace: 'nowrap'
      }}
    >
      {text}
    </span>
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
