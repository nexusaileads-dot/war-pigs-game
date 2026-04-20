import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

type WeaponDetails = {
  weaponId: string;
  name: string;
  description?: string | null;
};

type InventoryItem = {
  id: string;
  type: 'CHARACTER' | 'WEAPON';
  details: WeaponDetails;
};

export const WeaponSelect: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoadError(null);

        const res = await apiClient.get('/api/inventory');
        const items = Array.isArray(res.data?.items) ? res.data.items : [];

        const weapons = items.filter(
          (item: InventoryItem) => item.type === 'WEAPON' && item.details?.weaponId
        );

        setInventory(weapons);

        const equippedId = res.data?.equipped?.weaponId || weapons[0]?.details.weaponId || null;
        setEquippedWeaponId(equippedId);
        setSelectedWeaponId(equippedId);
      } catch (error) {
        console.error('Failed to load weapon inventory:', error);
        setLoadError('Failed to load armory inventory.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadInventory();
  }, []);

  const selectedWeapon = useMemo(
    () => inventory.find((item) => item.details.weaponId === selectedWeaponId) || null,
    [inventory, selectedWeaponId]
  );

  const confirmWeapon = async () => {
    if (!selectedWeaponId) {
      alert('Select a weapon first.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/api/inventory/equip', { weaponId: selectedWeaponId });
      alert('Weapon Equipped!');
      onBack();
    } catch (error) {
      console.error('Failed to equip weapon:', error);
      alert('Failed to equip weapon.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getImageFilename = (id: string) => {
    const map: Record<string, string> = {
      oink_pistol: 'Oink-9-Pistol.png',
      sow_machinegun: 'Sow-MP5.png',
      boar_rifle: 'Boar-AR15.png',
      tusk_shotgun: 'Double-Tusk-Shotgun.png',
      sniper_swine: 'Longbore-Sniper.png',
      belcha_minigun: 'Belcha-Minigun.png',
      plasma_porker: 'Plasma-Porker-X.png',
      bacon_blaster: 'Bacon-Blaster-9000.png'
    };
    return `/assets/sprites/${map[id] || 'Standard-Bullet.png'}`;
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0a0a0a'
        }}
      >
        LOADING ARMORY...
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          minHeight: '100vh',
          background: '#0a0a0a'
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            marginBottom: '20px',
            background: '#444',
            border: '2px solid #888',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          BACK TO MENU
        </button>

        <div
          style={{
            maxWidth: '520px',
            margin: '80px auto 0',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #5a1f1f',
            background: '#1a1111',
            textAlign: 'center',
            color: '#ff8a80'
          }}
        >
          {loadError}
        </div>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          minHeight: '100vh',
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
            border: '2px solid #888',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            alignSelf: 'flex-start'
          }}
        >
          BACK TO MENU
        </button>

        <div
          style={{
            maxWidth: '560px',
            margin: '80px auto 0',
            padding: '22px',
            background: '#151515',
            border: '2px solid #333',
            borderRadius: '12px',
            textAlign: 'center'
          }}
        >
          <h2 style={{ marginTop: 0, color: '#888' }}>No Weapons Available</h2>
          <p style={{ color: '#bbb', marginBottom: 0 }}>
            Your armory has no weapons yet. Acquire one before deployment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        color: '#fff',
        minHeight: '100vh',
        overflowY: 'auto',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          background: '#444',
          border: '2px solid #888',
          color: '#fff',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          alignSelf: 'flex-start'
        }}
      >
        BACK TO MENU
      </button>

      <h2
        style={{
          textAlign: 'center',
          color: '#888',
          marginBottom: '20px',
          textTransform: 'uppercase'
        }}
      >
        Select Weapon
      </h2>

      {selectedWeapon ? (
        <div
          style={{
            background: '#161616',
            border: '2px solid #888',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '18px',
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              background: '#101010',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #333',
              width: '90px',
              height: '70px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={getImageFilename(selectedWeapon.details.weaponId)}
              alt={selectedWeapon.details.name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.src = '/assets/sprites/Standard-Bullet.png';
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
              CURRENT SELECTION
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
              {selectedWeapon.details.name}
            </div>
            {selectedWeapon.details.description ? (
              <div style={{ color: '#bbb', fontSize: '13px', marginTop: '6px' }}>
                {selectedWeapon.details.description}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
        {inventory.map((item) => {
          const weaponId = item.details.weaponId;
          const isSelected = selectedWeaponId === weaponId;
          const isEquipped = equippedWeaponId === weaponId;

          return (
            <button
              key={weaponId}
              type="button"
              onClick={() => setSelectedWeaponId(weaponId)}
              style={{
                background: isSelected ? '#1d1d1d' : '#222',
                padding: '15px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                border: `2px solid ${isSelected ? '#ffd700' : '#333'}`,
                color: '#fff',
                textAlign: 'left',
                boxShadow: isSelected ? '0 8px 20px rgba(255,215,0,0.14)' : 'none'
              }}
            >
              <div
                style={{
                  background: '#111',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  width: '80px',
                  height: '60px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                <img
                  src={getImageFilename(weaponId)}
                  alt={item.details.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.src = '/assets/sprites/Standard-Bullet.png';
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#fff' }}>
                  {item.details.name}
                </h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>
                  {item.details.description || 'Standard issue armament.'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                {isEquipped ? (
                  <span
                    style={{
                      color: '#4caf50',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    EQUIPPED
                  </span>
                ) : null}

                {isSelected ? (
                  <span
                    style={{
                      color: '#ffd700',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    SELECTED
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => void confirmWeapon()}
        disabled={!selectedWeaponId || isSubmitting}
        style={{
          padding: '14px 20px',
          background: !selectedWeaponId || isSubmitting ? '#555' : '#ffd700',
          border: 'none',
          color: !selectedWeaponId || isSubmitting ? '#ddd' : '#111',
          borderRadius: '10px',
          cursor: !selectedWeaponId || isSubmitting ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginTop: 'auto'
        }}
      >
        {isSubmitting ? 'EQUIPPING...' : 'CONFIRM WEAPON'}
      </button>
    </div>
  );
};
