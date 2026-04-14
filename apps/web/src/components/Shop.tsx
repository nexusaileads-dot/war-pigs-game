import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useTelegram } from './TelegramProvider';

export const Shop: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [items, setItems] = useState<{ characters: any[], weapons: any[] }>({ characters: [], weapons: [] });
  const { hapticFeedback } = useTelegram();

  useEffect(() => {
    apiClient.get('/api/shop/items').then(res => setItems(res.data));
  }, []);

  const handleBuy = async (type: string, id: string) => {
    try {
      await apiClient.post('/api/shop/buy', { itemType: type, itemId: id });
      hapticFeedback('success');
      const res = await apiClient.get('/api/shop/items');
      setItems(res.data);
    } catch (error) {
      hapticFeedback('error');
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff', height: '100%', overflowY: 'auto' }}>
      <button onClick={onBack} style={{ padding: '10px', marginBottom: '20px', background: '#ff6b35', border: 'none', color: '#fff', borderRadius: '4px' }}>Back</button>
      <h2>Armory</h2>
      
      <h3>Weapons</h3>
      <div style={{ display: 'grid', gap: '10px' }}>
        {items.weapons.map(w => (
          <div key={w.weaponId} style={{ background: '#222', padding: '10px', borderRadius: '8px' }}>
            <h4>{w.name}</h4>
            <p>Damage: {w.damage} | Cost: {w.pricePigs} PIGS</p>
            {w.owned ? <span style={{ color: '#4caf50' }}>Owned</span> : 
              <button disabled={!w.canAfford} onClick={() => handleBuy('WEAPON', w.weaponId)} style={{ padding: '5px 10px', background: w.canAfford ? '#ff6b35' : '#555', color: '#fff', border: 'none' }}>Buy</button>
            }
          </div>
        ))}
      </div>
    </div>
  );
};
