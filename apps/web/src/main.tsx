import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { GameNoticeProvider } from './components/GameNoticeProvider';
import { TelegramProvider } from './components/TelegramProvider';
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

// --- Refined Telegram Types ---
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          query_id: string;
          user: { id: number; first_name: string; username?: string };
          auth_date: number;
          hash: string;
        };
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        MainButton: { text: string; color: string; show: () => void; hide: () => void; onClick: (cb: () => void) => void };
        BackButton: { show: () => void; hide: () => void; onClick: (cb: () => void) => void };
        HapticFeedback: { impactOccurred: (style: string) => void; notificationOccurred: (type: string) => void };
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
      };
    };
  }
}

// --- Initialization ---
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

// Initialize Telegram SDK immediately to ensure availability
if (window.Telegram?.WebApp) {
  try {
    // We signal ready immediately, but expansion is better handled in TelegramProvider
    // to ensure the app is hydrated.
    window.Telegram.WebApp.ready();
  } catch (error) {
    console.error('[main] Telegram WebApp init failed:', error);
  }
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TelegramProvider>
        <SolanaWalletProvider>
          <GameNoticeProvider>
            <App />
          </GameNoticeProvider>
        </SolanaWalletProvider>
      </TelegramProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
