import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

type WeaponDetails = {
  weaponId: string;
  name: string;
  description?: string | null;
  upgradeLevel?: number | null;
};

type InventoryItem = {
  id: string;
  type: 'CHARACTER' | 'WEAPON';
  details: WeaponDetails;
};

type WeaponMeta = {
  damage: number;
  fireRate: string;
  range: string;
  projectile: string;
  rarity: string;
  maxLevel: number;
  upgradeFocus: string;
  icon: string;
};

const WEAPON_META: Record<string, WeaponMeta> = {
  oink_pistol: {
    damage: 1,
    fireRate: 'Balanced',
    range: 'Medium',
    projectile: 'Standard Bullet',
    rarity: 'Common',
    maxLevel: 5,
    upgradeFocus: 'Damage / Fire Rate',
    icon: 'Oink-9-Pistol.png'
  },
  sow_machinegun: {
    damage: 1,
    fireRate: 'Very Fast',
    range: 'Medium',
    projectile: 'Standard Bullet',
    rarity: 'Rare',
    maxLevel: 5,
    upgradeFocus: 'Fire Rate / Stability',
    icon: 'Sow-MP5.png'
  },
  boar_rifle: {
    damage: 1,
    fireRate: 'Fast',
    range: 'Long',
    projectile: 'Standard Bullet',
    rarity: 'Rare',
    maxLevel: 5,
    upgradeFocus: 'Damage / Range',
    icon: 'Boar-AR15.png'
  },
  tusk_shotgun: {
    damage: 1,
    fireRate: 'Slow',
    range: 'Short',
    projectile: 'Scatter Shell',
    rarity: 'Epic',
    maxLevel: 5,
    upgradeFocus: 'Pellet Damage / Spread',
    icon: 'Double-Tusk-Shotgun.png'
  },
  sniper_swine: {
    damage: 2,
    fireRate: 'Very Slow',
    range: 'Extreme',
    projectile: 'Sniper Round',
    rarity: 'Epic',
    maxLevel: 5,
    upgradeFocus: 'Damage / Piercing',
    icon: 'Longbore-Sniper.png'
  },
  belcha_minigun: {
    damage: 1,
    fireRate: 'Extreme',
    range: 'Medium',
    projectile: 'Heavy Bullet',
    rarity: 'Legendary',
    maxLevel: 5,
    upgradeFocus: 'Fire Rate / Heat Control',
    icon: 'Belcha-Minigun.png'
  },
  plasma_porker: {
    damage: 2,
    fireRate: 'Medium',
    range: 'Medium',
    projectile: 'Plasma Globule',
    rarity: 'Legendary',
    maxLevel: 5,
    upgradeFocus: 'Damage / Splash',
    icon: 'Plasma-Porker-X.png'
  },
  bacon_blaster: {
    damage: 3,
    fireRate: 'Slow',
    range: 'Long',
    projectile: 'Explosive Rocket',
    rarity: 'Mythic',
    maxLevel: 5,
    upgradeFocus: 'Explosion Damage / Radius',
    icon: 'Bacon-Blaster-9000.png'
  }
};

const DEFAULT_META: WeaponMeta = {
  damage: 1,
  fireRate: 'Standard',
  range: 'Medium',
  projectile: 'Standard',
  rarity: 'Common',
  maxLevel: 5,
  upgradeFocus: 'Damage / Rate',
  icon: 'Standard-Bullet.png'
};

