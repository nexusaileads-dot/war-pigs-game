import React, { createContext, useContext, useEffect } from 'react';

interface TelegramContextType {
  webApp: typeof window.Telegram.WebApp | null;
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  hapticFeedback: () => {}
});

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const webApp = window.Telegram?.WebApp || null;

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    if (webApp?.HapticFeedback) {
      switch (type) {
        case 'light':
        case 'medium':
        case 'heavy':
          webApp.HapticFeedback.impactOccurred(type);
          break;
        case 'success':
        case 'error':
          webApp.HapticFeedback.notificationOccurred(type);
          break;
      }
    }
  };

  useEffect(() => {
    if (webApp) {
      webApp.ready();
      if (webApp.themeParams) {
        document.body.style.backgroundColor = webApp.themeParams.bg_color || '#0a0a0a';
      }
    }
  }, [webApp]);

  return (
    <TelegramContext.Provider value={{ webApp, hapticFeedback }}>
      {children}
    </TelegramContext.Provider>
  );
};
