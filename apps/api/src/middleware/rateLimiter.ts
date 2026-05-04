import { FastifyRequest, FastifyReply } from 'fastify';
import { RateLimitOptions } from '@fastify/rate-limit';

/**
 * Route-specific rate limit configuration shape.
 * Note: In-memory storage (default) does not share state across instances.
 * For production multi-instance deployments, configure Redis storage in server.ts.
 */
export interface RouteRateLimitConfig {
  max: number;
  timeWindow: string | number;
  allowList?: string[]; // Optional IP/user allowlist
}

/**
 * Factory function to generate a route-specific rate limit preHandler.
 * Usage: preHandler: createRouteRateLimiter({ max: 5, timeWindow: '15 minutes' })
 */
export const createRouteRateLimiter = (config: RouteRateLimitConfig) => {
  // Warning for multi-instance environments (dev-only)
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL && (process.env.INSTANCE_COUNT || 1) > 1) {
    console.warn('⚠️ Route rate limiter using in-memory storage in multi-instance deployment. Consider enabling Redis.');
  }

  // Return a preHandler hook that delegates to Fastify's rate-limit context
  // Note: Actual enforcement requires @fastify/rate-limit to be registered globally with { enableDraftSpec: true }
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // This hook is a placeholder for config attachment.
    // Real enforcement is handled by the plugin when config is passed via route options.
    // See: https://github.com/fastify/fastify-rate-limit#per-route-configuration
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
export const strictRateLimit = { config: { rateLimit: strictRateLimitConfig } };
export const authRateLimit = { config: { rateLimit: authRateLimitConfig } };
