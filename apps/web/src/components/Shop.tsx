import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export const Shop: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [items, setItems] = useState<{ characters: any[], weapons: any[] }>({ characters: [], weapons: [] });

  useEffect(() => {
    apiClient.get('/api/shop/items').then(res => setItems(res.data));
  }, []);

  const handleBuy = async (type: string, id: string) => {
    try {
      await apiClient.post('/api/shop/buy', { itemType: type, itemId: id });
      // Refresh shop after buying
      const res = await apiClient.get('/api/shop/items');
      setItems(res.data);
      alert("Purchase successful!");
    } catch (error) {
      alert("Not enough $PIGS or level too low!");
    }
  };

  // Helper to map database IDs to your exact image filenames
  const getImageFilename = (id: string) => {
    const map: Record<string, string> = {
      // Characters
      'grunt_bacon': 'Grunt-Bacon.png',
      'iron_tusk': 'Iron-Tusk.png',
      'swift_hoof': 'Swift-Hoof.png',
      'precision_squeal': 'Precision-Squeal.png',
      'blast_ham': 'Blast-Ham.png',
      'general_goldsnout': 'General-Goldsnout.png',
      // Weapons
      'oink_pistol': 'Oink-9-Pistol.png',
      'sow_machinegun': 'Sow-MP5.png',
      'boar_rifle': 'Boar-AR15.png',
      'tusk_shotgun': 'Double-Tusk-Shotgun.png',
      'sniper_swine': 'Longbore-Sniper.png',
      'belcha_minigun': 'Belcha-Minigun.png',
      'plasma_porker': 'Plasma-Porker-X.png',
      'bacon_blaster': 'Bacon-Blaster-9000.png'
    };
    return `/assets/sprites/${map[id] || 'pig-Token.png'}`;
  };

  return (
    <div style={{ padding: '20px', color: '#fff', height: '100%', overflowY: 'auto', background: '#0a0a0a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ padding: '10px 20px', background: '#444', border: '2px solid #ffd700', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          BACK
        </button>
        <h2 style={{ color: '#ffd700', margin: 0, textTransform: 'uppercase' }}>Armory</h2>
        <div style={{ width: '80px' }}></div> {/* Spacer to center the title */}
      </div>
      
      <h3 style={{ color: '#ff6b35', borderBottom: '2px solid #333', paddingBottom: '10px' }}>Weapons</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        {items.weapons.map(w => (
          <div key={w.weaponId} style={{ background: '#222', padding: '15px', borderRadius: '12px', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img src={getImageFilename(w.weaponId)} style={{ width: '60px', height: '60px', objectFit: 'contain' }} alt={w.name} />
              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>{w.name}</h4>
                <div style={{ fontSize: '12px', color: '#aaa' }}>DMG: {w.damage} | TYPE: {w.type}</div>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              {w.owned ? (
                <span style={{ color: '#4caf50', fontWeight: 'bold' }}>OWNED</span>
              ) : (
                <button 
                  disabled={!w.canAfford} 
                  onClick={() => handleBuy('WEAPON', w.weaponId)} 
                  style={{ padding: '8px 15px', background: w.canAfford ? '#ff6b35' : '#555', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', cursor: w.canAfford ? 'pointer' : 'not-allowed' }}
                >
                  <img src="/assets/sprites/pig-Token.png" style={{ width: '16px', height: '16px' }} alt="" />
                  {w.pricePigs}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};