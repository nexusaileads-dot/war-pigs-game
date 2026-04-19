import crypto from 'crypto';

interface GameSession {
  runId: string;
  userId: string;
  levelId: string;
  characterId: string;
  weaponId: string;
  maxEnemies: number;
  difficulty: number;
  createdAt: number;
  expiresAt: number;
}

export class GameSessionService {
  private sessions = new Map<string, GameSession>();
  private readonly SESSION_TTL = 60 * 60 * 1000; // 1 hour in ms

  constructor() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000).unref?.();
  }

  async createSession(runId: string, data: Omit<GameSession, 'runId' | 'createdAt' | 'expiresAt'>): Promise<string> {
    const now = Date.now();

    const token = crypto.randomBytes(32).toString('hex');

    const session: GameSession = {
      runId,
      ...data,
      createdAt: now,
      expiresAt: now + this.SESSION_TTL
    };

    this.sessions.set(token, session);

    return token;
  }

  async getSession(token: string): Promise<GameSession | null> {
    const session = this.sessions.get(token);

    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  async endSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();

    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }
}
