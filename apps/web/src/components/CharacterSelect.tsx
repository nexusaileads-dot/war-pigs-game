import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

type Character = {
  id: string;
  name: string;
  description: string;
  skill: string;
  imagePath: string;
};

const CHARACTERS: Character[] = [
  {
    id: 'grunt_bacon',
    name: 'Grunt Bacon',
    description: 'Balanced soldier. Reliable in combat.',
    skill: 'Adrenaline: Move 20% faster for 5 seconds when health drops below 30%.',
    imagePath: '/assets/sprites/Grunt-Bacon.png'
  },
  {
    id: 'iron_tusk',
    name: 'Iron Tusk',
    description: 'Heavy tank. High health, slow movement.',
    skill: 'Iron Hide: Blocks the first instance of damage taken every 15 seconds.',
    imagePath: '/assets/sprites/Iron-Tusk.png'
  },
  {
    id: 'swift_hoof',
    name: 'Swift Hoof',
    description: 'Fast scout. High mobility, low health.',
    skill: 'Dash: Double tap a direction to perform a damaging dash (5s cooldown).',
    imagePath: '/assets/sprites/Swift-Hoof.png'
  },
  {
    id: 'blast_ham',
    name: 'Blast Ham',
    description: 'Demolition expert. Explosive expertise.',
    skill: 'Kaboom: Reloading triggers a small explosion around the player dealing 50 damage.',
    imagePath: '/assets/sprites/Blast-Ham.png'
  },
  {
    id: 'precision_squeal',
    name: 'Precision Squeal',
    description: 'Sniper class. High damage, long range.',
    skill: 'Deadeye: Critical hits deal 200% damage instead of 150%.',
    imagePath: '/assets/sprites/Precision-Squeal.png'
  },
  {
    id: 'general_goldsnout',
    name: 'General Goldsnout',
    description: 'Elite commander. Inspiring presence.',
    skill: 'Commander\'s Aura: All teammates (and player) deal 10% increased damage.',
    imagePath: '/assets/sprites/General-Goldsnout.png'
  }
];

export const CharacterSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({ onBack, onStart }) => {
  const [selectedId, setSelectedId] = useState('grunt_bacon');
  const [isLoading, setIsLoading] = useState(false);

  const selectedChar = CHARACTERS.find(c => c.id === selectedId) || CHARACTERS[0];

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/api/inventory/equip', { characterId: selectedId });
      onStart();
    } catch (error) {
      console.error('Failed to select character', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', color: '#fff', padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <button onClick={onBack} style={{ ...btnStyle, width: 100, marginBottom: 20 }}>BACK</button>
      
      <h2 style={{ textAlign: 'center', color: '#ff6b35', margin: '0 0 20px 0' }}>SELECT UNIT</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {CHARACTERS.map(char => (
          <div 
            key={char.id} 
            onClick={() => setSelectedId(char.id)}
            style={{ 
              padding: 10, 
              background: selectedId === char.id ? '#333' : '#111', 
              border: selectedId === char.id ? '2px solid #ff6b35' : '2px solid #333',
              borderRadius: 8, 
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <img src={char.imagePath} alt={char.name} style={{ width: 60, height: 60, objectFit: 'contain' }} onError={e => (e.currentTarget.src = '/assets/sprites/shop.png')} />
            <div style={{ fontSize: 12, marginTop: 5 }}>{char.name}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#141414', padding: 15, borderRadius: 10, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 5px 0' }}>{selectedChar.name}</h3>
        <p style={{ fontSize: 14, color: '#aaa', margin: '0 0 10px 0' }}>{selectedChar.description}</p>
        
        <div style={{ background: '#222', padding: 10, borderRadius: 6, borderLeft: '3px solid #ff6b35' }}>
          <strong style={{ color: '#ffdd57' }}>SKILL:</strong>
          <p style={{ margin: '5px 0 0 0', fontSize: 13 }}>{selectedChar.skill}</p>
        </div>
      </div>

      <button 
        onClick={handleConfirm} 
        disabled={isLoading}
        style={{ padding: 15, background: '#ff6b35', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', borderRadius: 8 }}
      >
        {isLoading ? 'SAVING...' : 'CONFIRM SELECTION'}
      </button>
    </div>
  );
};

const btnStyle: React.CSSProperties = { padding: '10px 20px', background: '#444', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 6 };
