import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { apiClient } from '../api/client';

// Helper to format dates nicely
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'Never';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
};

export const Profile: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, isLoading: storeLoading } = useGameStore();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Fallback if store is loading
  if (storeLoading) {
    return <div style={centerContainerStyle}>LOADING SOLDIER DOSSIER...</div>;
  }

  const handleClaim = async () => {
    if (!user?.wallet?.solanaAddress || !user.wallet.pendingRewards) return;

    try {
      setIsClaiming(true);
      setClaimError(null);
      
      // NOTE: Ensure this route exists in backend (apps/api/src/routes/economy.ts or similar)
      // or use the generic /api/economy/claim endpoint.
      // We assume the backend validates the session and calls EconomyService.claimRewards.
      await apiClient.post('/api/economy/claim'); 
      
      // Refresh store to reflect new balance
      await useGameStore.getState().refreshProfile();
    } catch (error: any) {
      setClaimError(error?.response?.data?.error || 'Claim failed.');
    } finally {
      setIsClaiming(false);
    }
  };

  const profile = user?.profile;
  const stats = user?.stats;
  const wallet = user?.wallet;

  return (
    <div style={containerStyle}>
      <button onClick={onBack} style={backButtonStyle}>BACK TO MENU</button>

      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>Soldier: {user?.username || user?.firstName || 'Anonymous'}</h2>
        <div style={{ color: '#ffd700', fontWeight: 800, marginTop: 8 }}>
          Level {profile?.level ?? 1}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={gridStyle}>
        <StatCard label="Current Balance" value={`${profile?.currentPigs ?? 0} $PIGS`} color="#ff6b35" />
        <StatCard label="Total Earned" value={`${profile?.totalPigsEarned ?? 0} $PIGS`} color="#888" />
        <StatCard label="Total Kills" value={String(stats?.totalKills ?? 0)} color="#fff" />
        <StatCard label="Runs Completed" value={String(stats?.totalRuns ?? 0)} color="#fff" />
        <StatCard label="Bosses Defeated" value={String(stats?.totalBossKills ?? 0)} color="#ffd700" />
      </div>

      {/* Wallet Section */}
      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: '#ff6b35' }}>Wallet</h3>
        
        <div style={{ color: '#ccc', fontSize: 14, marginBottom: 10 }}>
          <span style={{ color: '#888' }}>Address:</span> {wallet?.solanaAddress ? `${wallet.solanaAddress.slice(0, 6)}...${wallet.solanaAddress.slice(-4)}` : 'Not Linked'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: 12, borderRadius: 8 }}>
          <div>
            <div style={{ color: '#888', fontSize: 12 }}>Pending Rewards</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{wallet?.pendingRewards ?? 0} $PIGS</div>
          </div>
          
          <button 
            onClick={() => void handleClaim()}
            disabled={!wallet?.solanaAddress || !wallet?.pendingRewards || isClaiming}
            style={{
              padding: '10px 16px',
              background: (wallet?.pendingRewards ?? 0) > 0 ? '#ff6b35' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 'bold',
              cursor: (!wallet?.solanaAddress || !(wallet?.pendingRewards ?? 0)) ? 'not-allowed' : 'pointer'
            }}
          >
            {isClaiming ? 'PROCESSING...' : 'CLAIM TO SOLANA'}
          </button>
        </div>

        {claimError && <div style={{ color: '#ff6b6b', marginTop: 8, fontSize: 12 }}>{claimError}</div>}
        
        <div style={{ color: '#666', fontSize: 11, marginTop: 12, textAlign: 'right' }}>
          Last Claim: {formatDate(wallet?.lastClaimAt)}
        </div>
      </div>
    </div>
  );
};

// --- Subcomponents ---
const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ background: '#222', padding: 14, borderRadius: 8, textAlign: 'center' }}>
    <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>{label}</div>
    <div style={{ color, fontSize: 18, fontWeight: 900 }}>{value}</div>
  </div>
);

// --- Styles ---
const containerStyle: React.CSSProperties = { padding: 20, color: '#fff', background: '#0a0a0a', minHeight: '100vh', boxSizing: 'border-box' };
const centerContainerStyle: React.CSSProperties = { ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center' };
const backButtonStyle: React.CSSProperties = { padding: '10px 16px', background: '#444', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', marginBottom: 20 };
const headerStyle: React.CSSProperties = { marginBottom: 24, borderBottom: '1px solid #333', paddingBottom: 16 };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 };
const sectionStyle: React.CSSProperties = { background: '#161616', padding: 20, borderRadius: 12, border: '1px solid #333' };
