import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

// --- Master Catalog ---
const MASTER_CHARACTERS = [
  { characterId: 'grunt_bacon', name: 'Grunt Bacon', classType: 'Assault', pricePigs: 0, unlockLevel: 1, image: 'Grunt-Bacon.png', skillName: 'Temporal Squeal', skillDesc: 'Slows all enemies by 50% for 5 seconds.' },
  { characterId: 'swift_hoof', name: 'Swift Hoof', classType: 'Scout', pricePigs: 2000, unlockLevel: 2, image: 'Swift-Hoof.png', skillName: 'Trotter Dash', skillDesc: 'Invulnerable rapid forward dash.' },
  { characterId: 'iron_tusk', name: 'Iron Tusk', classType: 'Tank', pricePigs: 4000, unlockLevel: 4, image: 'Iron-Tusk.png', skillName: 'Kinetic Plating', skillDesc: 'Generates a massive overshield buffer.' },
  { characterId: 'precision_squeal', name: 'Precision Squeal', classType: 'Sniper', pricePigs: 6500, unlockLevel: 6, image: 'Precision-Squeal.png', skillName: 'Overclocked Optics', skillDesc: 'Boosts weapon damage and fire rate.' },
  { characterId: 'blast_ham', name: 'Blast Ham', classType: 'Demolition', pricePigs: 12000, unlockLevel: 8, image: 'Blast-Ham.png', skillName: 'Swine Ordinance', skillDesc: 'Massive screen-clearing AoE explosion.' },
  { characterId: 'general_goldsnout', name: 'General Goldsnout', classType: 'Commander', pricePigs: 50000, unlockLevel: 10, image: 'General-Goldsnout.png', skillName: 'Command Bombardment', skillDesc: 'Orbital airstrike targeting highest threats.' }
];

type InventoryItem = {
  id: string;
  type: 'CHARACTER' | 'WEAPON';
  details: {
    characterId: string;
    name: string;
  };
};

