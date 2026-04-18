import React from 'react';

export const HUD: React.FC<{ health: number, maxHealth: number, pigs: number }> = ({ health, maxHealth, pigs }) => {
  const healthPercent = Math.max(0, (health / maxHealth) * 100);
  
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '15px', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
      
      {/* Health Bar */}
      <div style={{ width: '200px', height: '24px', background: 'rgba(0,0,0,0.7)', borderRadius: '12px', border: '2px solid #444', overflow: 'hidden' }}>
        <div style={{ width: `${healthPercent}%`, height: '100%', background: healthPercent > 50 ? '#4caf50' : '#f44336', transition: 'width 0.2s' }} />
      </div>

      {/* $PIGS Token Counter */}
      <div style={{ background: 'rgba(0,0,0,0.8)', padding: '5px 15px', borderRadius: '12px', color: '#ffd700', fontWeight: 'bold', border: '2px solid #ffd700', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="/assets/sprites/pig-Token.png" alt="PIGS" style={{ width: '24px', height: '24px' }} />
        {pigs}
      </div>

    </div>
  );
};