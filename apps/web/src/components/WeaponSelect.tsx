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
  oink_pistol: { damage: 1, fireRate: 320, bulletSpeed: 840, projectileLifetime: 1200, type: 'Sidearm' },
  sow_machinegun: { damage: 1, fireRate: 120, bulletSpeed: 900, projectileLifetime: 1000, type: 'SMG' },
  boar_rifle: { damage: 1, fireRate: 180, bulletSpeed: 980, projectileLifetime: 1100, type: 'Rifle' },
  tusk_shotgun: { damage: 1, fireRate: 500, bulletSpeed: 760, projectileLifetime: 650, type: 'Shotgun' },
  sniper_swine: { damage: 2, fireRate: 850, bulletSpeed: 1300, projectileLifetime: 1450, type: 'Sniper' },
  belcha_minigun: { damage: 1, fireRate: 90, bulletSpeed: 940, projectileLifetime: 950, type: 'Heavy' },
  plasma_porker: { damage: 2, fireRate: 420, bulletSpeed: 720, projectileLifetime: 1300, type: 'Plasma' },
  bacon_blaster: { damage: 3, fireRate: 700, bulletSpeed: 700, projectileLifetime: 1200, type: 'Launcher' }
};

// FIX: Exact file mapping to assets/sprites/*
const WEAPON_IMAGE_MAP: Record<string, string> = {
  oink_pistol: 'Oink-9-Pistol.png',
  sow_machinegun: 'Sow-MP5.png',
  boar_rifle: 'Boar-AR15.png',
  tusk_shotgun: 'Double-Tusk-Shotgun.png',
  sniper_swine: 'Longbore-Sniper.png',
  belcha_minigun: 'Belcha-Minigun.png',
  plasma_porker: 'Plasma-Porker-X.png',
  bacon_blaster: 'Bacon-Blaster-9000.png'
};

const getUpgradeCost = (level: number) => 150 + level * 125;

