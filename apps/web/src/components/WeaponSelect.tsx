import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

type WeaponDetails = {
  weaponId: string;
  name: string;
  type?: string | null;
  damage?: number | null;
  description?: string | null;
  upgradeLevel?: number | null;
};

type InventoryItem = {
  id: string;
  type: 'CHARACTER' | 'WEAPON';
  acquiredAt?: string;
  timesUsed?: number;
  details: WeaponDetails;
};

type WeaponBaseStats = {
  damage: number;
  fireRate: number;
  bulletSpeed: number;
  projectileLifetime: number;
  type: string;
};

const MAX_WEAPON_LEVEL = 5;

const WEAPON_BASE_STATS: Record<string, WeaponBaseStats> = {
  oink_pistol: {
    damage: 1,
    fireRate: 320,
    bulletSpeed: 760,
    projectileLifetime: 1200,
    type: 'Sidearm'
  },
  sow_machinegun: {
    damage: 1,
    fireRate: 120,
    bulletSpeed: 820,
    projectileLifetime: 1000,
    type: 'SMG'
  },
  boar_rifle: {
    damage: 1,
    fireRate: 180,
    bulletSpeed: 900,
    projectileLifetime: 1100,
    type: 'Rifle'
  },
  tusk_shotgun: {
    damage: 1,
    fireRate: 500,
    bulletSpeed: 700,
    projectileLifetime: 650,
    type: 'Shotgun'
  },
  sniper_swine: {
    damage: 2,
    fireRate: 900,
    bulletSpeed: 1200,
    projectileLifetime: 1400,
    type: 'Sniper'
  },
  belcha_minigun: {
    damage: 1,
    fireRate: 90,
    bulletSpeed: 860,
    projectileLifetime: 950,
    type: 'Heavy'
  },
  plasma_porker: {
    damage: 2,
    fireRate: 420,
    bulletSpeed: 640,
    projectileLifetime: 1300,
    type: 'Plasma'
  },
  bacon_blaster: {
    damage: 3,
    fireRate: 700,
    bulletSpeed: 620,
    projectileLifetime: 1200,
    type: 'Launcher'
  }
};

const getUpgradeCost = (level: number) => 150 + level * 125;

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

