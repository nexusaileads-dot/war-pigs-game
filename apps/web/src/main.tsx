import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { GameNoticeProvider } from './components/GameNoticeProvider';
import { SolanaWalletProvider } from './providers/SolanaWalletProvider';

// --- Global Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#000', height: '100vh' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Initialization ---
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* Wallet Provider surrounds the app to handle Web3 auth */}
      <SolanaWalletProvider>
        <GameNoticeProvider>
          <App />
        </GameNoticeProvider>
      </SolanaWalletProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
