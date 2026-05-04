import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

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
    // Validate critical environment variables
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    if (isProd && !process.env.FRONTEND_URL) {
      server.log.warn('FRONTEND_URL not set; CORS will deny all origins');
    }

    await server.register(cors, {
      origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : (isProd ? false : true),
      credentials: true
    });

    const jwtSecret = process.env.JWT_SECRET;
    await server.register(jwt, {
      secret: jwtSecret || 'dev-secret-key-change-in-production' // Only used in non-prod after validation
    });

    await server.register(rateLimit, {
      global: true,
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
      request.log.error(error);

      if (reply.sent) {
        return;
      }

      const statusCode =
        typeof (error as { statusCode?: unknown }).statusCode === 'number'
          ? ((error as { statusCode: number }).statusCode)
          : 500;

      // Sanitize error messages for client exposure
      const isClientError = statusCode >= 400 && statusCode < 500;
      reply.status(statusCode).send({
        error: statusCode >= 500 ? 'Internal server error' : error.name || 'Request error',
        message: isClientError ? error.message : 'An unexpected error occurred'
      });
    });

    const port = Number(process.env.PORT) || 8080;
    const host = process.env.HOST || '0.0.0.0';

    // Graceful shutdown handlers
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        server.log.info(`Received ${signal}, shutting down gracefully`);
        await server.close();
        process.exit(0);
      });
    });

    await server.listen({ port, host });
    server.log.info(`API server listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
