import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

// --- Master Catalogs (Guarantees UI renders even if DB is unseeded) ---
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

const MASTER_CHARACTERS = [
  { characterId: 'grunt_bacon', name: 'Grunt Bacon', classType: 'Assault', pricePigs: 0, unlockLevel: 1, image: 'Grunt-Bacon.png' },
  { characterId: 'swift_hoof', name: 'Swift Hoof', classType: 'Scout', pricePigs: 2000, unlockLevel: 2, image: 'Swift-Hoof.png' },
  { characterId: 'iron_tusk', name: 'Iron Tusk', classType: 'Tank', pricePigs: 4000, unlockLevel: 4, image: 'Iron-Tusk.png' },
  { characterId: 'precision_squeal', name: 'Precision Squeal', classType: 'Sniper', pricePigs: 6500, unlockLevel: 6, image: 'Precision-Squeal.png' },
  { characterId: 'blast_ham', name: 'Blast Ham', classType: 'Demolition', pricePigs: 12000, unlockLevel: 8, image: 'Blast-Ham.png' },
  { characterId: 'general_goldsnout', name: 'General Goldsnout', classType: 'Commander', pricePigs: 50000, unlockLevel: 10, image: 'General-Goldsnout.png' }
];

const WEAPON_META: Record<string, { range: string; rarity: string; upgradeFocus: string }> = {
  oink_pistol: { range: 'Medium', rarity: 'Common', upgradeFocus: 'Damage / Fire Rate' },
  sow_machinegun: { range: 'Medium', rarity: 'Rare', upgradeFocus: 'Fire Rate / Stability' },
  boar_rifle: { range: 'Long', rarity: 'Rare', upgradeFocus: 'Damage / Range' },
  tusk_shotgun: { range: 'Short', rarity: 'Epic', upgradeFocus: 'Pellet Damage / Spread' },
  sniper_swine: { range: 'Extreme', rarity: 'Epic', upgradeFocus: 'Damage / Piercing' },
  belcha_minigun: { range: 'Medium', rarity: 'Legendary', upgradeFocus: 'Fire Rate / Heat Control' },
  plasma_porker: { range: 'Medium', rarity: 'Legendary', upgradeFocus: 'Damage / Splash' },
  bacon_blaster: { range: 'Long', rarity: 'Mythic', upgradeFocus: 'Explosion Damage / Radius' }
};

const CHARACTER_META: Record<string, { powerName: string; cooldown: string; powerEffect: string; upgradeFocus: string }> = {
  grunt_bacon: { powerName: 'Temporal Squeal', cooldown: '15s', powerEffect: 'Slows all enemies by 50% for 5 seconds.', upgradeFocus: 'Slow Strength / Radius / Duration' },
  iron_tusk: { powerName: 'Kinetic Plating', cooldown: '15s', powerEffect: 'Generates a massive overshield buffer.', upgradeFocus: 'Shield Capacity / Decay Rate' },
  swift_hoof: { powerName: 'Trotter Dash', cooldown: '15s', powerEffect: 'Invulnerable rapid forward dash.', upgradeFocus: 'Dash distance, speed, and cooldown' },
  precision_squeal: { powerName: 'Overclocked Optics', cooldown: '15s', powerEffect: 'Boosts weapon damage and fire rate.', upgradeFocus: 'Damage bonus, duration, and cooldown' },
  blast_ham: { powerName: 'Swine Ordinance', cooldown: '15s', powerEffect: 'Massive screen-clearing AoE explosion.', upgradeFocus: 'Blast damage, radius, and cooldown' },
  general_goldsnout: { powerName: 'Command Bombardment', cooldown: '15s', powerEffect: 'Orbital airstrike targeting highest threats.', upgradeFocus: 'Bombardment count and damage' }
};

type ShopPayload = { characters: any[]; weapons: any[]; };
type ViewMode = 'WEAPONS' | 'CHARACTERS';

