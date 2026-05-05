import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Route-specific rate limit configuration shape.
 * Note: In-memory storage (default) does not share state across instances.
 * For production multi-instance deployments, configure Redis storage in server.ts.
 */
export interface RouteRateLimitConfig {
  max: number;
  timeWindow: string | number; // Fastify accepts both string (e.g., '1 minute') and number (ms)
  allowList?: string[]; // Optional IP/user allowlist
}

/**
 * Factory function to generate a route-specific rate limit preHandler.
 * Usage: preHandler: createRouteRateLimiter({ max: 5, timeWindow: '15 minutes' })
 * 
 * Note: Actual enforcement is handled by @fastify/rate-limit plugin when config
 * is passed via route options. This function is a placeholder for future extension.
 */
export const createRouteRateLimiter = (config: RouteRateLimitConfig) => {
  // Warning for multi-instance environments (dev-only)
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    const instanceCount = Number(process.env.INSTANCE_COUNT) || 1;
    if (instanceCount > 1) {
      console.warn('⚠️ Route rate limiter using in-memory storage in multi-instance deployment. Consider enabling Redis.');
    }
  }

  // Return a no-op preHandler hook. Actual rate limiting is handled by the plugin
  // when config is attached to reply.context.config.rateLimit
  return async (_request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    return;
  };
};

/**
 * Pre-configured strict rate limit for sensitive endpoints (e.g., auth, payments).
 * Apply via route options: { config: { rateLimit: strictRateLimitConfig } }
 */
export const strictRateLimitConfig: RouteRateLimitConfig = {
  max: 10,
  timeWindow: '1 minute'
};

/**
 * Pre-configured aggressive rate limit for authentication endpoints.
 * Apply via route options: { config: { rateLimit: authRateLimitConfig } }
 */
export const authRateLimitConfig: RouteRateLimitConfig = {
  max: 5,
  timeWindow: '15 minutes'
};

// Legacy export aliases for backward compatibility during refactor
export const strictRateLimit = strictRateLimitConfig;
export const authRateLimit = authRateLimitConfig;
