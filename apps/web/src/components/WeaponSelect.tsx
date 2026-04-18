import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export const WeaponSelect: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/api/inventory').then(res => {
      setInventory(res.data.items.filter((i: any) => i.type === 'WEAPON'));
    });
  }, []);

  const selectWeapon = async (id: string) => {
    await apiClient.post('/api/inventory/equip', { weaponId: id });
    alert("Weapon Equipped!");
    onBack();
  };

  const getImageFilename = (id: string) => {
    const map: Record<string, string> = {
      'oink_pistol': 'Oink-9-Pistol.png',
      'sow_machinegun': 'Sow-MP5.png',
      'boar_rifle': 'Boar-AR15.png',
      'tusk_shotgun': 'Double-Tusk-Shotgun.png',
      'sniper_swine': 'Longbore-Sniper.png',
      'belcha_minigun': 'Belcha-Minigun.png',
      'plasma_porker': 'Plasma-Porker-X.png',
      'bacon_blaster': 'Bacon-Blaster-9000.png'
    };
    return `/assets/sprites/${map[id] || 'Standard-Bullet.png'}`;
  };

  return (
    <div style={{ padding: '20px', color: '#fff', height: '100%', overflowY: 'auto', background: '#0a0a0a' }}>
      <button onClick={onBack} style={{ padding: '10px 20px', marginBottom: '20px', background: '#444', border: '2px solid #888', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
        BACK TO MENU
      </button>
      
      <h2 style={{ textAlign: 'center', color: '#888', marginBottom: '20px', textTransform: 'uppercase' }}>Select Weapon</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {inventory.map(item => (
          <div 
            key={item.details.weaponId} 
            style={{ background: '#222', padding: '15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', border: '2px solid #333' }} 
            onClick={() => selectWeapon(item.details.weaponId)}
          >
            <div style={{ background: '#111', padding: '10px', borderRadius: '8px', border: '1px solid #444', width: '80px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img 
                src={getImageFilename(item.details.weaponId)} 
                alt={item.details.name} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
              />
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#fff' }}>{item.details.name}</h3>
              <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>{item.details.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};