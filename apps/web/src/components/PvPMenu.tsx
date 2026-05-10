import React, { useEffect, useState } from 'react';
import { socket, connectSocket, disconnectSocket } from '../api/socket';
import { useGameStore } from '../store/gameStore';

interface PvPMenuProps {
  onBack: () => void;
  onMatchFound: (roomData: any) => void;
}

export const PvPMenu: React.FC<PvPMenuProps> = ({ onBack, onMatchFound }) => {
  const { user } = useGameStore();
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'MATCH_FOUND'>('IDLE');
  const [statusMessage, setStatusMessage] = useState('Ready for combat.');

  useEffect(() => {
    // Listeners for Socket.IO
    socket.on('connect', () => {
      console.log('[PvP] Connected to Matchmaking Server');
    });

    socket.on('waiting_for_match', (data) => {
      setStatus('SEARCHING');
      setStatusMessage(data.message);
    });

    socket.on('match_found', (roomData) => {
      setStatus('MATCH_FOUND');
      setStatusMessage('MATCH FOUND! PREPARING ARENA...');
      
      // Give the players 2 seconds to see the "MATCH FOUND" screen before transitioning
      setTimeout(() => {
        onMatchFound(roomData);
      }, 2000);
    });

    socket.on('disconnect', () => {
      setStatus('IDLE');
      setStatusMessage('Disconnected from server.');
    });

    return () => {
      socket.off('connect');
      socket.off('waiting_for_match');
      socket.off('match_found');
      socket.off('disconnect');
      // If player backs out while searching, disconnect
      disconnectSocket();
    };
  }, [onMatchFound]);

  const handleFindMatch = () => {
    setStatus('SEARCHING');
    setStatusMessage('Connecting to server...');
    connectSocket();

    // Tell the server who we are and what loadout we are bringing
    socket.emit('join_queue', {
      userId: user?.id,
      username: user?.username || user?.firstName || 'Player',
      characterId: user?.profile?.equippedCharacterId || 'grunt_bacon',
      weaponId: user?.profile?.equippedWeaponId || 'oink_pistol'
    });
  };

  const handleCancel = () => {
    disconnectSocket();
    setStatus('IDLE');
    setStatusMessage('Matchmaking canceled.');
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      
      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <button onClick={onBack} disabled={status === 'MATCH_FOUND'} style={btnStyle}>BACK</button>
      </div>

      <div style={{ background: '#141414', border: '2px solid #333', borderRadius: 16, padding: 40, width: '100%', maxWidth: 500, textAlign: 'center' }}>
        <h2 style={{ color: '#ff6b35', margin: '0 0 10px 0', fontSize: 32, textTransform: 'uppercase' }}>PvP Arena</h2>
        <p style={{ color: '#aaa', marginBottom: 30 }}>Face off against other players in real-time 1v1 combat.</p>

        <div style={{ background: '#000', border: '1px solid #222', padding: 20, borderRadius: 8, marginBottom: 30, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: status === 'MATCH_FOUND' ? '#4caf50' : status === 'SEARCHING' ? '#ffb300' : '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: '1px' }}>
            {statusMessage}
          </span>
        </div>

        {status === 'IDLE' && (
          <button onClick={handleFindMatch} style={{ ...actionBtnStyle, background: '#ff6b35' }}>
            FIND MATCH
          </button>
        )}

        {status === 'SEARCHING' && (
          <button onClick={handleCancel} style={{ ...actionBtnStyle, background: '#d92a17' }}>
            CANCEL SEARCH
          </button>
        )}
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = { padding: '10px 20px', background: '#333', border: '2px solid #555', color: '#fff', cursor: 'pointer', borderRadius: 8, fontWeight: 'bold' };
const actionBtnStyle: React.CSSProperties = { padding: '16px', border: 'none', color: '#fff', fontWeight: 900, fontSize: 18, width: '100%', borderRadius: 10, cursor: 'pointer', letterSpacing: '1px' };
