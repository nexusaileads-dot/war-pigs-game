/**
 * Returns the Telegram Mini App URL for WebApp buttons.
 * 
 * @returns A valid HTTPS URL to the War Pigs web application.
 * @throws Error if the configured URL is invalid (non-HTTPS or malformed).
 * 
 * Environment variable:
 * - TELEGRAM_MINI_APP_URL: The base URL for the War Pigs Mini App (e.g., https://war-pigs-game.vercel.app)
 */
export const getWebAppUrl = (): string => {
  const rawUrl = process.env.TELEGRAM_MINI_APP_URL;
  
  // Fallback to production URL if not configured
  const url = rawUrl || 'https://war-pigs-game.vercel.app';
  
  // Validate URL format
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      console.error('[webApp] TELEGRAM_MINI_APP_URL must use HTTPS');
      // Fallback to known good URL in production
      if (process.env.NODE_ENV === 'production') {
        return 'https://war-pigs-game.vercel.app';
      }
      // Allow HTTP in development for local testing
      if (parsed.protocol === 'http:' && process.env.NODE_ENV === 'development') {
        return url.replace(/\/+$/, ''); // Remove trailing slashes
      }
      throw new Error('Invalid protocol');
    }
    // Normalize: remove trailing slashes for consistent path appending
    return url.replace(/\/+$/, '');
  } catch (error) {
    console.error('[webApp] Invalid TELEGRAM_MINI_APP_URL:', url, error);
    // Safe fallback for production
    return 'https://war-pigs-game.vercel.app';
  }
};
