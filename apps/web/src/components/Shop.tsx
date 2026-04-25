import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

type ShopCharacter = {
  characterId: string;
  name: string;
  classType: string;
  description?: string | null;
  pricePigs: number;
  unlockLevel: number;
  owned: boolean;
  canAfford: boolean;
  canUnlock: boolean;
};

type ShopWeapon = {
  weaponId: string;
  name: string;
  type: string;
  damage: number;
  description?: string | null;
  pricePigs: number;
  unlockLevel: number;
  owned: boolean;
  canAfford: boolean;
  canUnlock: boolean;
};

type ShopPayload = {
  characters: ShopCharacter[];
  weapons: ShopWeapon[];
};

type ViewMode = 'WEAPONS' | 'CHARACTERS';

type WeaponMeta = {
  fireRate: string;
  range: string;
  projectile: string;
  rarity: string;
  upgradeFocus: string;
};

type CharacterMeta = {
  powerName: string;
  cooldown: string;
  powerEffect: string;
  upgradeFocus: string;
};

const WEAPON_META: Record<string, WeaponMeta> = {
  oink_pistol: {
    fireRate: 'Balanced',
    range: 'Medium',
    projectile: 'Standard Bullet',
    rarity: 'Common',
    upgradeFocus: 'Damage / Fire Rate'
  },
  sow_machinegun: {
    fireRate: 'Very Fast',
    range: 'Medium',
    projectile: 'Standard Bullet',
    rarity: 'Rare',
    upgradeFocus: 'Fire Rate / Stability'
  },
  boar_rifle: {
    fireRate: 'Fast',
    range: 'Long',
    projectile: 'Standard Bullet',
    rarity: 'Rare',
    upgradeFocus: 'Damage / Range'
  },
  tusk_shotgun: {
    fireRate: 'Slow',
    range: 'Short',
    projectile: 'Scatter Shell',
    rarity: 'Epic',
    upgradeFocus: 'Pellet Damage / Spread'
  },
  sniper_swine: {
    fireRate: 'Very Slow',
    range: 'Extreme',
    projectile: 'Sniper Round',
    rarity: 'Epic',
    upgradeFocus: 'Damage / Piercing'
  },
  belcha_minigun: {
    fireRate: 'Extreme',
    range: 'Medium',
    projectile: 'Heavy Bullet',
    rarity: 'Legendary',
    upgradeFocus: 'Fire Rate / Heat Control'
  },
  plasma_porker: {
    fireRate: 'Medium',
    range: 'Medium',
    projectile: 'Plasma Globule',
    rarity: 'Legendary',
    upgradeFocus: 'Damage / Splash'
  },
  bacon_blaster: {
    fireRate: 'Slow',
    range: 'Long',
    projectile: 'Explosive Rocket',
    rarity: 'Mythic',
    upgradeFocus: 'Explosion Damage / Radius'
  }
};

const CHARACTER_META: Record<string, CharacterMeta> = {
  grunt_bacon: {
    powerName: 'Mud Slow',
    cooldown: '6s',
    powerEffect: 'Slows nearby enemies for a short duration.',
    upgradeFocus: 'Slow Strength / Radius / Duration'
  },
  iron_tusk: {
    powerName: 'Shield Rush',
    cooldown: '7s',
    powerEffect: 'Temporary damage reduction with a short shockwave.',
    upgradeFocus: 'Damage Reduction / Shockwave Radius'
  },
  swift_hoof: {
    powerName: 'Tactical Dash',
    cooldown: '4.5s',
    powerEffect: 'Short burst dash with high mobility.',
    upgradeFocus: 'Dash Distance / Cooldown'
  },
  precision_squeal: {
    powerName: 'Focus Mode',
    cooldown: '7s',
    powerEffect: 'Increases precision and burst damage briefly.',
    upgradeFocus: 'Bonus Damage / Duration / Cooldown'
  },
  blast_ham: {
    powerName: 'Demolition Burst',
    cooldown: '6.5s',
    powerEffect: 'Explosion damages nearest enemies.',
    upgradeFocus: 'Blast Damage / Enemy Count / Radius'
  },
  general_goldsnout: {
    powerName: 'Battle Command',
    cooldown: '8s',
    powerEffect: 'Boosts combat efficiency for a short time.',
    upgradeFocus: 'Buff Strength / Duration / Cooldown'
  }
};

