import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { Server } from 'socket.io'; // ADDED: Socket.IO

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
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }

    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : (isProd ? false : true);

    await server.register(cors, {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization']
    });

    const jwtSecret = process.env.JWT_SECRET;
    await server.register(jwt, {
      secret: jwtSecret || 'dev-secret-key-change-in-production' 
    });

    await server.register(rateLimit, {
      global: true,
      max: 100,
      timeWindow: '1 minute'
    });

    server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(gameRoutes, { prefix: '/api/game' });
    await server.register(shopRoutes, { prefix: '/api/shop' });
    await server.register(inventoryRoutes, { prefix: '/api/inventory' });
    await server.register(adminRoutes, { prefix: '/api/admin' });

    server.setErrorHandler((error, request, reply) => {
      request.log.error(error);
      if (reply.sent) return;

      const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
          ? ((error as { statusCode: number }).statusCode) : 500;

      const isClientError = statusCode >= 400 && statusCode < 500;
      reply.status(statusCode).send({
        error: statusCode >= 500 ? 'Internal server error' : error.name || 'Request error',
        message: isClientError ? error.message : 'An unexpected error occurred'
      });
    });

    const port = Number(process.env.PORT) || 8080;
    const host = process.env.HOST || '0.0.0.0';

    // Must call ready() before attaching socket.io to the raw server
    await server.ready();

    // --- WEBSOCKET PVP SETUP ---
    const io = new Server(server.server, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Matchmaking State
    let waitingPlayer: any = null;

    io.on('connection', (socket) => {
      server.log.info(`[PvP] Player connected: ${socket.id}`);

      // 1. Join Matchmaking Queue
      socket.on('join_queue', (playerData) => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
          // We have two players! Create a unique room.
          const roomId = `room_${waitingPlayer.id}_${socket.id}`;
          
          socket.join(roomId);
          waitingPlayer.join(roomId);

          // Notify both players that the match is starting
          io.to(roomId).emit('match_found', {
            roomId,
            players: [
              { socketId: socket.id, ...playerData },
              { socketId: waitingPlayer.id, ...waitingPlayer.playerData }
            ]
          });

          server.log.info(`[PvP] Match created: ${roomId}`);
          waitingPlayer = null; // Reset queue
        } else {
          // Nobody is waiting, put this player in the queue
          waitingPlayer = socket;
          waitingPlayer.playerData = playerData;
          socket.emit('waiting_for_match', { message: 'Looking for opponent...' });
        }
      });

      // 2. Real-time Movement & Action Sync
      socket.on('player_action', (data) => {
        // data contains { roomId, x, y, facing, animation, ... }
        // Send this data to everyone in the room EXCEPT the sender
        socket.to(data.roomId).emit('opponent_action', data);
      });

      // 3. Real-time Shooting
      socket.on('player_shoot', (data) => {
        socket.to(data.roomId).emit('opponent_shoot', data);
      });

      // 4. Handle Disconnects
      socket.on('disconnect', () => {
        server.log.info(`[PvP] Player disconnected: ${socket.id}`);
        if (waitingPlayer && waitingPlayer.id === socket.id) {
          waitingPlayer = null;
        }
        // Tell any opponent in the room that they won via disconnect
        socket.broadcast.emit('opponent_disconnected');
      });
    });

    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        server.log.info(`Received ${signal}, shutting down gracefully`);
        io.close();
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
      
