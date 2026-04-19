import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type InventoryItem = {
  id: string;
  type: 'CHARACTER' | 'WEAPON';
  details: {
    characterId: string;
    name: string;
    classType: string;
    description?: string | null;
  };
};

export const CharacterSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({
  onBack,
  onStart
}) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const res = await apiClient.get('/api/inventory');
        const characters = (res.data.items || []).filter(
          (item: InventoryItem) => item.type === 'CHARACTER' && item.details?.characterId
        );

        setInventory(characters);
        setSelectedCharacterId(res.data.equipped?.characterId || characters[0]?.details.characterId || null);
      } catch (error) {
        console.error('Failed to load character inventory:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadInventory();
  }, []);

  const confirmSelection = async () => {
    if (!selectedCharacterId) {
      alert('Select a character first.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { characterId: selectedCharacterId });
      onStart();
    } catch (error) {
      console.error('Failed to equip character:', error);
      alert('Failed to equip character.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClassIcon = (classType: string) => {
    const classMap: Record<string, string> = {
      ASSAULT: 'assault.png',
      TANK: 'tank.png',
      SNIPER: 'sniper.png',
      SCOUT: 'scout.png',
      DEMOLITION: 'Demolition.png',
      ELITE: 'Elite.png'
    };

    return `/assets/sprites/${classMap[classType.toUpperCase()] || 'assault.png'}`;
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0a0a0a'
        }}
      >
        LOADING SQUAD...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        color: '#fff',
        height: '100%',
        overflowY: 'auto',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          background: '#444',
          border: '2px solid #ff6b35',
          color: '#fff',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          alignSelf: 'flex-start'
        }}
      >
        BACK
      </button>

      <h2
        style={{
          textAlign: 'center',
          color: '#ff6b35',
          marginBottom: '20px',
          textTransform: 'uppercase'
        }}
      >
        Select Soldier
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
        {inventory.map((item) => {
          const isSelected = selectedCharacterId === item.details.characterId;

          return (
            <button
              key={item.details.characterId}
              type="button"
              onClick={() => setSelectedCharacterId(item.details.characterId)}
              style={{
                background: isSelected ? '#2a1b14' : '#222',
                padding: '15px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                border: `2px solid ${isSelected ? '#ff6b35' : '#333'}`,
                color: '#fff',
                textAlign: 'left'
              }}
            >
              <div
                style={{
                  background: '#111',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  minWidth: '64px',
                  minHeight: '64px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src={getClassIcon(item.details.classType)}
                  alt={item.details.classType}
                  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.src = '/assets/sprites/assault.png';
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#fff' }}>
                  {item.details.name}
                </h3>
                <p style={{ margin: '0 0 6px 0', color: '#888', fontWeight: 'bold' }}>
                  CLASS: {item.details.classType}
                </p>
                {item.details.description ? (
                  <p style={{ margin: 0, color: '#bbb', fontSize: '13px' }}>
                    {item.details.description}
                  </p>
                ) : null}
              </div>

              {isSelected ? (
                <div style={{ color: '#ff6b35', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  SELECTED
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => void confirmSelection()}
        disabled={!selectedCharacterId || isSubmitting}
        style={{
          padding: '14px 20px',
          background: !selectedCharacterId || isSubmitting ? '#555' : '#ff6b35',
          border: 'none',
          color: '#fff',
          borderRadius: '10px',
          cursor: !selectedCharacterId || isSubmitting ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginTop: 'auto'
        }}
      >
        {isSubmitting ? 'EQUIPPING...' : 'CONFIRM LOADOUT'}
      </button>
    </div>
  );
};
