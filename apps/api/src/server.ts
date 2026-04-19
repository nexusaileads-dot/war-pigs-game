import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

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

async function start() {
  try {
    await server.register(cors, {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true
    });

    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
    });

    await server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });

    server.get('/health', async () => ({
      status: 'ok',
      timestamp: new Date().toISOString()
    }));

    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(gameRoutes, { prefix: '/api/game' });
    await server.register(shopRoutes, { prefix: '/api/shop' });
    await server.register(inventoryRoutes, { prefix: '/api/inventory' });
    await server.register(adminRoutes, { prefix: '/api/admin' });

    server.setErrorHandler((error, request, reply) => {
      server.log.error(error);
      reply.status(500).send({
        error: 'Internal server error',
        message: error.message
      });
    });

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
