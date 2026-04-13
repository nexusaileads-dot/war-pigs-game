import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export const CharacterSelect: React.FC<{ onBack: () => void, onStart: () => void }> = ({ onBack, onStart }) => {
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/api/inventory').then(res => {
      setInventory(res.data.items.filter((i: any) => i.type === 'CHARACTER'));
    });
  }, []);

  const selectCharacter = async (id: string) => {
    await apiClient.post('/api/inventory/equip', { characterId: id });
    onStart();
  };

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <button onClick={onBack} style={{ padding: '10px', marginBottom: '20px', background: '#ff6b35', border: 'none', color: '#fff' }}>Back</button>
      <h2>Select Soldier</h2>
      {inventory.map(item => (
        <div key={item.details.characterId} style={{ background: '#222', padding: '15px', margin: '10px 0', borderRadius: '8px', cursor: 'pointer' }} onClick={() => selectCharacter(item.details.characterId)}>
          <h3>{item.details.name}</h3>
          <p>{item.details.classType}</p>
        </div>
      ))}
    </div>
  );
};
