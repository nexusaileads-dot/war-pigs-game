import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useTelegram } from './TelegramProvider';

interface Props {
  onNavigate: (screen: string) => void;
}

export const MenuScene: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useGameStore();
  const { hapticFeedback } = useTelegram();

  const handleNavigate = (screen: string) => {
    hapticFeedback('medium');
    onNavigate(screen);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1810 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      color: '#fff'
    }}>
      {/* Top Navigation Image */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <img src="/assets/sprites/navigation-menu.png" alt="Menu" style={{ maxWidth: '100%', height: 'auto', maxHeight: '60px' }} />
      </div>

      {/* Logo Area */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '42px',
          fontWeight: '900',
          color: '#ff6b35',
          textShadow: '3px 3px 0 #8b0000, -1px -1px 0 #000',
          letterSpacing: '2px',
          margin: '0 0 10px 0'
        }}>
          WAR PIGS
        </h1>
        <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '4px' }}>
          Tactical Swine Warfare
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', background: 'rgba(0,0,0,0.5)', padding: '15px 25px', borderRadius: '12px', border: '2px solid #ff6b35' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>LEVEL</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700' }}>{user?.profile.level || 1}</div>
        </div>
        <div style={{ width: '1px', background: '#444' }} />
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>$PIGS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6b35', display: 'flex', alignItems: 'center', gap: '5px' }}>
             <img src="/assets/sprites/pig-Token.png" style={{ width: '20px', height: '20px' }} alt="" />
            {user?.profile.currentPigs || 0}
          </div>
        </div>
      </div>

      {/* Menu Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '300px' }}>
        <MenuButton icon="🎮" label="PLAY MISSION" color="#ff6b35" onClick={() => handleNavigate('CHAR_SELECT')} />
        <MenuButton icon="🐷" label="PROFILE" color="#4a90d9" onClick={() => handleNavigate('PROFILE')} />
        <MenuButton icon="🛒" label="ARMORY" color="#ffd700" onClick={() => handleNavigate('SHOP')} />
        <MenuButton icon="⚙️" label="LOADOUT" color="#888" onClick={() => handleNavigate('WEAPON_SELECT')} />
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', textAlign: 'center', padding: '20px', fontSize: '11px', color: '#555' }}>
        Swine Corps Division 7 • v1.0.0
      </div>
    </div>
  );
};

const MenuButton: React.FC<{ icon: string; label: string; color: string; onClick: () => void; }> = ({ icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '15px', padding: '18px 24px',
      background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
      border: `2px solid ${color}`, borderRadius: '12px', color: '#fff',
      fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
      transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '1px'
    }}
  >
    <span style={{ fontSize: '24px' }}>{icon}</span>
    {label}
  </button>
);