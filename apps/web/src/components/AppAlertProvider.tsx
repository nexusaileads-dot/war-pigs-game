import React, { useEffect, useMemo, useState } from 'react';

type AlertType = 'success' | 'error' | 'info' | 'warning';

type AlertItem = {
  id: number;
  title: string;
  message?: string;
  type: AlertType;
};

type AlertEventDetail = {
  title?: string;
  message?: string;
  type?: AlertType;
};

const getAlertType = (text: string): AlertType => {
  const lower = text.toLowerCase();

  if (
    lower.includes('successful') ||
    lower.includes('upgraded') ||
    lower.includes('equipped') ||
    lower.includes('complete')
  ) {
    return 'success';
  }

  if (
    lower.includes('failed') ||
    lower.includes('error') ||
    lower.includes('invalid') ||
    lower.includes('missing') ||
    lower.includes('not enough') ||
    lower.includes('insufficient')
  ) {
    return 'error';
  }

  if (lower.includes('locked') || lower.includes('not ready') || lower.includes('coming soon')) {
    return 'warning';
  }

  return 'info';
};

const normalizeAlert = (input: unknown): AlertItem => {
  const text = String(input ?? '').trim() || 'Notice';
  const type = getAlertType(text);

  return {
    id: Date.now(),
    title: text,
    type
  };
};

const getTheme = (type: AlertType) => {
  switch (type) {
    case 'success':
      return {
        accent: '#39d353',
        glow: 'rgba(57, 211, 83, 0.28)',
        icon: '✓',
        title: 'SUCCESS'
      };

    case 'error':
      return {
        accent: '#ff4d4f',
        glow: 'rgba(255, 77, 79, 0.28)',
        icon: '!',
        title: 'ERROR'
      };

    case 'warning':
      return {
        accent: '#ffd700',
        glow: 'rgba(255, 215, 0, 0.25)',
        icon: '!',
        title: 'NOTICE'
      };

    default:
      return {
        accent: '#7c4dff',
        glow: 'rgba(124, 77, 255, 0.26)',
        icon: 'i',
        title: 'INFO'
      };
  }
};

export const showGameAlert = (title: string, type?: AlertType, message?: string) => {
  window.dispatchEvent(
    new CustomEvent<AlertEventDetail>('WAR_PIGS_ALERT', {
      detail: {
        title,
        type,
        message
      }
    })
  );
};

export const AppAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertItem, setAlertItem] = useState<AlertItem | null>(null);

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message?: unknown) => {
      setAlertItem(normalizeAlert(message));
    };

    const handleCustomAlert = (event: Event) => {
      const customEvent = event as CustomEvent<AlertEventDetail>;
      const detail = customEvent.detail;

      const title = String(detail?.title || '').trim() || 'Notice';
      const message = detail?.message ? String(detail.message) : undefined;

      setAlertItem({
        id: Date.now(),
        title,
        message,
        type: detail?.type || getAlertType(`${title} ${message || ''}`)
      });
    };

    window.addEventListener('WAR_PIGS_ALERT', handleCustomAlert);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener('WAR_PIGS_ALERT', handleCustomAlert);
    };
  }, []);

  const theme = useMemo(() => getTheme(alertItem?.type || 'info'), [alertItem]);

  return (
    <>
      {children}

      {alertItem ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '22px',
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setAlertItem(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '360px',
              borderRadius: '22px',
              border: `2px solid ${theme.accent}`,
              background:
                'linear-gradient(180deg, rgba(30,30,30,0.98) 0%, rgba(10,10,10,0.98) 100%)',
              color: '#fff',
              boxShadow: `0 0 28px ${theme.glow}, 0 18px 40px rgba(0,0,0,0.55)`,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '18px 18px 14px',
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: theme.accent,
                  color: '#111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 1000,
                  fontSize: '24px',
                  boxShadow: `0 0 18px ${theme.glow}`,
                  flexShrink: 0
                }}
              >
                {theme.icon}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: theme.accent,
                    fontSize: '12px',
                    fontWeight: 1000,
                    letterSpacing: '0.12em'
                  }}
                >
                  {theme.title}
                </div>

                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '20px',
                    fontWeight: 900,
                    lineHeight: 1.15,
                    wordBreak: 'break-word'
                  }}
                >
                  {alertItem.title}
                </div>
              </div>
            </div>

            {alertItem.message ? (
              <div
                style={{
                  padding: '14px 18px 0',
                  color: '#cfcfcf',
                  fontSize: '14px',
                  lineHeight: 1.45
                }}
              >
                {alertItem.message}
              </div>
            ) : null}

            <div
              style={{
                padding: '18px',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                onClick={() => setAlertItem(null)}
                style={{
                  minWidth: '112px',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: theme.accent,
                  color: '#111',
                  fontWeight: 1000,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
