import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type ProfileUser = {
  username?: string | null;
  firstName?: string | null;
  profile?: {
    level: number;
    xp: number;
    currentPigs: number;
    totalPigsEarned: number;
  } | null;
  stats?: {
    totalKills: number;
    totalRuns: number;
    totalBossKills: number;
  } | null;
  wallet?: {
    solanaAddress?: string | null;
    pendingRewards: number;
    claimedRewards: number;
    lastClaimAt?: string | null;
  } | null;
};

export const Profile: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [profileData, setProfileData] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await apiClient.get('/api/auth/me');
        setProfileData(res.data.user);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          color: '#fff',
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        LOADING PROFILE...
      </div>
    );
  }

  if (!profileData) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#fff',
          background: '#0a0a0a',
          minHeight: '100vh'
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '10px',
            marginBottom: '20px',
            background: '#ff6b35',
            border: 'none',
            color: '#fff',
            borderRadius: '4px'
          }}
        >
          Back
        </button>
        <div>PROFILE UNAVAILABLE.</div>
      </div>
    );
  }

  const profile = profileData.profile;
  const stats = profileData.stats;
  const wallet = profileData.wallet;

  return (
    <div
      style={{
        padding: '20px',
        color: '#fff',
        background: '#0a0a0a',
        minHeight: '100vh'
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: '10px',
          marginBottom: '20px',
          background: '#ff6b35',
          border: 'none',
          color: '#fff',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Back
      </button>

      <h2>Soldier: {profileData.username || profileData.firstName || 'Anonymous'}</h2>

      <div
        style={{
          background: '#222',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Profile</h3>
        <p>Level: {profile?.level ?? 1}</p>
        <p>XP: {profile?.xp ?? 0}</p>
        <p>$PIGS: {profile?.currentPigs ?? 0}</p>
        <p>Total Earned: {profile?.totalPigsEarned ?? 0}</p>
      </div>

      <div
        style={{
          background: '#222',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Combat Stats</h3>
        <p>Total Kills: {stats?.totalKills ?? 0}</p>
        <p>Total Runs: {stats?.totalRuns ?? 0}</p>
        <p>Bosses Defeated: {stats?.totalBossKills ?? 0}</p>
      </div>

      <div
        style={{
          background: '#222',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Wallet</h3>
        <p>Address: {wallet?.solanaAddress || 'Not linked'}</p>
        <p>Pending Rewards: {wallet?.pendingRewards ?? 0}</p>
        <p>Claimed Rewards: {wallet?.claimedRewards ?? 0}</p>
        <p>Last Claim: {wallet?.lastClaimAt || 'Never'}</p>
      </div>
    </div>
  );
};
