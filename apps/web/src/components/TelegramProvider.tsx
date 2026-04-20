import React, { createContext, useContext, useEffect, useMemo } from 'react';

type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  themeParams?: {
    bg_color?: string;
  };
  HapticFeedback?: {
    impactOccurred?: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred?: (type: 'success' | 'error') => void;
  };
};

interface TelegramContextType {
  webApp: TelegramWebApp | null;
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  hapticFeedback: () => {}
});

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const webApp = (window.Telegram?.WebApp as TelegramWebApp | undefined) || null;

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    try {
      if (!webApp?.HapticFeedback) return;

      switch (type) {
        case 'light':
        case 'medium':
        case 'heavy':
          webApp.HapticFeedback.impactOccurred?.(type);
          break;
        case 'success':
        case 'error':
          webApp.HapticFeedback.notificationOccurred?.(type);
          break;
      }
    } catch (error) {
      console.error('[TelegramProvider] Haptic feedback failed:', error);
    }
  };

  useEffect(() => {
    try {
      if (webApp?.ready) {
        webApp.ready();
      }

      if (webApp?.expand) {
        webApp.expand();
      }

      const bgColor = webApp?.themeParams?.bg_color || '#0a0a0a';
      document.body.style.backgroundColor = bgColor;
      document.documentElement.style.backgroundColor = bgColor;
    } catch (error) {
      console.error('[TelegramProvider] Telegram init failed:', error);
      document.body.style.backgroundColor = '#0a0a0a';
      document.documentElement.style.backgroundColor = '#0a0a0a';
    }
  }, [webApp]);

  const value = useMemo(
    () => ({
      webApp,
      hapticFeedback
    }),
    [webApp]
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
};
