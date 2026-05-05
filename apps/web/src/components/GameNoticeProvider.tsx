import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

type NoticeVariant = 'success' | 'error' | 'info' | 'warning';

export type NoticePayload = {
  title: string;
  message: string;
  variant?: NoticeVariant;
  buttonText?: string;
  autoCloseMs?: number;
};

type GameNoticeContextValue = {
  showNotice: (payload: NoticePayload) => void;
  hideNotice: () => void;
};

const GameNoticeContext = createContext<GameNoticeContextValue | undefined>(undefined);

export const GameNoticeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notice, setNotice] = useState<NoticePayload | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const clearTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const hideNotice = useCallback(() => {
    clearTimer();
    setNotice(null);
  }, []);

  const showNotice = useCallback((payload: NoticePayload) => {
    clearTimer();
    setNotice(payload);

    if (payload.autoCloseMs && payload.autoCloseMs > 0) {
      timeoutRef.current = window.setTimeout(() => {
        setNotice(null);
        timeoutRef.current = null;
      }, payload.autoCloseMs);
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimer();
  }, []);

  // Lock body scroll when notice is visible
  useEffect(() => {
    const body = document.body;
    if (notice) {
      const originalOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
      return () => {
        body.style.overflow = originalOverflow;
      };
    }
  }, [notice]);

  const value = useMemo(
    () => ({
      showNotice,
      hideNotice
    }),
    [showNotice, hideNotice]
  );

  const theme = getTheme(notice?.variant || 'info');

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      hideNotice();
    }
  };

  return (
    <GameNoticeContext.Provider value={value}>
      {children}

      {notice ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notice-title"
          aria-describedby="notice-message"
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)' // Add slight blur for better focus
          }}
        >
          <div
            ref={modalRef}
            style={{
              width: '100%',
              maxWidth: '420px',
              borderRadius: '22px',
              overflow: 'hidden',
              background:
                'linear-gradient(180deg, rgba(22,22,22,0.98) 0%, rgba(10,10,10,0.98) 100%)',
              border: `2px solid ${theme.border}`,
              boxShadow: `0 18px 48px ${theme.glow}`,
              animation: 'warPigsNoticeIn 180ms ease-out'
            }}
          >
            {/* Accent bar */}
            <div
              style={{
                height: '6px',
                background: `linear-gradient(90deg, ${theme.border} 0%, ${theme.accent} 100%)`
              }}
            />

            <div style={{ padding: '20px 20px 18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '14px'
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: theme.iconBg,
                    border: `1px solid ${theme.border}`,
                    color: theme.accent,
                    fontSize: '24px',
                    fontWeight: 900,
                    flexShrink: 0
                  }}
                >
                  {theme.icon}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: '#888',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}
                  >
                    War Pigs Notice
                  </div>

                  <div
                    id="notice-title"
                    style={{
                      color: '#fff',
                      fontSize: '24px',
                      fontWeight: 900,
                      lineHeight: 1.08
                    }}
                  >
                    {notice.title}
                  </div>
                </div>
              </div>

              <div
                id="notice-message"
                style={{
                  color: '#d4d4d4',
                  fontSize: '15px',
                  lineHeight: 1.45,
                  marginBottom: '18px'
                }}
              >
                {notice.message}
              </div>

              <button
                type="button"
                onClick={hideNotice}
                autoFocus
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  background: `linear-gradient(180deg, ${theme.buttonTop} 0%, ${theme.buttonBottom} 100%)`,
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 900,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: `0 10px 24px ${theme.glow}`,
                  transition: 'transform 0.1s'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {notice.buttonText || 'OK'}
              </button>
            </div>
          </div>

          <style>
            {`
              @keyframes warPigsNoticeIn {
                0% {
                  opacity: 0;
                  transform: translateY(18px) scale(0.96);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}
          </style>
        </div>
      ) : null}
    </GameNoticeContext.Provider>
  );
};

export const useGameNotice = () => {
  const context = useContext(GameNoticeContext);

  if (!context) {
    throw new Error('useGameNotice must be used inside GameNoticeProvider');
  }

  return context;
};

const getTheme = (variant: NoticeVariant) => {
  switch (variant) {
    case 'success':
      return {
        border: '#ff6b35',
        accent: '#ffd166',
        glow: 'rgba(255, 107, 53, 0.24)',
        buttonTop: '#ff7a42',
        buttonBottom: '#e85b27',
        iconBg: 'rgba(255, 107, 53, 0.14)',
        icon: '✓'
      };

    case 'error':
      return {
        border: '#ff4d4f',
        accent: '#ff9f43',
        glow: 'rgba(255, 77, 79, 0.22)',
        buttonTop: '#ff6264',
        buttonBottom: '#d93b3d',
        iconBg: 'rgba(255, 77, 79, 0.14)',
        icon: '!'
      };

    case 'warning':
      return {
        border: '#ffd54f',
        accent: '#ffb300',
        glow: 'rgba(255, 213, 79, 0.2)',
        buttonTop: '#f7bf36',
        buttonBottom: '#d7a117',
        iconBg: 'rgba(255, 213, 79, 0.14)',
        icon: '!'
      };

    default:
      return {
        border: '#5b8cff',
        accent: '#8fcfff',
        glow: 'rgba(91, 140, 255, 0.22)',
        buttonTop: '#5b8cff',
        buttonBottom: '#3f6fe0',
        iconBg: 'rgba(91, 140, 255, 0.14)',
        icon: 'i'
      };
  }
};