export const Shop: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [items, setItems] = useState<ShopPayload>({ characters: [], weapons: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('WEAPONS');

  const { user, refreshProfile } = useGameStore();

  const currentPigs = user?.profile.currentPigs || 0;

  useEffect(() => {
    void loadShop();
  }, []);

  const loadShop = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/shop/items');
      setItems(res.data);
    } catch (error) {
      console.error('Failed to load shop:', error);
      alert('Failed to load shop.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async (type: 'CHARACTER' | 'WEAPON', id: string) => {
    const key = `${type}:${id}`;

    try {
      setBuyingKey(key);
      await apiClient.post('/api/shop/buy', { itemType: type, itemId: id });
      await Promise.all([loadShop(), refreshProfile()]);
      alert('Purchase successful.');
    } catch (error: any) {
      console.error('Purchase failed:', error);
      const message =
        error?.response?.data?.error ||
        'Purchase failed. Check your level and $PIGS balance.';
      alert(message);
    } finally {
      setBuyingKey(null);
    }
  };

  const getImageFilename = (id: string) => {
    const map: Record<string, string> = {
      grunt_bacon: 'Grunt-Bacon.png',
      iron_tusk: 'Iron-Tusk.png',
      swift_hoof: 'Swift-Hoof.png',
      precision_squeal: 'Precision-Squeal.png',
      blast_ham: 'Blast-Ham.png',
      general_goldsnout: 'General-Goldsnout.png',
      oink_pistol: 'Oink-9-Pistol.png',
      sow_machinegun: 'Sow-MP5.png',
      boar_rifle: 'Boar-AR15.png',
      tusk_shotgun: 'Double-Tusk-Shotgun.png',
      sniper_swine: 'Longbore-Sniper.png',
      belcha_minigun: 'Belcha-Minigun.png',
      plasma_porker: 'Plasma-Porker-X.png',
      bacon_blaster: 'Bacon-Blaster-9000.png'
    };

    return `/assets/sprites/${map[id] || 'pig-token.png'}`;
  };

  const sortedCharacters = useMemo(
    () =>
      [...items.characters].sort((a, b) => {
        if (a.owned !== b.owned) return Number(a.owned) - Number(b.owned);
        return a.pricePigs - b.pricePigs;
      }),
    [items.characters]
  );

  const sortedWeapons = useMemo(
    () =>
      [...items.weapons].sort((a, b) => {
        if (a.owned !== b.owned) return Number(a.owned) - Number(b.owned);
        return a.pricePigs - b.pricePigs;
      }),
    [items.weapons]
  );

  const renderBuyState = (
    type: 'CHARACTER' | 'WEAPON',
    id: string,
    owned: boolean,
    canUnlock: boolean,
    canAfford: boolean,
    pricePigs: number
  ) => {
    const key = `${type}:${id}`;
    const disabled = owned || !canAfford || !canUnlock || buyingKey === key;

    if (owned) {
      return <span style={{ color: '#4caf50', fontWeight: 800 }}>OWNED</span>;
    }

    if (!canUnlock) {
      return <span style={{ color: '#ff9800', fontWeight: 800 }}>LOCKED</span>;
    }

    if (!canAfford) {
      return <span style={{ color: '#ff6b6b', fontWeight: 800 }}>NO $PIGS</span>;
    }

    return (
      <button
        disabled={disabled}
        onClick={() => void handleBuy(type, id)}
        style={{
          padding: '10px 14px',
          background: disabled ? '#555' : '#ff6b35',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <img
          src="/assets/sprites/pig-token.png"
          style={{ width: '16px', height: '16px' }}
          alt=""
        />
        {buyingKey === key ? '...' : pricePigs}
      </button>
    );
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
        LOADING SHOP...
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
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px',
          gap: '12px'
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '10px 18px',
            background: '#444',
            border: '2px solid #ffd700',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 800
          }}
        >
          BACK
        </button>

        <h2 style={{ color: '#ffd700', margin: 0, textTransform: 'uppercase' }}>Shop</h2>

        <div
          style={{
            minWidth: '110px',
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
            style={{ width: '18px', height: '18px' }}
            alt=""
          />
          {currentPigs}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '20px'
        }}
      >
        <button
          onClick={() => setViewMode('WEAPONS')}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            border: `2px solid ${viewMode === 'WEAPONS' ? '#ff6b35' : '#333'}`,
            background: viewMode === 'WEAPONS' ? '#24150f' : '#181818',
            color: '#fff',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          EQUIPMENT
        </button>

        <button
          onClick={() => setViewMode('CHARACTERS')}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            border: `2px solid ${viewMode === 'CHARACTERS' ? '#ff6b35' : '#333'}`,
            background: viewMode === 'CHARACTERS' ? '#24150f' : '#181818',
            color: '#fff',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          UNITS
        </button>
      </div>

      {viewMode === 'WEAPONS' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedWeapons.map((weapon) => {
            const meta = WEAPON_META[weapon.weaponId] || {
              fireRate: 'Standard',
              range: 'Medium',
              projectile: 'Standard',
              rarity: 'Common',
              upgradeFocus: 'Damage / Rate'
            };

            return (
              <div
                key={weapon.weaponId}
                style={{
                  background: '#171717',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '2px solid #2f2f2f',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: '84px',
                    minWidth: '84px',
                    height: '84px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: '10px',
                    padding: '8px',
                    boxSizing: 'border-box'
                  }}
                >
                  <img
                    src={getImageFilename(weapon.weaponId)}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    alt={weapon.name}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '8px'
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{weapon.name}</h3>
                      <div style={{ color: '#ffb74d', fontSize: '12px', fontWeight: 800 }}>
                        {meta.rarity} • {weapon.type}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {renderBuyState(
                        'WEAPON',
                        weapon.weaponId,
                        weapon.owned,
                        weapon.canUnlock,
                        weapon.canAfford,
                        weapon.pricePigs
                      )}
                      <div style={{ color: '#999', fontSize: '11px', marginTop: '6px' }}>
                        REQ LVL {weapon.unlockLevel}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '6px',
                      marginBottom: '8px'
                    }}
                  >
                    <SpecPill label="Damage" value={String(weapon.damage)} />
                    <SpecPill label="Fire Rate" value={meta.fireRate} />
                    <SpecPill label="Range" value={meta.range} />
                    <SpecPill label="Projectile" value={meta.projectile} />
                  </div>

                  <div style={{ color: '#c7c7c7', fontSize: '12px', marginBottom: '6px' }}>
                    {weapon.description || 'Combat weapon with distinct battlefield stats.'}
                  </div>

                  <div style={{ color: '#8fcfff', fontSize: '12px', fontWeight: 700 }}>
                    Upgrade Path: {meta.upgradeFocus}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedCharacters.map((character) => {
            const meta = CHARACTER_META[character.characterId] || {
              powerName: 'Battle Stim',
              cooldown: '6s',
              powerEffect: 'Temporary combat boost.',
              upgradeFocus: 'Cooldown / Effect Strength'
            };

            return (
              <div
                key={character.characterId}
                style={{
                  background: '#171717',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '2px solid #2f2f2f',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: '84px',
                    minWidth: '84px',
                    height: '84px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: '10px',
                    padding: '8px',
                    boxSizing: 'border-box'
                  }}
                >
                  <img
                    src={getImageFilename(character.characterId)}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    alt={character.name}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '8px'
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
                        {character.name}
                      </h3>
                      <div style={{ color: '#ffb74d', fontSize: '12px', fontWeight: 800 }}>
                        {character.classType}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {renderBuyState(
                        'CHARACTER',
                        character.characterId,
                        character.owned,
                        character.canUnlock,
                        character.canAfford,
                        character.pricePigs
                      )}
                      <div style={{ color: '#999', fontSize: '11px', marginTop: '6px' }}>
                        REQ LVL {character.unlockLevel}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '6px',
                      marginBottom: '8px'
                    }}
                  >
                    <SpecPill label="Power" value={meta.powerName} />
                    <SpecPill label="Cooldown" value={meta.cooldown} />
                  </div>

                  <div style={{ color: '#c7c7c7', fontSize: '12px', marginBottom: '6px' }}>
                    {character.description || 'Pig unit with a unique combat ability.'}
                  </div>

                  <div style={{ color: '#9be38f', fontSize: '12px', fontWeight: 700 }}>
                    Effect: {meta.powerEffect}
                  </div>

                  <div style={{ color: '#8fcfff', fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>
                    Upgrade Path: {meta.upgradeFocus}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
