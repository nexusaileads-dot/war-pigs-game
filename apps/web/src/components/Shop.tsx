import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

// --- Types ---
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

// --- Constants & Metadata (Aligned with GameScene.ts logic) ---
type WeaponMeta = {
  fireRate: string;
  range: string;
  projectile: string;
  rarity: string;
  upgradeFocus: string;
};

type CharacterMeta = {
  powerName: string; // Must match GameScene.ts abilityLabel
  cooldown: string;
  powerEffect: string;
  upgradeFocus: string;
};

const WEAPON_META: Record<string, WeaponMeta> = {
  oink_pistol: { fireRate: 'Balanced', range: 'Medium', projectile: 'Standard Bullet', rarity: 'Common', upgradeFocus: 'Damage / Fire Rate' },
  sow_machinegun: { fireRate: 'Very Fast', range: 'Medium', projectile: 'Standard Bullet', rarity: 'Rare', upgradeFocus: 'Fire Rate / Stability' },
  boar_rifle: { fireRate: 'Fast', range: 'Long', projectile: 'Standard Bullet', rarity: 'Rare', upgradeFocus: 'Damage / Range' },
  tusk_shotgun: { fireRate: 'Slow', range: 'Short', projectile: 'Scatter Shell', rarity: 'Epic', upgradeFocus: 'Pellet Damage / Spread' },
  sniper_swine: { fireRate: 'Very Slow', range: 'Extreme', projectile: 'Sniper Round', rarity: 'Epic', upgradeFocus: 'Damage / Piercing' },
  belcha_minigun: { fireRate: 'Extreme', range: 'Medium', projectile: 'Heavy Bullet', rarity: 'Legendary', upgradeFocus: 'Fire Rate / Heat Control' },
  plasma_porker: { fireRate: 'Medium', range: 'Medium', projectile: 'Plasma Globule', rarity: 'Legendary', upgradeFocus: 'Damage / Splash' },
  bacon_blaster: { fireRate: 'Slow', range: 'Long', projectile: 'Explosive Rocket', rarity: 'Mythic', upgradeFocus: 'Explosion Damage / Radius' }
};

const CHARACTER_META: Record<string, CharacterMeta> = {
  grunt_bacon: { powerName: 'Mud Slow', cooldown: '6s', powerEffect: 'Slows nearby enemies for a short duration.', upgradeFocus: 'Slow Strength / Radius / Duration' },
  iron_tusk: { powerName: 'Iron Slam', cooldown: '7s', powerEffect: 'Shockwave push that damages enemies around the unit.', upgradeFocus: 'Shockwave damage, knockback, and radius' },
  swift_hoof: { powerName: 'Scout Dash', cooldown: '4.5s', powerEffect: 'Fast mobility burst for repositioning.', upgradeFocus: 'Dash distance, speed, and cooldown' },
  precision_squeal: { powerName: 'Focus Mode', cooldown: '7s', powerEffect: 'Boosts precision, projectile speed, damage, and pierce.', upgradeFocus: 'Damage bonus, pierce, duration, and cooldown' },
  blast_ham: { powerName: 'Demolition Burst', cooldown: '6.5s', powerEffect: 'Fires explosive burst rockets toward enemies.', upgradeFocus: 'Rocket count, blast damage, radius, and cooldown' },
  general_goldsnout: { powerName: 'Rally Order', cooldown: '8s', powerEffect: 'Temporary combat efficiency boost.', upgradeFocus: 'Buff strength, duration, and cooldown' }
};

// --- Helpers ---
// Converts 'grunt_bacon' -> 'Grunt-Bacon.png' dynamically
const formatAssetName = (id: string): string => {
  return id.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('-') + '.png';
};

const getAssetPath = (id: string): string => `/assets/sprites/${formatAssetName(id)}`;

