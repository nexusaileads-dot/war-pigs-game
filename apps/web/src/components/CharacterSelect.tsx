import React, { useEffect, useMemo, useState } from 'react';
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
  details: CharacterDetails;
};

type CharacterMeta = {
  icon: string;
  powerName: string;
  cooldown: string;
  effect: string;
  upgradeFocus: string;
  health: number;
  speed: string;
  maxLevel: number;
};

const CHARACTER_META: Record<string, CharacterMeta> = {
  grunt_bacon: {
    icon: 'Grunt-Bacon.png',
    powerName: 'Mud Slow',
    cooldown: '6s',
    effect: 'Slows nearby enemies for a short duration.',
    upgradeFocus: 'Slow Strength / Radius / Duration',
    health: 100,
    speed: 'Balanced',
    maxLevel: 5
  },
  iron_tusk: {
    icon: 'Iron-Tusk.png',
    powerName: 'Shield Rush',
    cooldown: '7s',
    effect: 'Temporary damage reduction with a shockwave push.',
    upgradeFocus: 'Damage Reduction / Shockwave Radius',
    health: 160,
    speed: 'Slow',
    maxLevel: 5
  },
  swift_hoof: {
    icon: 'Swift-Hoof.png',
    powerName: 'Tactical Dash',
    cooldown: '4.5s',
    effect: 'Fast mobility burst for repositioning.',
    upgradeFocus: 'Dash Distance / Cooldown',
    health: 85,
    speed: 'Very Fast',
    maxLevel: 5
  },
  precision_squeal: {
    icon: 'Precision-Squeal.png',
    powerName: 'Focus Mode',
    cooldown: '7s',
    effect: 'Boosts precision and damage briefly.',
    upgradeFocus: 'Bonus Damage / Duration / Cooldown',
    health: 90,
    speed: 'Balanced',
    maxLevel: 5
  },
  blast_ham: {
    icon: 'Blast-Ham.png',
    powerName: 'Demolition Burst',
    cooldown: '6.5s',
    effect: 'Explosion damages nearest enemies.',
    upgradeFocus: 'Blast Damage / Enemy Count / Radius',
    health: 115,
    speed: 'Medium',
    maxLevel: 5
  },
  general_goldsnout: {
    icon: 'General-Goldsnout.png',
    powerName: 'Battle Command',
    cooldown: '8s',
    effect: 'Temporary boost to combat efficiency.',
    upgradeFocus: 'Buff Strength / Duration / Cooldown',
    health: 125,
    speed: 'Fast',
    maxLevel: 5
  }
};

const DEFAULT_META: CharacterMeta = {
  icon: 'Grunt-Bacon.png',
  powerName: 'Battle Stim',
  cooldown: '6s',
  effect: 'Temporary combat boost.',
  upgradeFocus: 'Cooldown / Effect Strength',
  health: 100,
  speed: 'Balanced',
  maxLevel: 5
};

