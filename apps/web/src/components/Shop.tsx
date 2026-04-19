import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

type ShopCharacter = {
  characterId: string;
  name: string;
  classType: string;
  description?: string | null;
  pricePigs: number;
  unlockLevel: number;
  owned: boolean;
  canAfford: boolean;
  canUnlock: boolean;
};

type ShopWeapon = {
  weaponId: string;
  name: string;
  type: string;
  damage: number;
  description?: string | null;
  pricePigs: number;
  unlockLevel: number;
  owned: boolean;
  canAfford: boolean;
  canUnlock: boolean;
};

type ShopPayload = {
  characters: ShopCharacter[];
  weapons: ShopWeapon[];
};

export const Shop: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [items, setItems] = useState<ShopPayload>({ characters: [], weapons: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const { user, refreshProfile } = useGameStore();

  const currentPigs = user?.profile.currentPigs || 0;

  useEffect(() => {
    void loadShop();
  }, []);

  const loadShop = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/shop/items');
      setItems(res.data);
    } catch (error) {
      console.error('Failed to load shop:', error);
      alert('Failed to load armory.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async (type: 'CHARACTER' | 'WEAPON', id: string) => {
    const key = `${type}:${id}`;

    try {
      setBuyingKey(key);
      await apiClient.post('/api/shop/buy', { itemType: type, itemId: id });
      await Promise.all([loadShop(), refreshProfile()]);
      alert('Purchase successful.');
    } catch (error: any) {
      console.error('Purchase failed:', error);
      const message =
        error?.response?.data?.error ||
        'Purchase failed. Check your level and $PIGS balance.';
      alert(message);
    } finally {
      setBuyingKey(null);
    }
  };

  const getImageFilename = (id: string) => {
    const map: Record<string, string> = {
      grunt_bacon: 'Grunt-Bacon.png',
      iron_tusk: 'Iron-Tusk.png',
      swift_hoof: 'Swift-Hoof.png',
      precision_squeal: 'Precision-Squeal.png',
      blast_ham: 'Blast-Ham.png',
      general_goldsnout: 'General-Goldsnout.png',
      oink_pistol: 'Oink-9-Pistol.png',
      sow_machinegun: 'Sow-MP5.png',
      boar_rifle: 'Boar-AR15.png',
      tusk_shotgun: 'Double-Tusk-Shotgun.png',
      sniper_swine: 'Longbore-Sniper.png',
      belcha_minigun: 'Belcha-Minigun.png',
      plasma_porker: 'Plasma-Porker-X.png',
      bacon_blaster: 'Bacon-Blaster-9000.png'
    };

    return `/assets/sprites/${map[id] || 'pig-token.png'}`;
  };

  const sortedCharacters = useMemo(
    () => [...items.characters].sort((a, b) => a.pricePigs - b.pricePigs),
    [items.characters]
  );

  const sortedWeapons = useMemo(
    () => [...items.weapons].sort((a, b) => a.pricePigs - b.pricePigs),
    [items.weapons]
  );

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
        LOADING ARMORY...
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
        background: '#0a0a0a'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '12px'
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            background: '#444',
            border: '2px solid #ffd700',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          BACK
        </button>

        <h2 style={{ color: '#ffd700', margin: 0, textTransform: 'uppercase' }}>Armory</h2>

        <div
          style={{
            minWidth: '110px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '6px',
            color: '#ffd700',
            fontWeight: 'bold'
          }}
        >
          <img src="/assets/sprites/pig-token.png" style={{ width: '18px', height: '18px' }} alt="" />
          {currentPigs}
        </div>
      </div>

      <h3 style={{ color: '#ff6b35', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        Soldiers
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        {sortedCharacters.map((character) => {
          const key = `CHARACTER:${character.characterId}`;
          const disabled =
            character.owned || !character.canAfford || !character.canUnlock || buyingKey === key;

          return (
            <div
              key={character.characterId}
              style={{
                background: '#222',
                padding: '15px',
                borderRadius: '12px',
                border: '2px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
                <img
                  src={getImageFilename(character.characterId)}
                  style={{ width: '60px', height: '60px', objectFit: 'contain', flexShrink: 0 }}
                  alt={character.name}
                />
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>{character.name}</h4>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                    CLASS: {character.classType} | REQ LVL: {character.unlockLevel}
                  </div>
                  {character.description ? (
                    <div style={{ fontSize: '12px', color: '#bbb' }}>{character.description}</div>
                  ) : null}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {character.owned ? (
                  <span style={{ color: '#4caf50', fontWeight: 'bold' }}>OWNED</span>
                ) : !character.canUnlock ? (
                  <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
                    LVL {character.unlockLevel}
                  </span>
                ) : (
                  <button
                    disabled={disabled}
                    onClick={() => void handleBuy('CHARACTER', character.characterId)}
                    style={{
                      padding: '8px 15px',
                      background: disabled ? '#555' : '#ff6b35',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <img
                      src="/assets/sprites/pig-token.png"
                      style={{ width: '16px', height: '16px' }}
                      alt=""
                    />
                    {buyingKey === key ? '...' : character.pricePigs}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ color: '#ff6b35', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        Weapons
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        {sortedWeapons.map((weapon) => {
          const key = `WEAPON:${weapon.weaponId}`;
          const disabled =
            weapon.owned || !weapon.canAfford || !weapon.canUnlock || buyingKey === key;

          return (
            <div
              key={weapon.weaponId}
              style={{
                background: '#222',
                padding: '15px',
                borderRadius: '12px',
                border: '2px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
                <img
                  src={getImageFilename(weapon.weaponId)}
                  style={{ width: '60px', height: '60px', objectFit: 'contain', flexShrink: 0 }}
                  alt={weapon.name}
                />
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>{weapon.name}</h4>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                    DMG: {weapon.damage} | TYPE: {weapon.type} | REQ LVL: {weapon.unlockLevel}
                  </div>
                  {weapon.description ? (
                    <div style={{ fontSize: '12px', color: '#bbb' }}>{weapon.description}</div>
                  ) : null}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {weapon.owned ? (
                  <span style={{ color: '#4caf50', fontWeight: 'bold' }}>OWNED</span>
                ) : !weapon.canUnlock ? (
                  <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
                    LVL {weapon.unlockLevel}
                  </span>
                ) : (
                  <button
                    disabled={disabled}
                    onClick={() => void handleBuy('WEAPON', weapon.weaponId)}
                    style={{
                      padding: '8px 15px',
                      background: disabled ? '#555' : '#ff6b35',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <img
                      src="/assets/sprites/pig-token.png"
                      style={{ width: '16px', height: '16px' }}
                      alt=""
                    />
                    {buyingKey === key ? '...' : weapon.pricePigs}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
