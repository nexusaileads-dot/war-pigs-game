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

// Configure Redis with fallback to prevent startup crash
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error', (err) => {
  server.log.warn('Redis connection failed. Rate limiting may be affected.');
  server.log.error(err);
});

async function start() {
  try {
    // Plugins
    await server.register(cors, {
      origin: process.env.FRONTEND_URL || '*', // Allow all in emergency, restrict later
      credentials: true
    });

    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
    });

    // Rate Limiting (Uses Redis if available, falls back to memory)
    await server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      redis: redis.status === 'ready' ? redis : undefined
    });

    // Health check for Railway
    server.get('/health', async () => ({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'war-pigs-api' 
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
      reply.status(500).send({ 
        error: 'Internal server error', 
        message: error.message 
      });
    });

    // RAILWAY CONFIGURATION: Use process.env.PORT
    const port = Number(process.env.PORT) || 8080;
    const host = '0.0.0.0';

    await server.listen({ port, host });
    console.log(`✅ API server successfully listening on ${host}:${port}`);
  } catch (err) {
    server.log.error('❌ Server failed to start:');
    server.log.error(err);
    process.exit(1);
  }
}

start();