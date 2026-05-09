import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Define the shape of the Telegram WebApp object we care about
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
  };
  initData?: string;
  isVersionAtLeast: (version: string) => boolean;
}

interface TelegramContextType {
  webApp: TelegramWebApp | null;
  isTelegramWebApp: boolean;
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  isTelegramWebApp: false,
  hapticFeedback: () => {}
});

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  // Initialize WebApp reference
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        // Initialize
        tg.ready();
        tg.expand();
        
        // Apply theme colors to CSS variables for consistent usage
        if (tg.themeParams) {
          const root = document.documentElement;
          if (tg.themeParams.bg_color) root.style.setProperty('--tg-bg', tg.themeParams.bg_color);
          if (tg.themeParams.text_color) root.style.setProperty('--tg-text', tg.themeParams.text_color);
        }
        
        setWebApp(tg as TelegramWebApp);
      } catch (error) {
        console.error('[TelegramProvider] Init failed', error);
        // Fallback: set webApp to null to indicate failure
        setWebApp(null);
      }
    }
  }, []);

  // Helper for haptic feedback
  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    if (!webApp?.HapticFeedback) return;

    try {
      if (['light', 'medium', 'heavy'].includes(type)) {
        webApp.HapticFeedback.impactOccurred(type as any);
      } else if (['success', 'error'].includes(type)) {
        webApp.HapticFeedback.notificationOccurred(type as any);
      }
    } catch (e) {
      console.warn('[TelegramProvider] Haptic feedback failed', e);
    }
  };

  const value = useMemo(
    () => ({
      webApp,
      isTelegramWebApp: !!webApp?.initData, // Strict check: valid initData implies we are in a valid TG session
      hapticFeedback
    }),
    [webApp]
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
};
