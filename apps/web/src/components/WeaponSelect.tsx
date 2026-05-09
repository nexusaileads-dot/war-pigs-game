import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

// --- Master Catalog ---
const MASTER_WEAPONS = [
  { weaponId: 'oink_pistol', name: 'Oink-9 Pistol', type: 'Sidearm', damage: 1, pricePigs: 0, unlockLevel: 1, image: 'Oink-9-Pistol.png' },
  { weaponId: 'sow_machinegun', name: 'Sow MP5', type: 'SMG', damage: 0.7, pricePigs: 1500, unlockLevel: 2, image: 'Sow-MP5.png' },
  { weaponId: 'boar_rifle', name: 'Boar AR15', type: 'Assault Rifle', damage: 1.5, pricePigs: 3000, unlockLevel: 3, image: 'Boar-AR15.png' },
  { weaponId: 'tusk_shotgun', name: 'Double Tusk', type: 'Shotgun', damage: 3, pricePigs: 4500, unlockLevel: 4, image: 'Double-Tusk-Shotgun.png' },
  { weaponId: 'sniper_swine', name: 'Longbore Sniper', type: 'Sniper', damage: 6, pricePigs: 6000, unlockLevel: 5, image: 'Longbore-Sniper.png' },
  { weaponId: 'plasma_porker', name: 'Plasma Porker X', type: 'Energy', damage: 2, pricePigs: 10000, unlockLevel: 7, image: 'Plasma-Porker-X.png' },
  { weaponId: 'belcha_minigun', name: 'Belcha Minigun', type: 'Heavy', damage: 0.5, pricePigs: 15000, unlockLevel: 9, image: 'Belcha-Minigun.png' },
  { weaponId: 'bacon_blaster', name: 'Bacon Blaster 9000', type: 'Explosive', damage: 4, pricePigs: 25000, unlockLevel: 10, image: 'Bacon-Blaster-9000.png' }
];

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

const MAX_WEAPON_LEVEL = 5;
const getUpgradeCost = (level: number) => 150 + level * 125;

