import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Redis from 'ioredis';

import { prisma } from '@war-pigs/database';
import { authRoutes } from './routes/auth';
import { gameRoutes } from './routes/game';
import { shopRoutes } from './routes/shop';
import { inventoryRoutes } from './routes/inventory';
import { adminRoutes } from './routes/admin';

const server = Fastify({
  logger: true,
  trustProxy: true
});

// 🚨 EMERGENCY REDIS BYPASS: Only connect if Railway provides a URL, otherwise use RAM.
let redisClient: any = undefined;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: () => null // Stop retrying immediately if it fails
  });
  redisClient.on('error', () => {
    server.log.warn('Redis unavailable. Falling back to local memory cache.');
  });
}

async function start() {
  try {
    // Plugins
    await server.register(cors, {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true
    });

    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
    });

    // Rate Limiting (Automatically uses RAM because redisClient is undefined)
    await server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      redis: redisClient
    });

    // Health check
    server.get('/health', async () => ({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    }));

    // Routes
    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(gameRoutes, { prefix: '/api/game' });
    await server.register(shopRoutes, { prefix: '/api/shop' });
    await server.register(inventoryRoutes, { prefix: '/api/inventory' });
    await server.register(adminRoutes, { prefix: '/api/admin' });

    // Error handler
    server.setErrorHandler((error, request, reply) => {
      server.log.error(error);
      reply.status(500).send({ error: 'Internal server error', message: error.message });
    });

    // RAILWAY REQUIRED PORT BINDING
    const port = Number(process.env.PORT) || 8080;
    const host = '0.0.0.0';

    await server.listen({ port, host });
    console.log(`✅ API server successfully listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();