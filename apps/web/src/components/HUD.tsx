import React from 'react';

export const HUD: React.FC<{ health: number, maxHealth: number, pigs: number }> = ({ health, maxHealth, pigs }) => {
  const healthPercent = Math.max(0, (health / maxHealth) * 100);
  
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '10px', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
      <div style={{ width: '200px', height: '24px', background: 'rgba(0,0,0,0.7)', borderRadius: '12px', border: '2px solid #444' }}>
        <div style={{ width: `${healthPercent}%`, height: '100%', background: healthPercent > 50 ? '#4caf50' : '#f44336', transition: 'width 0.2s' }} />
      </div>
      <div style={{ background: 'rgba(0,0,0,0.7)', padding: '5px 15px', borderRadius: '12px', color: '#ffd700', fontWeight: 'bold', border: '2px solid #ffd700' }}>
        $PIGS: {pigs}
      </div>
    </div>
  );
};
