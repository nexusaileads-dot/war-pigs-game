import React, { useEffect, useState } from 'react';

export const LandscapeOverlay: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    
    checkOrientation(); // Initial check
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  if (!isPortrait) return null;

  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(10,10,10,0.98)', 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      padding: 20, textAlign: 'center', backdropFilter: 'blur(8px)' 
    }}>
      <div style={{ 
        width: 80, height: 80, border: '3px solid #ff6b35', borderRadius: 20, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        marginBottom: 24, animation: 'tiltPhone 2s infinite ease-in-out', background: '#1a1111' 
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12.01" y2="18"></line>
        </svg>
      </div>
      <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '1px' }}>
        Rotate Device
      </h2>
      <p style={{ color: '#bbb', fontSize: 16, maxWidth: 320, lineHeight: 1.5 }}>
        War Pigs requires a wider screen. Please rotate your phone to landscape mode to play.
      </p>
      <style>{`
        @keyframes tiltPhone {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(-90deg); }
          100% { transform: rotate(-90deg); }
        }
      `}</style>
    </div>
  );
};
