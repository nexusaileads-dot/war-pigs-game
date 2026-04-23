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
        padding: '12px',
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
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: '10px',
          maxWidth: 'min(560px, 62vw)',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.82)',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '2px solid #444',
            minWidth: '220px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(2px)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              marginBottom: '8px',
              gap: '10px'
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
              height: '18px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
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
            background: 'rgba(0,0,0,0.82)',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '2px solid #444',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: '44px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(2px)'
          }}
        >
          <span>KILLS</span>
          <span style={{ color: '#ff6b35' }}>{kills}</span>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(0,0,0,0.86)',
          padding: '8px 14px',
          borderRadius: '12px',
          color: '#ffd700',
          fontWeight: 700,
          border: '2px solid #ffd700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          minHeight: '44px',
          backdropFilter: 'blur(2px)'
        }}
      >
        <img
          src="/assets/sprites/pig-token.png"
          alt="PIGS"
          style={{ width: '20px', height: '20px', objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <span>{pigs}</span>
      </div>
    </div>
  );
};