export const CharacterSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({
  onBack,
  onStart
}) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradingCharacterId, setUpgradingCharacterId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile.currentPigs || 0;

  useEffect(() => {
    void loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoadError(null);
      setIsLoading(true);

      const res = await apiClient.get('/api/inventory');
      const items = Array.isArray(res.data?.items) ? res.data.items : [];

      const characters = items.filter(
        (item: InventoryItem) => item.type === 'CHARACTER' && item.details?.characterId
      );

      setInventory(characters);
      setSelectedCharacterId(
        (prev) => prev || res.data?.equipped?.characterId || characters[0]?.details.characterId || null
      );
    } catch (error) {
      console.error('Failed to load character inventory:', error);
      setLoadError('Failed to load squad inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCharacter = useMemo(
    () => inventory.find((item) => item.details.characterId === selectedCharacterId) || null,
    [inventory, selectedCharacterId]
  );

  const getMeta = (characterId: string) => CHARACTER_META[characterId] || DEFAULT_META;

  const getCharacterImage = (characterId: string) => `/assets/sprites/${getMeta(characterId).icon}`;

  const getClassIcon = (classType: string) => {
    const classMap: Record<string, string> = {
      ASSAULT: 'assault.png',
      TANK: 'tank.png',
      SNIPER: 'sniper.png',
      SCOUT: 'scout.png',
      DEMOLITION: 'Demolition.png',
      ELITE: 'Elite.png'
    };

    return `/assets/sprites/${classMap[classType.toUpperCase()] || 'assault.png'}`;
  };

  const getUpgradeLevel = (character: InventoryItem) =>
    Math.max(0, character.details.upgradeLevel || 0);

  const getUpgradeCost = (character: InventoryItem) => {
    const level = getUpgradeLevel(character);
    return 200 + level * 150;
  };

  const getBoostedHealth = (character: InventoryItem) => {
    const meta = getMeta(character.details.characterId);
    const level = getUpgradeLevel(character);
    return meta.health + level * 10;
  };

  const getCooldownPreview = (character: InventoryItem) => {
    const meta = getMeta(character.details.characterId);
    const level = getUpgradeLevel(character);
    const numeric = Number.parseFloat(meta.cooldown.replace('s', ''));
    if (Number.isNaN(numeric)) return meta.cooldown;
    return `${Math.max(2, numeric - level * 0.3).toFixed(1)}s`;
  };

  const confirmSelection = async () => {
    if (!selectedCharacterId) {
      alert('Select a character first.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { characterId: selectedCharacterId });
      await refreshProfile();
      onStart();
    } catch (error) {
      console.error('Failed to equip character:', error);
      alert('Failed to equip character.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const upgradeCharacter = async (character: InventoryItem) => {
    const characterId = character.details.characterId;
    const level = getUpgradeLevel(character);
    const meta = getMeta(characterId);
    const cost = getUpgradeCost(character);

    if (level >= meta.maxLevel) {
      alert('Character already at max level.');
      return;
    }

    if (currentPigs < cost) {
      alert('Not enough $PIGS.');
      return;
    }

    try {
      setUpgradingCharacterId(characterId);

      await apiClient.post('/api/inventory/upgrade-character', {
        characterId
      });

      await Promise.all([loadInventory(), refreshProfile()]);
      alert('Character upgraded.');
    } catch (error: any) {
      console.error('Failed to upgrade character:', error);
      const message =
        error?.response?.data?.error ||
        'Character upgrade endpoint is not ready yet on the backend.';
      alert(message);
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
            fontWeight: 'bold',
            alignSelf: 'flex-start'
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
          <h2 style={{ marginTop: 0, color: '#ff6b35' }}>No Units Available</h2>
          <p style={{ color: '#bbb', marginBottom: 0 }}>
            Your inventory has no character units yet. Buy one in the shop first.
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
        minHeight: '100vh',
        overflowY: 'auto',
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
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            background: '#444',
            border: '2px solid #ff6b35',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            alignSelf: 'flex-start'
          }}
        >
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
            minWidth: '110px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '6px',
            color: '#ffd700',
            fontWeight: 'bold'
          }}
        >
          <img src="/assets/sprites/pig-token.png" style={{ width: '18px', height: '18px' }} alt="" />
          {currentPigs}
        </div>
      </div>

      {selectedCharacter ? (
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
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              background: '#101010',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #333',
              width: '86px',
              height: '86px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
              {selectedCharacter.details.name}
            </div>
            <div style={{ color: '#ffb74d', fontWeight: 700, marginTop: '4px' }}>
              {selectedCharacter.details.classType} • LVL {getUpgradeLevel(selectedCharacter)}/
              {getMeta(selectedCharacter.details.characterId).maxLevel}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px',
                marginTop: '10px'
              }}
            >
              <SpecPill label="Health" value={String(getBoostedHealth(selectedCharacter))} />
              <SpecPill label="Speed" value={getMeta(selectedCharacter.details.characterId).speed} />
              <SpecPill label="Power" value={getMeta(selectedCharacter.details.characterId).powerName} />
              <SpecPill label="Cooldown" value={getCooldownPreview(selectedCharacter)} />
            </div>

            <div style={{ color: '#9be38f', fontSize: '12px', marginTop: '10px', fontWeight: 700 }}>
              Effect: {getMeta(selectedCharacter.details.characterId).effect}
            </div>

            <div style={{ color: '#8fcfff', fontSize: '12px', marginTop: '6px', fontWeight: 700 }}>
              Upgrade Path: {getMeta(selectedCharacter.details.characterId).upgradeFocus}
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
              width: '66px',
              height: '66px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={getClassIcon(selectedCharacter.details.classType)}
              alt={selectedCharacter.details.classType}
              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.src = '/assets/sprites/assault.png';
              }}
            />
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
        {inventory.map((item) => {
          const isSelected = selectedCharacterId === item.details.characterId;
          const level = getUpgradeLevel(item);
          const meta = getMeta(item.details.characterId);
          const isMax = level >= meta.maxLevel;
          const upgradeCost = getUpgradeCost(item);
          const canUpgrade = !isMax && currentPigs >= upgradeCost && upgradingCharacterId !== item.details.characterId;

          return (
            <button
              key={item.details.characterId}
              type="button"
              onClick={() => setSelectedCharacterId(item.details.characterId)}
              style={{
                background: isSelected ? '#2a1b14' : '#222',
                padding: '15px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                border: `2px solid ${isSelected ? '#ff6b35' : '#333'}`,
                color: '#fff',
                textAlign: 'left',
                boxShadow: isSelected ? '0 8px 20px rgba(255,107,53,0.18)' : 'none'
              }}
            >
              <div
                style={{
                  background: '#111',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  width: '76px',
                  height: '76px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <img
                  src={getCharacterImage(item.details.characterId)}
                  alt={item.details.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.src = '/assets/sprites/Grunt-Bacon.png';
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#fff' }}>
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
                  <span>HP: {getBoostedHealth(item)}</span>
                  <span>LVL: {level}/{meta.maxLevel}</span>
                </div>

                <div style={{ color: '#ffb74d', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  POWER: {meta.powerName} • CD: {getCooldownPreview(item)}
                </div>

                {item.details.description ? (
                  <p style={{ margin: '0 0 6px 0', color: '#bbb', fontSize: '13px' }}>
                    {item.details.description}
                  </p>
                ) : null}

                <div style={{ color: '#8fcfff', fontSize: '12px', fontWeight: 700 }}>
                  Upgrade: {meta.upgradeFocus}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'flex-end',
                  flexShrink: 0
                }}
              >
                {isSelected ? (
                  <div style={{ color: '#ff6b35', fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '12px' }}>
                    SELECTED
                  </div>
                ) : null}

                {isMax ? (
                  <span
                    style={{
                      color: '#90caf9',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    MAX LEVEL
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void upgradeCharacter(item);
                    }}
                    disabled={!canUpgrade}
                    style={{
                      padding: '8px 12px',
                      background: canUpgrade ? '#ff6b35' : '#555',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: canUpgrade ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <img
                      src="/assets/sprites/pig-token.png"
                      style={{ width: '14px', height: '14px' }}
                      alt=""
                    />
                    {upgradingCharacterId === item.details.characterId ? '...' : upgradeCost}
                  </button>
                )}
              </div>
            </button>
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

const SpecPill: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div
      style={{
        background: '#222',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '8px 10px'
      }}
    >
      <div style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>{value}</div>
    </div>
  );
};
