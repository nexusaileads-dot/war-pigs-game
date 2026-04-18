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

  const getClassIcon = (classType: string) => {
    const formattedClass = classType.charAt(0).toUpperCase() + classType.slice(1).toLowerCase();
    return `/assets/sprites/${formattedClass}.png`;
  };

  return (
    <div style={{ padding: '20px', color: '#fff', height: '100%', overflowY: 'auto', background: '#0a0a0a' }}>
      <button onClick={onBack} style={{ padding: '10px 20px', marginBottom: '20px', background: '#444', border: '2px solid #ff6b35', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
        BACK
      </button>
      
      <h2 style={{ textAlign: 'center', color: '#ff6b35', marginBottom: '20px', textTransform: 'uppercase' }}>Select Soldier</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {inventory.map(item => (
          <div 
            key={item.details.characterId} 
            style={{ background: '#222', padding: '15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', border: '2px solid #333' }} 
            onClick={() => selectCharacter(item.details.characterId)}
          >
            <div style={{ background: '#111', padding: '10px', borderRadius: '8px', border: '1px solid #444' }}>
              <img 
                src={getClassIcon(item.details.classType)} 
                alt={item.details.classType} 
                style={{ width: '40px', height: '40px' }} 
                onError={(e) => e.currentTarget.style.display = 'none'} 
              />
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#fff' }}>{item.details.name}</h3>
              <p style={{ margin: 0, color: '#888', fontWeight: 'bold' }}>CLASS: {item.details.classType}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};