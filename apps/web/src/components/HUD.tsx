import React from 'react';

type HUDProps = {
  health: number;
  maxHealth: number;
  pigs: number;
  kills?: number;
};

export const HUD: React.FC<HUDProps> = ({
  health,
  maxHealth,
  pigs,
  kills = 0
}) => {
  const safeMaxHealth = Math.max(1, maxHealth);
  const safeHealth = Math.max(0, Math.min(health, safeMaxHealth));
  const healthPercent = Math.max(0, Math.min(100, (safeHealth / safeMaxHealth) * 100));

  const healthColor =
    healthPercent > 60 ? '#4caf50' : healthPercent > 30 ? '#ff9800' : '#f44336';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        pointerEvents: 'none',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.78)',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '2px solid #444',
            minWidth: '240px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              marginBottom: '8px'
            }}
          >
            <span>HEALTH</span>
            <span>
              {safeHealth}/{safeMaxHealth}
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '22px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '11px',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${healthPercent}%`,
                height: '100%',
                background: healthColor,
                transition: 'width 0.2s ease, background 0.2s ease'
              }}
            />
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.78)',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '2px solid #444',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            width: 'fit-content'
          }}
        >
          <span>KILLS</span>
          <span style={{ color: '#ff6b35' }}>{kills}</span>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(0,0,0,0.85)',
          padding: '8px 14px',
          borderRadius: '12px',
          color: '#ffd700',
          fontWeight: 700,
          border: '2px solid #ffd700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
        }}
      >
        <img
          src="/assets/sprites/pig-token.png"
          alt="PIGS"
          style={{ width: '22px', height: '22px', objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <span>{pigs}</span>
      </div>
    </div>
  );
};