// --- Component ---
export const Shop: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [items, setItems] = useState<ShopPayload>({ characters: [], weapons: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('WEAPONS');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { user, refreshProfile } = useGameStore();
  const currentPigs = user?.profile.currentPigs || 0;
  const userLevel = user?.profile.level || 1;

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  const loadShop = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/shop/items');
      setItems(res.data);
    } catch (error) {
      console.error('[Shop] Failed to load shop ownership data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadShop(); }, [loadShop]);

  const handleBuy = async (type: 'CHARACTER' | 'WEAPON', id: string, price: number) => {
    const key = `${type}:${id}`;
    if (buyingKey) return;
    
    if (currentPigs < price) {
      return showNotification('Insufficient Pigs for this purchase.', 'error');
    }

    try {
      setBuyingKey(key);
      await apiClient.post('/api/shop/buy', { itemType: type, itemId: id, cost: price });
      await Promise.all([loadShop(), refreshProfile()]);
      showNotification('Item acquired successfully.', 'success');
    } catch (error: any) {
      console.error('[Shop] Purchase failed:', error);
      const message = error?.response?.data?.error || 'Transaction declined. Database might not have this item configured yet.';
      showNotification(message, 'error');
    } finally {
      setBuyingKey(null);
    }
  };

  // Merge the hardcoded catalog with what the backend says the user actually owns
  const sortedCharacters = useMemo(() => {
    return MASTER_CHARACTERS.map(mc => {
      const backendData = items.characters?.find(c => c.characterId === mc.characterId);
      return {
        ...mc,
        owned: backendData ? backendData.owned : false,
        canAfford: currentPigs >= mc.pricePigs,
        canUnlock: userLevel >= mc.unlockLevel
      };
    }).sort((a, b) => Number(a.owned) - Number(b.owned) || a.pricePigs - b.pricePigs);
  }, [items.characters, currentPigs, userLevel]);

  const sortedWeapons = useMemo(() => {
    return MASTER_WEAPONS.map(mw => {
      const backendData = items.weapons?.find(w => w.weaponId === mw.weaponId);
      return {
        ...mw,
        owned: backendData ? backendData.owned : false,
        canAfford: currentPigs >= mw.pricePigs,
        canUnlock: userLevel >= mw.unlockLevel
      };
    }).sort((a, b) => Number(a.owned) - Number(b.owned) || a.pricePigs - b.pricePigs);
  }, [items.weapons, currentPigs, userLevel]);

  if (isLoading) return <div style={centerContainerStyle}>LOADING SHOP...</div>;

  return (
    <div style={outerContainerStyle}>
      {notification && (
        <div style={notificationStyle(notification.type)}>
          {notification.message}
        </div>
      )}
      
      {/* Header */}
      <div style={headerRowStyle}>
        <button onClick={onBack} style={backButtonStyle}>BACK</button>
        <h2 style={titleStyle}>Armory</h2>
        <div style={currencyStyle}>
          <img src="/assets/sprites/pig-token.png" style={{width:18, height:18, objectFit:'contain'}} alt="" />
          {currentPigs}
        </div>
      </div>

      {/* Tabs */}
      <div style={tabRowStyle}>
        <button onClick={() => setViewMode('WEAPONS')} style={{ ...tabStyle, border: viewMode === 'WEAPONS' ? '2px solid #ff6b35' : '2px solid #333', background: viewMode === 'WEAPONS' ? '#24150f' : '#181818' }}>EQUIPMENT</button>
        <button onClick={() => setViewMode('CHARACTERS')} style={{ ...tabStyle, border: viewMode === 'CHARACTERS' ? '2px solid #ff6b35' : '2px solid #333', background: viewMode === 'CHARACTERS' ? '#24150f' : '#181818' }}>UNITS</button>
      </div>

      {/* Scrollable Content Area */}
      <div style={scrollContainerStyle}>
        {viewMode === 'WEAPONS' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedWeapons.map((weapon) => {
              const meta = WEAPON_META[weapon.weaponId];
              return (
                <div key={weapon.weaponId} style={cardStyle}>
                  <div style={imageBoxStyle}>
                    <img src={`/assets/sprites/${weapon.image}`} alt={weapon.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => e.currentTarget.style.display='none'} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>{weapon.name}</h3>
                        <div style={{ color: '#ffb74d', fontSize: 12, fontWeight: 800 }}>
                          {meta.rarity} • {weapon.type}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <BuyButton item={weapon} id={weapon.weaponId} buyingKey={buyingKey} onBuy={(t, i, p) => void handleBuy(t, i, p)} />
                        <div style={{ color: '#999', fontSize: 11, marginTop: 6 }}>REQ LVL {weapon.unlockLevel}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginBottom: 8 }}>
                      <SpecPill label="Damage" value={String(weapon.damage)} />
                      <SpecPill label="Range" value={meta.range} />
                    </div>

                    <div style={{ color: '#8fcfff', fontSize: 12, fontWeight: 700 }}>
                      Upgrade Path: {meta.upgradeFocus}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedCharacters.map((character) => {
              const meta = CHARACTER_META[character.characterId];
              return (
                <div key={character.characterId} style={cardStyle}>
                  <div style={imageBoxStyle}>
                    <img src={`/assets/sprites/${character.image}`} alt={character.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => e.currentTarget.style.display='none'} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>{character.name}</h3>
                        <div style={{ color: '#ffb74d', fontSize: 12, fontWeight: 800 }}>
                          {character.classType}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <BuyButton item={character} id={character.characterId} buyingKey={buyingKey} onBuy={(t, i, p) => void handleBuy(t, i, p)} />
                        <div style={{ color: '#999', fontSize: 11, marginTop: 6 }}>REQ LVL {character.unlockLevel}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginBottom: 8 }}>
                      <SpecPill label="Skill" value={meta.powerName} />
                      <SpecPill label="Cooldown" value={meta.cooldown} />
                    </div>

                    <div style={{ color: '#9be38f', fontSize: 12, fontWeight: 700 }}>
                      Effect: {meta.powerEffect}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Subcomponents ---
const SpecPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{background:'#222', border:'1px solid #333', borderRadius:8, padding:'8px 10px'}}>
    <div style={{color:'#888', fontSize:10, textTransform:'uppercase', marginBottom:2, fontWeight:800}}>{label}</div>
    <div style={{color:'#fff', fontSize:12, fontWeight:800}}>{value}</div>
  </div>
);

const BuyButton: React.FC<{ 
  item: { owned: boolean; canAfford: boolean; canUnlock: boolean; pricePigs: number }; 
  id: string; 
  buyingKey: string | null; 
  onBuy: (type: 'CHARACTER' | 'WEAPON', id: string, price: number) => void 
}> = ({ item, id, buyingKey, onBuy }) => {
  const key = `${'classType' in item ? 'CHARACTER' : 'WEAPON'}:${id}`;
  const isBuying = buyingKey === key;

  if (item.owned) return <span style={{ color: '#4caf50', fontWeight: 800 }}>OWNED</span>;
  if (!item.canUnlock) return <span style={{ color: '#ff9800', fontWeight: 800 }}>LOCKED</span>;
  
  return (
    <button 
      disabled={!item.canAfford || isBuying}
      onClick={() => onBuy('classType' in item ? 'CHARACTER' : 'WEAPON', id, item.pricePigs)}
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
const outerContainerStyle: React.CSSProperties = { 
  padding: 20, color: '#fff', background: '#0a0a0a', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minHeight: '100vh', maxHeight: '100vh', overflow: 'hidden'
};
const centerContainerStyle: React.CSSProperties = { 
  display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#fff'
};
const headerRowStyle: React.CSSProperties = { 
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexShrink: 0
};
const titleStyle: React.CSSProperties = { 
  textAlign: 'center', color: '#ffd700', margin: 0, textTransform: 'uppercase', fontSize: 24, fontWeight: 900
};
const backButtonStyle: React.CSSProperties = { 
  padding: '10px 18px', background: '#444', border: '2px solid #ffd700', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 800 
};
const currencyStyle: React.CSSProperties = { 
  minWidth: 110, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, color: '#ffd700', fontWeight: 800 
};
const tabRowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, flexShrink: 0
};
const tabStyle: React.CSSProperties = { 
  padding: '12px 14px', borderRadius: 10, color: '#fff', fontWeight: 800, cursor: 'pointer' 
};
const scrollContainerStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: 20, WebkitOverflowScrolling: 'touch'
};
const cardStyle: React.CSSProperties = { 
  background: '#171717', padding: 14, borderRadius: 14, border: '2px solid #2f2f2f', display: 'flex', gap: 14, alignItems: 'flex-start', flexShrink: 0
};
const imageBoxStyle: React.CSSProperties = { 
  width: 84, minWidth: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', border: '1px solid #333', borderRadius: 10, padding: 8, boxSizing: 'border-box', flexShrink: 0
};
const notificationStyle = (type: 'success' | 'error'): React.CSSProperties => ({
  position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: type === 'error' ? '#8b2e2e' : '#2e7d32', color: '#fff', padding: '10px 20px', borderRadius: 8, zIndex: 9999, fontWeight: 700 
});
