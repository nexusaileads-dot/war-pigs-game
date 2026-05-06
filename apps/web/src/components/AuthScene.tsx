import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export const AuthScene: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { login, register, isLoading } = useGameStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'login') {
      const res = await login(email, password);
      if (!res.success) setError(res.error || 'Login failed');
    } else {
      if (!username) {
        setError('Username is required');
        return;
      }
      const res = await register(email, password, username);
      if (!res.success) setError(res.error || 'Registration failed');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: 'center', marginTop: 0, color: '#ff6b35' }}>
          {mode === 'login' ? 'LOGIN' : 'REGISTER'}
        </h2>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
                placeholder="pig_destroyer_99"
              />
            </div>
          )}

          <div style={inputGroupStyle}>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{ color: '#ff4d4f', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={isLoading} style={buttonStyle(isLoading)}>
            {isLoading ? 'PROCESSING...' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#888' }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setMode('register'); setError(null); }} style={linkStyle}>
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(null); }} style={linkStyle}>
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100vh',
  background: '#0a0a0a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontFamily: 'sans-serif'
};

const cardStyle: React.CSSProperties = {
  background: '#141414',
  border: '2px solid #333',
  borderRadius: '16px',
  padding: '40px',
  width: '100%',
  maxWidth: '400px',
  boxSizing: 'border-box'
};

const inputGroupStyle: React.CSSProperties = {
  marginBottom: '16px'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '12px',
  color: '#888'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: '#0a0a0a',
  border: '1px solid #333',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const buttonStyle = (loading: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '14px',
  background: '#ff6b35',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontWeight: 800,
  fontSize: '14px',
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.6 : 1
});

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ff6b35',
  cursor: 'pointer',
  textDecoration: 'underline',
  font: 'inherit'
};