export const CharacterSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({ onBack, onStart }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedCharId, setEquippedCharId] = useState<string | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
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
      const characters = items.filter((item: InventoryItem) => item.type === 'CHARACTER' && item.details?.characterId);
      setInventory(characters);
      
      const equippedId = res.data?.equipped?.characterId || characters[0]?.details.characterId || 'grunt_bacon';
      setEquippedCharId(equippedId);
      setSelectedCharId(prev => prev || equippedId);
    } catch (error) {
      console.error('[CharacterSelect] Failed to load inventory:', error);
      setLoadError('Failed to load character inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadInventory(); }, [loadInventory]);

  // Merge Master Catalog with User's Inventory
  const displayCharacters = useMemo(() => {
    return MASTER_CHARACTERS.map(mc => {
      const isOwned = inventory.some(i => i.details.characterId === mc.characterId);
      return {
        ...mc,
        owned: isOwned,
        canAffordBuy: currentPigs >= mc.pricePigs,
        canUnlock: userLevel >= mc.unlockLevel
      };
    }).sort((a, b) => Number(b.owned) - Number(a.owned) || a.pricePigs - b.pricePigs);
  }, [inventory, currentPigs, userLevel]);

  const selectedChar = useMemo(() => displayCharacters.find((c) => c.characterId === selectedCharId) || null, [displayCharacters, selectedCharId]);

  const confirmCharacter = async () => {
    if (!selectedCharId || !selectedChar?.owned) {
      return showNotification('Select an owned unit to deploy.', 'error');
    }
    
    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { characterId: selectedCharId });
      await refreshProfile();
      setEquippedCharId(selectedCharId);
      onStart();
    } catch (error) {
      console.error('[CharacterSelect] Equip failed:', error);
      showNotification('Failed to equip unit.', 'error');
    } finally { setIsSubmitting(false); }
  };

  const buyCharacter = async (charId: string, price: number) => {
    if (processingId) return;
    if (currentPigs < price) return showNotification('Insufficient Pigs.', 'error');
    
    try {
      setProcessingId(charId);
      await apiClient.post('/api/shop/buy', { itemType: 'CHARACTER', itemId: charId, cost: price });
      await Promise.all([loadInventory(), refreshProfile()]);
      setSelectedCharId(charId);
      showNotification('Unit acquired!', 'success');
    } catch (error) {
      console.error('[CharacterSelect] Purchase failed:', error);
      showNotification('Purchase failed.', 'error');
    } finally { setProcessingId(null); }
  };

  // Render
  if (isLoading) return <div style={centerStyle}>LOADING BARRACKS...</div>;
  if (loadError) return <div style={centerStyle}>{loadError}</div>;

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', color: '#fff', padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onBack} style={btnStyle}>BACK</button>
        <h2 style={{ color: '#ff6b35', margin: 0, textTransform: 'uppercase' }}>Select Unit</h2>
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

      {/* Selected Character Detail */}
      {selectedChar && (
        <div style={{ background: '#1a1111', padding: 15, borderRadius: 12, marginBottom: 20, border: '2px solid #5a1f1f' }}>
          <div style={{ display: 'flex', gap: 15 }}>
            <div style={{ width: 100, height: 80, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #333' }}>
              <img src={`/assets/sprites/${selectedChar.image}`} alt={selectedChar.name} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: 22, color: '#fff' }}>{selectedChar.name}</h3>
              <div style={{ fontSize: 13, color: '#ffb74d', fontWeight: 'bold', marginBottom: 6 }}>{selectedChar.classType} Class</div>
              
              <div style={{ background: '#2a1710', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #ff6b35', marginTop: 8 }}>
                <strong style={{ color: '#ffdd57', fontSize: 12 }}>SKILL: {selectedChar.skillName}</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#ddd' }}>{selectedChar.skillDesc}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Character List Grid */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, alignContent: 'start', paddingBottom: 20 }}>
        {displayCharacters.map(char => {
          const isSelected = selectedCharId === char.characterId;
          const isEquipped = equippedCharId === char.characterId;
          
          return (
            <div 
              key={char.characterId} 
              onClick={() => setSelectedCharId(char.characterId)} 
              style={{ 
                background: isSelected ? '#2a1710' : '#141414', 
                padding: 12, 
                borderRadius: 10, 
                cursor: 'pointer', 
                border: isSelected ? '2px solid #ff6b35' : '2px solid #222',
                opacity: char.owned || char.canUnlock ? 1 : 0.5
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={`/assets/sprites/${char.image}`} alt="" style={{ width: 60, height: 60, objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 15, color: char.owned ? '#fff' : '#aaa' }}>{char.name}</div>
                  
                  {char.owned ? (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>READY FOR DEPLOYMENT</div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 4 }}>LOCKED</div>
                  )}
                </div>
                
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {char.owned ? (
                    <>
                      {isEquipped && <div style={{ color: '#4caf50', fontSize: 11, fontWeight: 'bold', padding: '6px 0' }}>EQUIPPED</div>}
                    </>
                  ) : (
                    <button 
                      disabled={!char.canAffordBuy || !char.canUnlock || processingId === char.characterId} 
                      onClick={(e) => { e.stopPropagation(); void buyCharacter(char.characterId, char.pricePigs); }} 
                      style={{ fontSize: 11, padding: '6px 10px', background: (!char.canAffordBuy || !char.canUnlock) ? '#333' : '#4caf50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {char.canUnlock ? `HIRE 💰${char.pricePigs}` : `REQ LVL ${char.unlockLevel}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => void confirmCharacter()} 
        disabled={!selectedCharId || !selectedChar?.owned || isSubmitting} 
        style={{ 
          marginTop: 10, padding: '16px', background: (!selectedCharId || !selectedChar?.owned) ? '#444' : '#ff6b35', 
          border: 'none', color: '#fff', fontWeight: 900, fontSize: 16, width: '100%', borderRadius: 10, cursor: (!selectedCharId || !selectedChar?.owned) ? 'not-allowed' : 'pointer', letterSpacing: '1px' 
        }}
      >
        {isSubmitting ? 'SAVING...' : 'CONFIRM UNIT'}
      </button>
    </div>
  );
};

const centerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff6b35', background: '#0a0a0a', fontWeight: 'bold' };
const btnStyle: React.CSSProperties = { padding: '10px 20px', background: '#333', border: '1px solid #555', color: '#fff', cursor: 'pointer', borderRadius: 8, fontWeight: 'bold' };