export const WeaponSelect: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradingWeaponId, setUpgradingWeaponId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile.currentPigs || 0;

  const loadInventory = useCallback(async () => {
    try {
      setLoadError(null);

      const res = await apiClient.get('/api/inventory');
      const items = Array.isArray(res.data?.items) ? res.data.items : [];

      const weapons = items.filter(
        (item: InventoryItem) => item.type === 'WEAPON' && item.details?.weaponId
      );

      setInventory(weapons);

      const equippedId = res.data?.equipped?.weaponId || weapons[0]?.details.weaponId || null;
      setEquippedWeaponId(equippedId);
      setSelectedWeaponId((current) => current || equippedId);
    } catch (error) {
      console.error('Failed to load weapon inventory:', error);
      setLoadError('Failed to load armory inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const selectedWeapon = useMemo(
    () => inventory.find((item) => item.details.weaponId === selectedWeaponId) || null,
    [inventory, selectedWeaponId]
  );

  const getImageFilename = (id: string) => {
    const map: Record<string, string> = {
      oink_pistol: 'Oink-9-Pistol.png',
      sow_machinegun: 'Sow-MP5.png',
      boar_rifle: 'Boar-AR15.png',
      tusk_shotgun: 'Double-Tusk-Shotgun.png',
      sniper_swine: 'Longbore-Sniper.png',
      belcha_minigun: 'Belcha-Minigun.png',
      plasma_porker: 'Plasma-Porker-X.png',
      bacon_blaster: 'Bacon-Blaster-9000.png'
    };

    return `/assets/sprites/${map[id] || 'Standard-Bullet.png'}`;
  };

  const getWeaponStats = (weapon: WeaponDetails) => {
    const level = Math.max(0, Number(weapon.upgradeLevel ?? 0));
    const base = WEAPON_BASE_STATS[weapon.weaponId] || {
      damage: Number(weapon.damage ?? 1),
      fireRate: 320,
      bulletSpeed: 700,
      projectileLifetime: 1000,
      type: weapon.type || 'Weapon'
    };

    const fireRateReduction = Math.min(0.22, level * 0.04);
    const fireRate = Math.max(60, Math.floor(base.fireRate * (1 - fireRateReduction)));
    const bulletSpeed = base.bulletSpeed + level * 35;
    const projectileLifetime = base.projectileLifetime + level * 70;

    return {
      level,
      damage: base.damage + level,
      fireRate,
      bulletSpeed,
      range: Math.round((bulletSpeed * projectileLifetime) / 1000),
      type: base.type
    };
  };

  const confirmWeapon = async () => {
    if (!selectedWeaponId) {
      alert('Select a weapon first.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { weaponId: selectedWeaponId });
      await refreshProfile();
      setEquippedWeaponId(selectedWeaponId);
      alert('Weapon equipped.');
      onBack();
    } catch (error) {
      console.error('Failed to equip weapon:', error);
      alert(getErrorMessage(error, 'Failed to equip weapon.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const upgradeWeapon = async (weaponId: string) => {
    if (upgradingWeaponId) return;

    try {
      setUpgradingWeaponId(weaponId);
      await apiClient.post('/api/inventory/upgrade-weapon', { weaponId });
      await Promise.all([loadInventory(), refreshProfile()]);
      setSelectedWeaponId(weaponId);
      alert('Weapon upgraded.');
    } catch (error) {
      console.error('Failed to upgrade weapon:', error);
      alert(getErrorMessage(error, 'Weapon upgrade failed.'));
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
        <button onClick={onBack} style={backButtonStyle}>
          BACK TO MENU
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
          BACK TO MENU
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
            Your armory has no weapons yet. Buy one from the shop before deployment.
          </p>
        </div>
      </div>
    );
  }

  const selectedStats = selectedWeapon ? getWeaponStats(selectedWeapon.details) : null;

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
          marginBottom: '18px',
          gap: '12px'
        }}
      >
        <button onClick={onBack} style={backButtonStyle}>
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
            alt=""
            style={{ width: '18px', height: '18px', objectFit: 'contain' }}
          />
          {currentPigs}
        </div>
      </div>

      {selectedWeapon && selectedStats ? (
        <div
          style={{
            background: '#161616',
            border: '2px solid #ffd700',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '18px',
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            flexWrap: 'wrap',
            boxShadow: '0 8px 22px rgba(255,215,0,0.1)'
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
              CURRENT SELECTION
            </div>

            <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>
              {selectedWeapon.details.name}
            </div>

            <div
              style={{
                color: '#ffd700',
                fontWeight: 800,
                fontSize: '13px',
                marginTop: '4px'
              }}
            >
              LEVEL {selectedStats.level}/{MAX_WEAPON_LEVEL} · {selectedStats.type}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
                gap: '8px',
                marginTop: '10px'
              }}
            >
              <Stat label="DMG" value={selectedStats.damage} />
              <Stat label="RATE" value={`${selectedStats.fireRate}ms`} />
              <Stat label="SPEED" value={selectedStats.bulletSpeed} />
              <Stat label="RANGE" value={selectedStats.range} />
            </div>

            {selectedWeapon.details.description ? (
              <div style={{ color: '#bbb', fontSize: '13px', marginTop: '10px' }}>
                {selectedWeapon.details.description}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {inventory.map((item) => {
          const weaponId = item.details.weaponId;
          const stats = getWeaponStats(item.details);
          const isSelected = selectedWeaponId === weaponId;
          const isEquipped = equippedWeaponId === weaponId;
          const isMaxed = stats.level >= MAX_WEAPON_LEVEL;
          const upgradeCost = getUpgradeCost(stats.level);
          const canAfford = currentPigs >= upgradeCost;
          const isUpgrading = upgradingWeaponId === weaponId;

          return (
            <div
              key={weaponId}
              style={{
                background: isSelected ? '#1d1d1d' : '#222',
                padding: '14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                border: `2px solid ${isSelected ? '#ffd700' : '#333'}`,
                color: '#fff',
                boxShadow: isSelected ? '0 8px 20px rgba(255,215,0,0.14)' : 'none'
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedWeaponId(weaponId)}
                style={{
                  background: '#111',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  width: '76px',
                  height: '58px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0,
                  cursor: 'pointer'
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
              </button>

              <button
                type="button"
                onClick={() => setSelectedWeaponId(weaponId)}
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
                <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#fff' }}>
                  {item.details.name}
                </h3>

                <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>
                  LVL {stats.level}/{MAX_WEAPON_LEVEL} · DMG {stats.damage} · RATE{' '}
                  {stats.fireRate}ms · RANGE {stats.range}
                </p>

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
                {isSelected ? <Tag color="#ffd700" text="SELECTED" /> : null}

                <button
                  type="button"
                  disabled={isMaxed || !canAfford || isUpgrading}
                  onClick={() => void upgradeWeapon(weaponId)}
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
        onClick={() => void confirmWeapon()}
        disabled={!selectedWeaponId || isSubmitting}
        style={{
          padding: '14px 20px',
          background: !selectedWeaponId || isSubmitting ? '#555' : '#ffd700',
          border: 'none',
          color: !selectedWeaponId || isSubmitting ? '#ddd' : '#111',
          borderRadius: '10px',
          cursor: !selectedWeaponId || isSubmitting ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginTop: 'auto'
        }}
      >
        {isSubmitting ? 'EQUIPPING...' : 'CONFIRM WEAPON'}
      </button>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => {
  return (
    <div
      style={{
        background: '#101010',
        border: '1px solid #303030',
        borderRadius: '8px',
        padding: '8px'
      }}
    >
      <div style={{ color: '#777', fontSize: '10px', fontWeight: 800 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 900 }}>{value}</div>
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
  background: '#444',
  border: '2px solid #888',
  color: '#fff',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold'
};
