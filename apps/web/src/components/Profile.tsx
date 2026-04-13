import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export const Profile: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/api/auth/me').then(res => setProfileData(res.data.user));
  }, []);

  if (!profileData) return <div style={{ color: '#fff' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <button onClick={onBack} style={{ padding: '10px', marginBottom: '20px', background: '#ff6b35', border: 'none', color: '#fff', borderRadius: '4px' }}>Back</button>
      <h2>Soldier: {profileData.username || profileData.firstName}</h2>
      <div style={{ background: '#222', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
        <p>Level: {profileData.profile.level}</p>
        <p>XP: {profileData.profile.xp}</p>
        <p>$WPIGS: {profileData.profile.currentWpigs}</p>
        <p>Total Earned: {profileData.profile.totalWpigsEarned}</p>
      </div>
      <div style={{ background: '#222', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
        <h3>Combat Stats</h3>
        <p>Total Kills: {profileData.stats.totalKills}</p>
        <p>Total Runs: {profileData.stats.totalRuns}</p>
        <p>Bosses Defeated: {profileData.stats.totalBossKills}</p>
      </div>
    </div>
  );
};
