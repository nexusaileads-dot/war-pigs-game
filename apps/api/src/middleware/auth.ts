import { FastifyReply, FastifyRequest } from 'fastify';
// Import error types from jsonwebtoken, not @fastify/jwt
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      telegramId?: string; // Optional to support non-Telegram auth flows
    };
    user: {
      userId: string;
      telegramId?: string;
    };
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    // Explicit assignment for clarity and type narrowing
    request.user = request.user;
  } catch (err) {
    // Log auth failures with sanitized context
    request.log.warn(
      {
        url: request.url,
        method: request.method,
        ip: request.ip,
        error: err instanceof Error ? err.name : 'UnknownError'
      },
      'Authentication failed'
    );

    // Use jsonwebtoken error types for differentiation
    if (err instanceof TokenExpiredError) {
      return reply.status(401).send({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err instanceof JsonWebTokenError) {
      return reply.status(401).send({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }
    return reply.status(401).send({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
}