export const WeaponSelect: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEquipping, setIsEquipping] = useState(false);
  const [upgradingWeaponId, setUpgradingWeaponId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile.currentPigs || 0;

  useEffect(() => {
    void loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const res = await apiClient.get('/api/inventory');
      const items = Array.isArray(res.data?.items) ? res.data.items : [];

      const weapons = items.filter(
        (item: InventoryItem) => item.type === 'WEAPON' && item.details?.weaponId
      );

      setInventory(weapons);

      const equippedId = res.data?.equipped?.weaponId || weapons[0]?.details.weaponId || null;
      setEquippedWeaponId(equippedId);
      setSelectedWeaponId((prev) => prev || equippedId);
    } catch (error) {
      console.error('Failed to load weapon inventory:', error);
      setLoadError('Failed to load armory inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWeapon = useMemo(
    () => inventory.find((item) => item.details.weaponId === selectedWeaponId) || null,
    [inventory, selectedWeaponId]
  );

  const getMeta = (weaponId: string) => WEAPON_META[weaponId] || DEFAULT_META;

  const getImageFilename = (id: string) => `/assets/sprites/${getMeta(id).icon}`;

  const getUpgradeLevel = (weapon: InventoryItem) => Math.max(0, weapon.details.upgradeLevel || 0);

  const getUpgradeCost = (weapon: InventoryItem) => {
    const level = getUpgradeLevel(weapon);
    return 150 + level * 125;
  };

  const getBoostedDamage = (weapon: InventoryItem) => {
    const meta = getMeta(weapon.details.weaponId);
    const level = getUpgradeLevel(weapon);
    return meta.damage + level;
  };

  const confirmWeapon = async () => {
    if (!selectedWeaponId) {
      alert('Select a weapon first.');
      return;
    }

    try {
      setIsEquipping(true);
      await apiClient.post('/api/inventory/equip', { weaponId: selectedWeaponId });
      setEquippedWeaponId(selectedWeaponId);
      await refreshProfile();
      alert('Weapon equipped.');
    } catch (error) {
      console.error('Failed to equip weapon:', error);
      alert('Failed to equip weapon.');
    } finally {
      setIsEquipping(false);
    }
  };

  const upgradeWeapon = async (weapon: InventoryItem) => {
    const weaponId = weapon.details.weaponId;
    const level = getUpgradeLevel(weapon);
    const meta = getMeta(weaponId);
    const cost = getUpgradeCost(weapon);

    if (level >= meta.maxLevel) {
      alert('Weapon already at max level.');
      return;
    }

    if (currentPigs < cost) {
      alert('Not enough $PIGS.');
      return;
    }

    try {
      setUpgradingWeaponId(weaponId);

      await apiClient.post('/api/inventory/upgrade-weapon', {
        weaponId
      });

      await Promise.all([loadInventory(), refreshProfile()]);
      alert('Weapon upgraded.');
    } catch (error: any) {
      console.error('Failed to upgrade weapon:', error);
      const message =
        error?.response?.data?.error ||
        'Weapon upgrade endpoint is not ready yet on the backend.';
      alert(message);
    } finally {
      setUpgradingWeaponId(null);
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
        LOADING ARMORY...
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
            border: '2px solid #888',
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
            border: '2px solid #888',
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
          <h2 style={{ marginTop: 0, color: '#888' }}>No Weapons Available</h2>
          <p style={{ color: '#bbb', marginBottom: 0 }}>
            Your armory has no weapons yet. Acquire one in the shop first.
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
            border: '2px solid #888',
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
            color: '#ffd700',
            margin: 0,
            textTransform: 'uppercase'
          }}
        >
          Armory
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
          <img
            src="/assets/sprites/pig-token.png"
            style={{ width: '18px', height: '18px' }}
            alt=""
          />
          {currentPigs}
        </div>
      </div>

      {selectedWeapon ? (
        <div
          style={{
            background: '#161616',
            border: '2px solid #888',
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
              width: '96px',
              height: '74px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={getImageFilename(selectedWeapon.details.weaponId)}
              alt={selectedWeapon.details.name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.src = '/assets/sprites/Standard-Bullet.png';
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
              CURRENT WEAPON
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
              {selectedWeapon.details.name}
            </div>
            <div style={{ color: '#ffb74d', fontWeight: 700, marginTop: '4px', fontSize: '13px' }}>
              {getMeta(selectedWeapon.details.weaponId).rarity} • LVL {getUpgradeLevel(selectedWeapon)}
              /{getMeta(selectedWeapon.details.weaponId).maxLevel}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px',
                marginTop: '10px'
              }}
            >
              <SpecPill label="Damage" value={String(getBoostedDamage(selectedWeapon))} />
              <SpecPill
                label="Fire Rate"
                value={getMeta(selectedWeapon.details.weaponId).fireRate}
              />
              <SpecPill label="Range" value={getMeta(selectedWeapon.details.weaponId).range} />
              <SpecPill
                label="Projectile"
                value={getMeta(selectedWeapon.details.weaponId).projectile}
              />
            </div>
            <div style={{ color: '#8fcfff', fontSize: '12px', marginTop: '10px', fontWeight: 700 }}>
              Upgrade Path: {getMeta(selectedWeapon.details.weaponId).upgradeFocus}
            </div>
            {selectedWeapon.details.description ? (
              <div style={{ color: '#bbb', fontSize: '13px', marginTop: '8px' }}>
                {selectedWeapon.details.description}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        {inventory.map((item) => {
          const weaponId = item.details.weaponId;
          const meta = getMeta(weaponId);
          const isSelected = selectedWeaponId === weaponId;
          const isEquipped = equippedWeaponId === weaponId;
          const level = getUpgradeLevel(item);
          const isMax = level >= meta.maxLevel;
          const upgradeCost = getUpgradeCost(item);
          const canUpgrade = !isMax && currentPigs >= upgradeCost && upgradingWeaponId !== weaponId;

          return (
            <button
              key={weaponId}
              type="button"
              onClick={() => setSelectedWeaponId(weaponId)}
              style={{
                background: isSelected ? '#1d1d1d' : '#222',
                padding: '15px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                border: `2px solid ${isSelected ? '#ffd700' : '#333'}`,
                color: '#fff',
                textAlign: 'left',
                boxShadow: isSelected ? '0 8px 20px rgba(255,215,0,0.14)' : 'none'
              }}
            >
              <div
                style={{
                  background: '#111',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  width: '88px',
                  height: '64px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                <img
                  src={getImageFilename(weaponId)}
                  alt={item.details.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.src = '/assets/sprites/Standard-Bullet.png';
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#fff' }}>
                  {item.details.name}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '6px',
                    color: '#aaa',
                    fontSize: '12px'
                  }}
                >
                  <span>DMG: {getBoostedDamage(item)}</span>
                  <span>RATE: {meta.fireRate}</span>
                  <span>RANGE: {meta.range}</span>
                  <span>LVL: {level}/{meta.maxLevel}</span>
                </div>

                <p style={{ margin: '0 0 8px 0', color: '#bbb', fontSize: '12px' }}>
                  {item.details.description || 'Owned combat weapon with upgrade potential.'}
                </p>

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
                {isEquipped ? (
                  <span
                    style={{
                      color: '#4caf50',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    EQUIPPED
                  </span>
                ) : null}

                {isSelected ? (
                  <span
                    style={{
                      color: '#ffd700',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    SELECTED
                  </span>
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
                      void upgradeWeapon(item);
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
                    {upgradingWeaponId === weaponId ? '...' : upgradeCost}
                  </button>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => void confirmWeapon()}
        disabled={!selectedWeaponId || isEquipping}
        style={{
          padding: '14px 20px',
          background: !selectedWeaponId || isEquipping ? '#555' : '#ffd700',
          border: 'none',
          color: !selectedWeaponId || isEquipping ? '#ddd' : '#111',
          borderRadius: '10px',
          cursor: !selectedWeaponId || isEquipping ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginTop: 'auto'
        }}
      >
        {isEquipping ? 'EQUIPPING...' : 'EQUIP SELECTED WEAPON'}
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
