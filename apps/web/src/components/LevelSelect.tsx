import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export const LevelSelect: React.FC<{ onBack: () => void, onStart: () => void }> = ({ onBack, onStart }) => {
  const [levels, setLevels] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/api/game/levels').then(res => setLevels(res.data));
  }, []);

  const handleStart = async (levelId: string) => {
    const profileRes = await apiClient.get('/api/inventory');
    const { equipped } = profileRes.data;
    
    const startRes = await apiClient.post('/api/game/start', {
      levelId,
      characterId: equipped.characterId,
      weaponId: equipped.weaponId
    });
    
    sessionStorage.setItem('currentRun', JSON.stringify(startRes.data));
    onStart();
  };

  return (
    <div style={{ padding: '20px', color: '#fff', height: '100%', overflowY: 'auto' }}>
      <button onClick={onBack} style={{ padding: '10px', marginBottom: '20px', background: '#ff6b35', border: 'none', color: '#fff' }}>Back</button>
      <h2>Select Mission</h2>
      {levels.map(level => (
        <div key={level.id} style={{ background: level.unlocked ? '#222' : '#111', padding: '15px', margin: '10px 0', borderRadius: '8px', opacity: level.unlocked ? 1 : 0.5 }}>
          <h3>Mission {level.levelNumber}: {level.name}</h3>
          <p>Difficulty: {level.difficulty}</p>
          {level.unlocked && <button onClick={() => handleStart(level.id)} style={{ padding: '8px 16px', background: '#ff6b35', color: '#fff', border: 'none', marginTop: '10px' }}>Deploy</button>}
        </div>
      ))}
    </div>
  );
};
