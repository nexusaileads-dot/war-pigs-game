import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initData?: string;
        initDataUnsafe?: unknown;
        colorScheme?: string;
        themeParams?: unknown;
        MainButton?: unknown;
        BackButton?: unknown;
        HapticFeedback?: unknown;
      };
    };
  }
}

try {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }
} catch (error) {
  console.error('[main] Telegram WebApp init failed:', error);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
