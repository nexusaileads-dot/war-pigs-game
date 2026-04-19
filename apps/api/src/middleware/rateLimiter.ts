import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Global rate limiting is implemented in server.ts via @fastify/rate-limit.
 * This file provides route-specific configuration overrides and a compatible 
 * preHandler passthrough to maintain module resolution and structural integrity 
 * following the removal of the external Redis dependency.
 */

export const rateLimiter = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  return;
};

export const strictRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute'
    }
  }
};

export const authRateLimit = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes'
    }
  }
};