// --- Component ---
export const Shop: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [items, setItems] = useState<ShopPayload>({ characters: [], weapons: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('WEAPONS');
  const [shopError, setShopError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile.currentPigs || 0;

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  const loadShop = useCallback(async () => {
    try {
      setIsLoading(true);
      setShopError(null);
      const res = await apiClient.get('/api/shop/items');
      setItems(res.data);
    } catch (error) {
      console.error('[Shop] Failed to load shop:', error);
      setShopError('Failed to connect to the Quartermaster.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  const handleBuy = async (type: 'CHARACTER' | 'WEAPON', id: string, price: number) => {
    const key = `${type}:${id}`;
    if (buyingKey) return;
    
    if (currentPigs < price) {
      return showNotification('Insufficient Pigs for this purchase.', 'error');
    }

    try {
      setBuyingKey(key);
      await apiClient.post('/api/shop/buy', { itemType: type, itemId: id });
      
      // Refresh both shop data and user profile
      await Promise.all([loadShop(), refreshProfile()]);
      showNotification('Item acquired successfully.', 'success');
    } catch (error: any) {
      console.error('[Shop] Purchase failed:', error);
      const message = error?.response?.data?.error || 'Transaction declined.';
      showNotification(message, 'error');
    } finally {
      setBuyingKey(null);
    }
  };

  const sortedCharacters = useMemo(() =>
    [...items.characters].sort((a, b) => Number(a.owned) - Number(b.owned) || a.pricePigs - b.pricePigs),
    [items.characters]
  );

  const sortedWeapons = useMemo(() =>
    [...items.weapons].sort((a, b) => Number(a.owned) - Number(b.owned) || a.pricePigs - b.pricePigs),
    [items.weapons]
  );

  if (isLoading) {
    return <div style={centerContainerStyle}>LOADING SHOP...</div>;
  }

  if (shopError) {
    return (
      <div style={containerStyle}>
        <button onClick={onBack} style={backButtonStyle}>BACK</button>
        <div style={errorBoxStyle}>
          <h3 style={{color: '#ff6b6b'}}>Connection Lost</h3>
          <p>{shopError}</p>
          <button onClick={() => void loadShop()} style={retryButtonStyle}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#8b2e2e' : '#2e7d32',
          color: '#fff', padding: '10px 20px', borderRadius: 8, zIndex: 9999, fontWeight: 700
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={headerRowStyle}>
        <button onClick={onBack} style={backButtonStyle}>BACK</button>
        <h2 style={{ color: '#ffd700', margin: 0, textTransform: 'uppercase' }}>Shop</h2>
        <div style={currencyStyle}>
          <img src="/assets/sprites/pig-token.png" style={{ width: 18, height: 18, objectFit: 'contain' }} alt="" />
          {currentPigs}
        </div>
      </div>

      {/* View Toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setViewMode('WEAPONS')} style={{ ...tabStyle, border: viewMode === 'WEAPONS' ? '2px solid #ff6b35' : '2px solid #333', background: viewMode === 'WEAPONS' ? '#24150f' : '#181818' }}>EQUIPMENT</button>
        <button onClick={() => setViewMode('CHARACTERS')} style={{ ...tabStyle, border: viewMode === 'CHARACTERS' ? '2px solid #ff6b35' : '2px solid #333', background: viewMode === 'CHARACTERS' ? '#24150f' : '#181818' }}>UNITS</button>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(viewMode === 'WEAPONS' ? sortedWeapons : sortedCharacters).map((item) => {
          const isCharacter = 'characterId' in item;
          const id = isCharacter ? (item as ShopCharacter).characterId : (item as ShopWeapon).weaponId;
          const name = isCharacter ? (item as ShopCharacter).name : (item as ShopWeapon).name;
          const typeLabel = isCharacter ? (item as ShopCharacter).classType : (item as ShopWeapon).type;
          const meta = isCharacter 
            ? (CHARACTER_META[id] || { powerName: 'Unknown', cooldown: '-', powerEffect: 'N/A', upgradeFocus: 'N/A' }) 
            : (WEAPON_META[id] || { fireRate: '-', range: '-', projectile: '-', rarity: 'Common', upgradeFocus: 'N/A' });

          return (
            <div key={id} style={cardStyle}>
              <div style={imageBoxStyle}>
                <img src={getAssetPath(id)} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => e.currentTarget.style.display='none'} />
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>{name}</h3>
                    <div style={{ color: '#ffb74d', fontSize: 12, fontWeight: 800 }}>
                      {isCharacter ? typeLabel : `${(meta as WeaponMeta).rarity} • ${typeLabel}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <BuyButton 
                      item={item as any} 
                      id={id} 
                      buyingKey={buyingKey} 
                      onBuy={(t, i, p) => void handleBuy(t, i, p)} 
                    />
                    <div style={{ color: '#999', fontSize: 11, marginTop: 6 }}>REQ LVL {(item as any).unlockLevel}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginBottom: 8 }}>
                  {isCharacter ? (
                    <>
                      <SpecPill label="Power" value={(meta as CharacterMeta).powerName} />
                      <SpecPill label="Cooldown" value={(meta as CharacterMeta).cooldown} />
                    </>
                  ) : (
                    <>
                      <SpecPill label="Damage" value={String((item as ShopWeapon).damage)} />
                      <SpecPill label="Range" value={(meta as WeaponMeta).range} />
                    </>
                  )}
                </div>

                <div style={{ color: '#c7c7c7', fontSize: 12, marginBottom: 4 }}>
                  {item.description || 'Standard issue combat gear.'}
                </div>
                <div style={{ color: '#8fcfff', fontSize: 12, fontWeight: 700 }}>
                  {isCharacter ? `Effect: ${(meta as CharacterMeta).powerEffect}` : `Upgrade Path: ${(meta as WeaponMeta).upgradeFocus}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Subcomponents ---
const SpecPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ background: '#222', border: '1px solid #333', borderRadius: 8, padding: '8px 10px' }}>
    <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
    <div style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>{value}</div>
  </div>
);

const BuyButton: React.FC<{ 
  item: { owned: boolean; canAfford: boolean; canUnlock: boolean; pricePigs: number }; 
  id: string; 
  buyingKey: string | null; 
  onBuy: (type: 'CHARACTER' | 'WEAPON', id: string, price: number) => void 
}> = ({ item, id, buyingKey, onBuy }) => {
  const key = `${'characterId' in item ? 'CHARACTER' : 'WEAPON'}:${id}`;
  const isBuying = buyingKey === key;

  if (item.owned) return <span style={{ color: '#4caf50', fontWeight: 800 }}>OWNED</span>;
  if (!item.canUnlock) return <span style={{ color: '#ff9800', fontWeight: 800 }}>LOCKED</span>;
  
  return (
    <button 
      disabled={!item.canAfford || isBuying}
      onClick={() => onBuy('characterId' in item ? 'CHARACTER' : 'WEAPON', id, item.pricePigs)}
      style={{
        padding: '10px 14px', background: item.canAfford && !isBuying ? '#ff6b35' : '#555',
        color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6
      }}
    >
      <img src="/assets/sprites/pig-token.png" style={{ width: 16, height: 16 }} alt="" />
      {isBuying ? '...' : item.pricePigs}
    </button>
  );
};

// --- Styles ---
const containerStyle: React.CSSProperties = { padding: 20, color: '#fff', minHeight: '100vh', overflowY: 'auto', background: '#0a0a0a', boxSizing: 'border-box' };
const centerContainerStyle: React.CSSProperties = { ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center' };
const headerRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12 };
const backButtonStyle: React.CSSProperties = { padding: '10px 18px', background: '#444', border: '2px solid #ffd700', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 800 };
const currencyStyle: React.CSSProperties = { minWidth: 110, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, color: '#ffd700', fontWeight: 800 };
const tabStyle: React.CSSProperties = { padding: '12px 14px', borderRadius: 10, color: '#fff', fontWeight: 800, cursor: 'pointer' };
const cardStyle: React.CSSProperties = { background: '#171717', padding: 14, borderRadius: 14, border: '2px solid #2f2f2f', display: 'flex', gap: 14, alignItems: 'flex-start' };
const imageBoxStyle: React.CSSProperties = { width: 84, minWidth: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', border: '1px solid #333', borderRadius: 10, padding: 8, boxSizing: 'border-box' };
const errorBoxStyle: React.CSSProperties = { maxWidth: 520, margin: '80px auto 0', padding: 20, borderRadius: 12, border: '2px solid #5a1f1f', background: '#1a1111', textAlign: 'center', color: '#ff8a80' };
const retryButtonStyle: React.CSSProperties = { marginTop: 15, padding: '8px 16px', background: '#444', border: '1px solid #fff', color: '#fff', borderRadius: 6, cursor: 'pointer' };
