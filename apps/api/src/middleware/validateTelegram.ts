import crypto from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Validates Telegram Mini App initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramData(initData: string, botToken: string): TelegramUser | null {
  try {
    if (!initData || !botToken) {
      return null;
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
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

    if (
      hashBuffer.length !== computedHashBuffer.length ||
      !crypto.timingSafeEqual(hashBuffer, computedHashBuffer)
    ) {
      return null;
    }

    const authDate = Number(urlParams.get('auth_date') || 0);
    if (!Number.isFinite(authDate) || authDate <= 0) {
      return null;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (nowInSeconds - authDate > 86400) {
      return null;
    }

    const userJson = urlParams.get('user');
    if (!userJson) {
      return null;
    }

    const user = JSON.parse(userJson) as Omit<TelegramUser, 'auth_date' | 'hash'>;

    if (!user || typeof user.id !== 'number' || !user.first_name) {
      return null;
    }

    return {
      ...user,
      auth_date: authDate,
      hash
    };
  } catch {
    return null;
  }
  }