export const WeaponSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({ onBack, onStart }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradingWeaponId, setUpgradingWeaponId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile?.currentPigs || 0;

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await apiClient.get('/api/inventory');
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const weapons = items.filter((item: InventoryItem) => item.type === 'WEAPON' && item.details?.weaponId);
      setInventory(weapons);
      const equippedId = res.data?.equipped?.weaponId || weapons[0]?.details.weaponId || null;
      setEquippedWeaponId(equippedId);
      setSelectedWeaponId(prev => prev || equippedId);
    } catch (error) {
      console.error('[WeaponSelect] Failed to load inventory:', error);
      setLoadError('Failed to load armory inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadInventory(); }, [loadInventory]);

  const getWeaponStats = useCallback((weapon: WeaponDetails) => {
    const level = Math.max(0, Number(weapon.upgradeLevel ?? 0));
    const base = WEAPON_BASE_STATS[weapon.weaponId] || {
      damage: Number(weapon.damage ?? 1), fireRate: 320, bulletSpeed: 700, projectileLifetime: 1000, type: weapon.type || 'Weapon'
    };
    const fireRateReduction = Math.min(0.22, level * 0.04);
    const fireRate = Math.max(60, Math.floor(base.fireRate * (1 - fireRateReduction)));
    const bulletSpeed = base.bulletSpeed + level * 35;
    const projectileLifetime = base.projectileLifetime + level * 70;
    return {
      level, damage: base.damage + level, fireRate, bulletSpeed,
      range: Math.round((bulletSpeed * projectileLifetime) / 1000), type: base.type
    };
  }, []);

  const selectedWeapon = useMemo(() => inventory.find((item) => item.details.weaponId === selectedWeaponId) || null, [inventory, selectedWeaponId]);
  const selectedStats = useMemo(() => (selectedWeapon ? getWeaponStats(selectedWeapon.details) : null), [selectedWeapon, getWeaponStats]);

  const confirmWeapon = async () => {
    if (!selectedWeaponId) return showNotification('Select a weapon first.', 'error');
    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { weaponId: selectedWeaponId });
      await refreshProfile();
      setEquippedWeaponId(selectedWeaponId);
      showNotification('Weapon equipped successfully.', 'success');
      onStart();
    } catch (error) {
      console.error('[WeaponSelect] Equip failed:', error);
      showNotification('Failed to equip weapon.', 'error');
    } finally { setIsSubmitting(false); }
  };

  const upgradeWeapon = async (weaponId: string) => {
    if (upgradingWeaponId) return;
    const item = inventory.find(i => i.details.weaponId === weaponId);
    if (!item) return;
    const currentLevel = Math.max(0, Number(item.details.upgradeLevel ?? 0));
    const cost = getUpgradeCost(currentLevel);
    if (currentLevel >= MAX_WEAPON_LEVEL) return;
    if (currentPigs < cost) return showNotification('Insufficient Pigs for upgrade.', 'error');
    try {
      setUpgradingWeaponId(weaponId);
      await apiClient.post('/api/inventory/upgrade-weapon', { weaponId, cost });
      await Promise.all([loadInventory(), refreshProfile()]);
      setSelectedWeaponId(weaponId);
      showNotification('Weapon upgraded.', 'success');
    } catch (error) {
      console.error('[WeaponSelect] Upgrade failed:', error);
      showNotification('Weapon upgrade failed.', 'error');
    } finally { setUpgradingWeaponId(null); }
  };

  const getWeaponImagePath = (id: string) => {
    const filename = WEAPON_IMAGE_MAP[id];
    const base = import.meta.env.BASE_URL || '/';
    const basePath = base.endsWith('/') ? base : base + '/';
    if (filename) return `${basePath}assets/sprites/${filename}`;
    return `${basePath}assets/sprites/${id.replace(/_/g, '-')}.png`;
  };

  // Render
  if (isLoading) return <div style={centerStyle}>LOADING ARMORY...</div>;
  if (loadError) return <div style={centerStyle}>{loadError}</div>;
  if (inventory.length === 0) return <div style={centerStyle}>No Weapons Available</div>;

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', color: '#fff', padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onBack} style={btnStyle}>BACK</button>
        <h2 style={{ color: '#ffd700' }}>ARMORY</h2>
        <div style={{ color: '#ffd700', fontWeight: 'bold' }}>💰 {currentPigs}</div>
      </div>

      {notification && <div style={{ background: notification.type === 'error' ? '#ff4d4f' : '#4caf50', padding: 10, borderRadius: 5, marginBottom: 10 }}>{notification.message}</div>}

      {/* Selected Weapon Detail */}
      {selectedWeapon && selectedStats && (
        <div style={{ background: '#222', padding: 15, borderRadius: 10, marginBottom: 20, border: '2px solid #ffd700' }}>
          <div style={{ display: 'flex', gap: 15 }}>
            <div style={{ width: 80, height: 60, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5 }}>
              <img src={getWeaponImagePath(selectedWeapon.details.weaponId)} alt={selectedWeapon.details.name} style={{ maxWidth: '100%', maxHeight: '100%' }} onError={e => (e.currentTarget.src = '/assets/sprites/shop.png')} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px 0' }}>{selectedWeapon.details.name}</h3>
              <div style={{ fontSize: 12, color: '#aaa' }}>LVL {selectedStats.level}/{MAX_WEAPON_LEVEL} • DMG {selectedStats.damage} • RATE {selectedStats.fireRate}ms</div>
            </div>
          </div>
        </div>
      )}

      {/* Weapon List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {inventory.map(item => {
          const stats = getWeaponStats(item.details);
          const isSelected = selectedWeaponId === item.details.weaponId;
          const isEquipped = equippedWeaponId === item.details.weaponId;
          const isMaxed = stats.level >= MAX_WEAPON_LEVEL;
          const cost = getUpgradeCost(stats.level);
          const canAfford = currentPigs >= cost;
          
          return (
            <div key={item.details.weaponId} onClick={() => setSelectedWeaponId(item.details.weaponId)} style={{ background: isSelected ? '#333' : '#1a1a1a', padding: 10, marginBottom: 10, borderRadius: 8, cursor: 'pointer', border: isSelected ? '1px solid #ff6b35' : '1px solid #333' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={getWeaponImagePath(item.details.weaponId)} alt="" style={{ width: 50, height: 40, objectFit: 'contain' }} onError={e => (e.currentTarget.src = '/assets/sprites/shop.png')} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{item.details.name}</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>LVL {stats.level} • DMG {stats.damage}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {isEquipped && <div style={{ color: '#4caf50', fontSize: 10, marginBottom: 5 }}>EQUIPPED</div>}
                  <button disabled={isMaxed || !canAfford} onClick={(e) => { e.stopPropagation(); void upgradeWeapon(item.details.weaponId); }} style={{ fontSize: 10, padding: '5px 10px', background: isMaxed ? '#555' : !canAfford ? '#555' : '#ff6b35', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    {isMaxed ? 'MAX' : `UPG ${cost}`}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => void confirmWeapon()} disabled={!selectedWeaponId || isSubmitting} style={{ marginTop: 10, padding: 15, background: '#ffd700', border: 'none', color: '#000', fontWeight: 'bold', width: '100%', borderRadius: 8, cursor: 'pointer' }}>
        {isSubmitting ? 'SAVING...' : 'CONFIRM WEAPON'}
      </button>
    </div>
  );
};

const centerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' };
const btnStyle: React.CSSProperties = { padding: '10px 20px', background: '#444', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 6 };
