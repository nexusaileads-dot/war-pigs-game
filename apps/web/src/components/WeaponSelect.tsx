import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

// --- Types ---
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

// --- Constants ---
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

const getUpgradeCost = (level: number) => 150 + level * 125;

// --- Component ---
export const WeaponSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({ onBack, onStart }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradingWeaponId, setUpgradingWeaponId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile.currentPigs || 0;

  // Helper for notifications
  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Load Inventory
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
      setSelectedWeaponId(prev => prev || equippedId);
    } catch (error) {
      console.error('[WeaponSelect] Failed to load inventory:', error);
      setLoadError('Failed to load armory inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadInventory(); }, [loadInventory]);

  // Helpers
  const getWeaponStats = useCallback((weapon: WeaponDetails) => {
    const level = Math.max(0, Number(weapon.upgradeLevel ?? 0));
    const base = WEAPON_BASE_STATS[weapon.weaponId] || {
      damage: Number(weapon.damage ?? 1),
      fireRate: 320,
      bulletSpeed: 700,
      projectileLifetime: 1000,
      type: weapon.type || 'Weapon'    };

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
  }, []);

  const selectedWeapon = useMemo(
    () => inventory.find((item) => item.details.weaponId === selectedWeaponId) || null,
    [inventory, selectedWeaponId]
  );

  const selectedStats = useMemo(
    () => (selectedWeapon ? getWeaponStats(selectedWeapon.details) : null),
    [selectedWeapon, getWeaponStats]
  );

  // Actions
  const confirmWeapon = async () => {
    if (!selectedWeaponId) return showNotification('Select a weapon first.', 'error');
    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { weaponId: selectedWeaponId });
      await refreshProfile();
      setEquippedWeaponId(selectedWeaponId);
      showNotification('Weapon equipped successfully.', 'success');
      // Proceed to next step (Level Select)
      onStart();
    } catch (error) {
      console.error('[WeaponSelect] Equip failed:', error);
      showNotification('Failed to equip weapon.', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
    } finally {
      setUpgradingWeaponId(null);
    }
  };

  // Helper for image paths
  const getWeaponImagePath = (id: string) => {
    const normalizedId = id.replace(/_/g, '-').toLowerCase();
    return `/assets/sprites/${normalizedId}.png`;
  };

  // --- Render States ---
  // Keep header visible during loading
  const renderHeader = () => (
    <div style={headerRowStyle}>
      <button onClick={onBack} style={backButtonStyle}>BACK</button>
      <h2 style={titleStyle}>Armory</h2>
      <div style={currencyStyle}>
        <img src="/assets/sprites/pig-token.png" style={{width:18, height:18, objectFit:'contain'}} alt="" />
        {currentPigs}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div style={outerContainerStyle}>
        {renderHeader()}
        <div style={centerContainerStyle}>LOADING ARMORY...</div>
      </div>
    );
  }

  if (loadError) {
    return (      <div style={outerContainerStyle}>
        {renderHeader()}
        <div style={errorBoxStyle}>{loadError}</div>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div style={outerContainerStyle}>
        {renderHeader()}
        <div style={cardStyle}>
          <h2 style={{marginTop:0, color:'#ff6b35'}}>No Weapons Available</h2>
          <p style={{color:'#bbb',margin:0}}>Your armory has no weapons yet. Buy one from the shop before deployment.</p>
        </div>
      </div>
    );
  }

  // --- Main UI ---
  return (
    <div style={outerContainerStyle}>
      {renderHeader()}

      {notification && (
        <div style={notificationStyle(notification.type)}>
          {notification.message}
        </div>
      )}

      {/* Scrollable Content Area */}
      <div style={scrollContainerStyle}>
        {selectedWeapon && selectedStats ? (
          <div style={selectionCardStyle}>
            <div style={weaponPreviewBoxStyle}>
              <img src={getWeaponImagePath(selectedWeapon.details.weaponId)} alt={selectedWeapon.details.name} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} onError={e => e.currentTarget.style.display='none'} />
            </div>
            <div style={{flex:1, minWidth:220}}>
              <div style={{fontSize:12, color:'#888', marginBottom:4}}>CURRENT SELECTION</div>
              <div style={{fontSize:22, fontWeight:900, color:'#fff'}}>{selectedWeapon.details.name}</div>
              <div style={{color:'#ffd700', fontWeight:800, fontSize:13, marginTop:4}}>LEVEL {selectedStats.level}/{MAX_WEAPON_LEVEL} · {selectedStats.type}</div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(105px, 1fr))', gap:8, marginTop:10}}>
                <Stat label="DMG" value={selectedStats.damage} />
                <Stat label="RATE" value={`${selectedStats.fireRate}ms`} />
                <Stat label="SPEED" value={selectedStats.bulletSpeed} />
                <Stat label="RANGE" value={selectedStats.range} />
              </div>
              {selectedWeapon.details.description && <div style={{color:'#bbb', fontSize:13, marginTop:10}}>{selectedWeapon.details.description}</div>}
            </div>
          </div>        ) : null}

        <div style={{display:'flex', flexDirection:'column', gap:12, marginBottom:20}}>
          {inventory.map(item => {
            const weaponId = item.details.weaponId;
            const stats = getWeaponStats(item.details);
            const isSelected = selectedWeaponId === weaponId;
            const isEquipped = equippedWeaponId === weaponId;
            const isMaxed = stats.level >= MAX_WEAPON_LEVEL;
            const cost = getUpgradeCost(stats.level);
            const canAfford = currentPigs >= cost;
            const isUpgrading = upgradingWeaponId === weaponId;

            return (
              <div key={weaponId} style={{ background: isSelected ? '#1d1d1d' : '#222', padding:14, borderRadius:12, display:'flex', alignItems:'center', gap:14, border:`2px solid ${isSelected ? '#ffd700' : '#333'}`, color:'#fff', boxShadow: isSelected ? '0 8px 20px rgba(255,215,0,0.14)' : 'none' }}>
                <button type="button" onClick={() => setSelectedWeaponId(weaponId)} style={weaponThumbButtonStyle}>
                  <img src={getWeaponImagePath(weaponId)} alt={item.details.name} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} onError={e => e.currentTarget.style.display='none'} />
                </button>
                <button type="button" onClick={() => setSelectedWeaponId(weaponId)} style={weaponInfoButtonStyle}>
                  <h3 style={{margin:'0 0 4px 0', fontSize:17, color:'#fff'}}>{item.details.name}</h3>
                  <p style={{margin:0, color:'#aaa', fontSize:12}}>LVL {stats.level}/{MAX_WEAPON_LEVEL} · DMG {stats.damage} · RATE {stats.fireRate}ms · RANGE {stats.range}</p>
                  <p style={{margin:'6px 0 0 0', color:'#777', fontSize:11}}>Used {item.timesUsed ?? 0} time{item.timesUsed === 1 ? '' : 's'}</p>
                </button>
                <div style={{display:'flex', flexDirection:'column', gap:7, alignItems:'flex-end', flexShrink:0}}>
                  {isEquipped && <Tag color="#4caf50" text="EQUIPPED" />}
                  {isSelected && <Tag color="#ffd700" text="SELECTED" />}
                  <button type="button" disabled={isMaxed || !canAfford || isUpgrading} onClick={() => void upgradeWeapon(weaponId)} style={{ padding:'8px 10px', borderRadius:8, border:'none', background: isMaxed?'#2e7d32':!canAfford||isUpgrading?'#555':'#ff6b35', color:'#fff', fontWeight:900, fontSize:11, cursor: isMaxed||!canAfford||isUpgrading?'not-allowed':'pointer', whiteSpace:'nowrap' }}>
                    {isMaxed?'MAXED':isUpgrading?'UPGRADING...':`UPGRADE ${cost}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => void confirmWeapon()} disabled={!selectedWeaponId || isSubmitting} style={{ padding:'14px 20px', background:!selectedWeaponId||isSubmitting?'#555':'#ffd700', border:'none', color:!selectedWeaponId||isSubmitting?'#ddd':'#111', borderRadius:10, cursor:!selectedWeaponId||isSubmitting?'not-allowed':'pointer', fontWeight:'bold', textTransform:'uppercase', letterSpacing:1, marginTop:'auto' }}>
          {isSubmitting ? 'CONFIRMING...' : 'CONFIRM WEAPON'}
        </button>
      </div>
    </div>
  );
};

// --- Subcomponents ---
const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div style={{background:'#101010', border:'1px solid #303030', borderRadius:8, padding:'8px 10px'}}>
    <div style={{color:'#777', fontSize:10, fontWeight:800}}>{label}</div>
    <div style={{color:'#fff', fontSize:12, fontWeight:900}}>{value}</div>
  </div>
);
const Tag: React.FC<{ color: string; text: string }> = ({ color, text }) => (
  <span style={{color, fontWeight:'bold', fontSize:11, whiteSpace:'nowrap'}}>{text}</span>
);

// --- Styles ---
const outerContainerStyle: React.CSSProperties = { 
  padding: 20, 
  color: '#fff', 
  background: '#0a0a0a', 
  display: 'flex', 
  flexDirection: 'column', 
  boxSizing: 'border-box', 
  minHeight: '100vh',
  maxHeight: '100vh',
  overflow: 'hidden'
};

const centerContainerStyle: React.CSSProperties = { 
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  flex: 1, 
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold'
};

const headerRowStyle: React.CSSProperties = { 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  gap: 12, 
  marginBottom: 18,
  flexShrink: 0
};

const titleStyle: React.CSSProperties = { 
  textAlign: 'center', 
  color: '#ffd700', 
  margin: 0, 
  textTransform: 'uppercase',
  fontSize: 24,
  fontWeight: 900
};

const backButtonStyle: React.CSSProperties = { 
  padding: '10px 20px', 
  background: '#444', 
  border: '2px solid #ffd700',   color: '#fff', 
  borderRadius: 8, 
  cursor: 'pointer', 
  fontWeight: 'bold' 
};

const currencyStyle: React.CSSProperties = { 
  minWidth: 92, 
  display: 'flex', 
  justifyContent: 'flex-end', 
  alignItems: 'center', 
  gap: 6, 
  color: '#ffd700', 
  fontWeight: 800 
};

const errorBoxStyle: React.CSSProperties = { 
  maxWidth: 520, 
  margin: '20px auto', 
  padding: 20, 
  borderRadius: 12, 
  border: '2px solid #5a1f1f', 
  background: '#1a1111', 
  textAlign: 'center', 
  color: '#ff8a80' 
};

const cardStyle: React.CSSProperties = { 
  maxWidth: 560, 
  margin: '20px auto', 
  padding: 22, 
  background: '#151515', 
  border: '2px solid #333', 
  borderRadius: 12, 
  textAlign: 'center' 
};

const scrollContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  paddingBottom: 20,
  WebkitOverflowScrolling: 'touch'
};

const selectionCardStyle: React.CSSProperties = { 
  background: '#161616', 
  border: '2px solid #ffd700',   borderRadius: 14, 
  padding: 16, 
  marginBottom: 18, 
  display: 'flex', 
  gap: 14, 
  alignItems: 'center', 
  flexWrap: 'wrap', 
  boxShadow: '0 8px 22px rgba(255,215,0,0.1)',
  flexShrink: 0
};

const weaponPreviewBoxStyle: React.CSSProperties = { 
  background: '#101010', 
  padding: 10, 
  borderRadius: 10, 
  border: '1px solid #333', 
  width: 96, 
  height: 74, 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
  flexShrink: 0
};

const weaponThumbButtonStyle: React.CSSProperties = { 
  background: '#111', 
  padding: 8, 
  borderRadius: 8, 
  border: '1px solid #444', 
  width: 76, 
  height: 58, 
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  flexShrink: 0, 
  cursor: 'pointer' 
};

const weaponInfoButtonStyle: React.CSSProperties = { 
  flex: 1, 
  minWidth: 0, 
  border: 'none', 
  background: 'transparent', 
  padding: 0, 
  color: '#fff', 
  textAlign: 'left', 
  cursor: 'pointer' 
};

const notificationStyle = (type: 'success' | 'error'): React.CSSProperties => ({  position: 'fixed', 
  top: 20, 
  left: '50%', 
  transform: 'translateX(-50%)',
  background: type === 'error' ? '#8b2e2e' : '#2e7d32',
  color: '#fff', 
  padding: '10px 20px', 
  borderRadius: 8, 
  zIndex: 9999, 
  fontWeight: 700 
});
