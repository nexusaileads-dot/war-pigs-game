import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const API_URL = RAW_API_URL.replace(/\/+$/, '');

// Allowed origins for request validation (prevent SSRF-like misuse)
const ALLOWED_ORIGINS = [API_URL, ...(import.meta.env.VITE_ALLOWED_API_ORIGINS?.split(',') || [])];

const isValidJwtFormat = (token: string): boolean => {
  // Basic JWT structure check: header.payload.signature
  return typeof token === 'string' && token.split('.').length === 3 && token.length > 20;
};

const sanitizeErrorForLogging = (error: AxiosError) => {
  try {
    return {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      // Only log non-sensitive error metadata
      message: error.message,
      code: (error as any).code
    };
  } catch {
    return { message: 'Error serialization failed' };
  }
};

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Optional: simple retry wrapper for idempotent GET requests
const withRetry = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = 2,
  isIdempotent = false
): Promise<T> => {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (err) {
      lastError = err as Error;
      if (!isIdempotent || attempt === maxRetries) break;
      // Exponential backoff: 100ms, 200ms
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
};

apiClient.interceptors.request.use((config) => {
  // Validate request origin to prevent token exfiltration
  const requestUrl = config.url || '';
  if (requestUrl.startsWith('http') && !ALLOWED_ORIGINS.some(origin => requestUrl.startsWith(origin))) {
    console.warn('[apiClient] Blocked request to unauthorized origin:', requestUrl);
    return Promise.reject(new Error('Unauthorized API origin'));
  }

  const rawToken = localStorage.getItem('token');
  
  config.headers = config.headers ?? {};

  // Only inject token if it passes basic format validation
  if (rawToken && isValidJwtFormat(rawToken)) {
    config.headers.Authorization = `Bearer ${rawToken}`;
  } else if (rawToken) {
    // Remove malformed token to prevent repeated failures
    console.warn('[apiClient] Removing malformed token from storage');
    localStorage.removeItem('token');
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const isIdempotent = error.config?.method?.toLowerCase() === 'get';

    if (status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('hasActiveRun'); // Fixed key mismatch
      // Optional: trigger global auth reset event here
    }

    if (import.meta.env.DEV) {
      const safeLog = sanitizeErrorForLogging(error);
      console.error('[apiClient] Request failed:', safeLog);
    }

    // Optional: auto-retry idempotent GET requests on transient errors
    if (isIdempotent && status && status >= 500) {
      try {
        return await withRetry(() => axios.request(error.config!), 1, true);
      } catch (retryError) {
        // Fall through to original error handling
      }
    }

    return Promise.reject(error);
  }
);