export const WeaponSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({ onBack, onStart }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile?.currentPigs || 0;
  const userLevel = user?.profile?.level || 1;

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

  // Merge Master Catalog with User's Inventory
  const displayWeapons = useMemo(() => {
    return MASTER_WEAPONS.map(mw => {
      const invItem = inventory.find(i => i.details.weaponId === mw.weaponId);
      const level = invItem ? Math.max(0, Number(invItem.details.upgradeLevel ?? 0)) : 0;
      
      return {
        ...mw,
        owned: !!invItem,
        level,
        currentDamage: mw.damage + level,
        upgradeCost: getUpgradeCost(level),
        canAffordBuy: currentPigs >= mw.pricePigs,
        canAffordUpgrade: currentPigs >= getUpgradeCost(level),
        canUnlock: userLevel >= mw.unlockLevel
      };
    }).sort((a, b) => Number(b.owned) - Number(a.owned) || a.pricePigs - b.pricePigs);
  }, [inventory, currentPigs, userLevel]);

  const selectedWeapon = useMemo(() => displayWeapons.find((w) => w.weaponId === selectedWeaponId) || null, [displayWeapons, selectedWeaponId]);

  const confirmWeapon = async () => {
    if (!selectedWeaponId || !selectedWeapon?.owned) {
      return showNotification('Select an owned weapon to equip.', 'error');
    }
    
    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { weaponId: selectedWeaponId });
      await refreshProfile();
      setEquippedWeaponId(selectedWeaponId);
      onStart();
    } catch (error) {
      console.error('[WeaponSelect] Equip failed:', error);
      showNotification('Failed to equip weapon.', 'error');
    } finally { setIsSubmitting(false); }
  };

  const buyWeapon = async (weaponId: string, price: number) => {
    if (processingId) return;
    if (currentPigs < price) return showNotification('Insufficient Pigs.', 'error');
    
    try {
      setProcessingId(weaponId);
      await apiClient.post('/api/shop/buy', { itemType: 'WEAPON', itemId: weaponId, cost: price });
      await Promise.all([loadInventory(), refreshProfile()]);
      setSelectedWeaponId(weaponId);
      showNotification('Weapon purchased!', 'success');
    } catch (error) {
      console.error('[WeaponSelect] Purchase failed:', error);
      showNotification('Purchase failed.', 'error');
    } finally { setProcessingId(null); }
  };

  const upgradeWeapon = async (weaponId: string, cost: number) => {
    if (processingId) return;
    if (currentPigs < cost) return showNotification('Insufficient Pigs.', 'error');
    
    try {
      setProcessingId(weaponId);
      await apiClient.post('/api/inventory/upgrade-weapon', { weaponId, cost });
      await Promise.all([loadInventory(), refreshProfile()]);
      showNotification('Weapon upgraded!', 'success');
    } catch (error) {
      console.error('[WeaponSelect] Upgrade failed:', error);
      showNotification('Weapon upgrade failed.', 'error');
    } finally { setProcessingId(null); }
  };

  // Render
  if (isLoading) return <div style={centerStyle}>LOADING ARMORY...</div>;
  if (loadError) return <div style={centerStyle}>{loadError}</div>;

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', color: '#fff', padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onBack} style={btnStyle}>BACK</button>
        <h2 style={{ color: '#ff6b35', margin: 0, textTransform: 'uppercase' }}>Select Loadout</h2>
        <div style={{ color: '#ffd700', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
          <img src="/assets/sprites/pig-token.png" style={{width: 18, height: 18}} alt="Pigs" />
          {currentPigs}
        </div>
      </div>

      {notification && (
        <div style={{ background: notification.type === 'error' ? '#8b2e2e' : '#2e7d32', padding: 12, borderRadius: 8, marginBottom: 15, fontWeight: 'bold', textAlign: 'center' }}>
          {notification.message}
        </div>
      )}

      {/* Selected Weapon Detail */}
      {selectedWeapon && (
        <div style={{ background: '#1a1111', padding: 15, borderRadius: 12, marginBottom: 20, border: '2px solid #5a1f1f' }}>
          <div style={{ display: 'flex', gap: 15 }}>
            <div style={{ width: 100, height: 80, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #333' }}>
              <img src={`/assets/sprites/${selectedWeapon.image}`} alt={selectedWeapon.name} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: 22, color: '#fff' }}>{selectedWeapon.name}</h3>
              <div style={{ fontSize: 13, color: '#ffb74d', fontWeight: 'bold', marginBottom: 6 }}>{selectedWeapon.type}</div>
              
              {selectedWeapon.owned ? (
                <div style={{ fontSize: 13, color: '#aaa', display: 'flex', gap: 15 }}>
                  <span>LVL: <strong style={{color: '#fff'}}>{selectedWeapon.level}/{MAX_WEAPON_LEVEL}</strong></span>
                  <span>DMG: <strong style={{color: '#fff'}}>{selectedWeapon.currentDamage}</strong></span>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#888' }}>
                  Base DMG: {selectedWeapon.damage} | Unlocks at Player Lv {selectedWeapon.unlockLevel}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weapon List Grid */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, alignContent: 'start', paddingBottom: 20 }}>
        {displayWeapons.map(weapon => {
          const isSelected = selectedWeaponId === weapon.weaponId;
          const isEquipped = equippedWeaponId === weapon.weaponId;
          const isMaxed = weapon.level >= MAX_WEAPON_LEVEL;
          
          return (
            <div 
              key={weapon.weaponId} 
              onClick={() => setSelectedWeaponId(weapon.weaponId)} 
              style={{ 
                background: isSelected ? '#2a1710' : '#141414', 
                padding: 12, 
                borderRadius: 10, 
                cursor: 'pointer', 
                border: isSelected ? '2px solid #ff6b35' : '2px solid #222',
                opacity: weapon.owned || weapon.canUnlock ? 1 : 0.5
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={`/assets/sprites/${weapon.image}`} alt="" style={{ width: 60, height: 40, objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 15, color: weapon.owned ? '#fff' : '#aaa' }}>{weapon.name}</div>
                  
                  {weapon.owned ? (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>LVL {weapon.level} • DMG {weapon.currentDamage}</div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 4 }}>LOCKED</div>
                  )}
                </div>
                
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {weapon.owned ? (
                    <>
                      {isEquipped && <div style={{ color: '#4caf50', fontSize: 10, marginBottom: 5, fontWeight: 'bold' }}>EQUIPPED</div>}
                      <button 
                        disabled={isMaxed || !weapon.canAffordUpgrade || processingId === weapon.weaponId} 
                        onClick={(e) => { e.stopPropagation(); void upgradeWeapon(weapon.weaponId, weapon.upgradeCost); }} 
                        style={{ fontSize: 11, padding: '6px 10px', background: isMaxed ? '#333' : !weapon.canAffordUpgrade ? '#555' : '#ff6b35', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        {isMaxed ? 'MAX' : `UPG 💰${weapon.upgradeCost}`}
                      </button>
                    </>
                  ) : (
                    <button 
                      disabled={!weapon.canAffordBuy || !weapon.canUnlock || processingId === weapon.weaponId} 
                      onClick={(e) => { e.stopPropagation(); void buyWeapon(weapon.weaponId, weapon.pricePigs); }} 
                      style={{ fontSize: 11, padding: '6px 10px', background: (!weapon.canAffordBuy || !weapon.canUnlock) ? '#333' : '#4caf50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {weapon.canUnlock ? `BUY 💰${weapon.pricePigs}` : `REQ LVL ${weapon.unlockLevel}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => void confirmWeapon()} 
        disabled={!selectedWeaponId || !selectedWeapon?.owned || isSubmitting} 
        style={{ 
          marginTop: 10, padding: '16px', background: (!selectedWeaponId || !selectedWeapon?.owned) ? '#444' : '#ff6b35', 
          border: 'none', color: '#fff', fontWeight: 900, fontSize: 16, width: '100%', borderRadius: 10, cursor: (!selectedWeaponId || !selectedWeapon?.owned) ? 'not-allowed' : 'pointer', letterSpacing: '1px' 
        }}
      >
        {isSubmitting ? 'SAVING...' : 'CONFIRM LOADOUT'}
      </button>
    </div>
  );
};

const centerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff6b35', background: '#0a0a0a', fontWeight: 'bold' };
const btnStyle: React.CSSProperties = { padding: '10px 20px', background: '#333', border: '1px solid #555', color: '#fff', cursor: 'pointer', borderRadius: 8, fontWeight: 'bold' };
