import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  auth_date: number;
  hash: string;
}

export interface ValidateTelegramOptions {
  botToken: string;
  maxAgeSeconds?: number; // Default: 86400 (24 hours)
  logFailures?: boolean; // Default: false (enable in dev only)
}

/**
 * Validates Telegram Mini App initData per official spec:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * SECURITY NOTES:
 * - This function does not prevent replay attacks within the maxAgeSeconds window.
 *   For high-value operations, implement server-side nonce tracking.
 * - Always source botToken from environment variables, never from client input.
 */
export function validateTelegramData(
  initData: string,
  options: ValidateTelegramOptions
): TelegramUser | null {
  const { botToken, maxAgeSeconds = 86400, logFailures = false } = options;

  try {
    if (!initData || !botToken || botToken.trim() === '') {
      if (logFailures) console.warn('[TelegramValidate] Missing initData or botToken');
      return null;
    }

    // Basic bot token format check (Telegram tokens are numeric:alphabetic)
    if (!/^\d+:[\w\-]+$/.test(botToken)) {
      if (logFailures) console.warn('[TelegramValidate] Invalid botToken format');
      return null;
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      if (logFailures) console.warn('[TelegramValidate] Missing hash parameter');
      return null;
    }

    urlParams.delete('hash');

    const params = Array.from(urlParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = params.map(([key, value]) => `${key}=${value}`).join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const hashBuffer = Buffer.from(hash, 'hex');
    const computedHashBuffer = Buffer.from(computedHash, 'hex');

    // Length check prevents timingSafeEqual from throwing on mismatched lengths
    if (
      hashBuffer.length !== computedHashBuffer.length ||
      !crypto.timingSafeEqual(hashBuffer, computedHashBuffer)
    ) {
      if (logFailures) console.warn('[TelegramValidate] Hash mismatch - possible tampering');
      return null;
    }

    const authDate = Number(urlParams.get('auth_date') || 0);
    if (!Number.isFinite(authDate) || authDate <= 0) {
      if (logFailures) console.warn('[TelegramValidate] Invalid auth_date');
      return null;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (nowInSeconds - authDate > maxAgeSeconds) {
      if (logFailures) console.warn('[TelegramValidate] initData expired');
      return null;
    }

    const userJson = urlParams.get('user');
    if (!userJson) {
      if (logFailures) console.warn('[TelegramValidate] Missing user payload');
      return null;
    }

    const user = JSON.parse(userJson) as Omit<TelegramUser, 'auth_date' | 'hash'>;

    if (!user || typeof user.id !== 'number' || !user.first_name) {
      if (logFailures) console.warn('[TelegramValidate] Invalid user object structure');
      return null;
    }

    return {
      ...user,
      auth_date: authDate,
      hash
    };
  } catch (err) {
    if (logFailures) {
      console.error('[TelegramValidate] Unexpected validation error', {
        error: err instanceof Error ? err.name : 'UnknownError',
        message: err instanceof Error ? err.message : 'No message'
      });
    }
    return null;
  }
}
