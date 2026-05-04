import crypto from 'crypto';

export interface GameSession {
  runId: string;
  userId: string;
  levelId: string;
  characterId: string;
  weaponId: string;
  maxEnemies: number;
  difficulty: number;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number; // Added for idle timeout tracking
}

export interface GameSessionServiceOptions {
  ttlMs?: number;           // Default: 1 hour
  idleTimeoutMs?: number;   // Default: 15 minutes; set to 0 to disable
  maxSessions?: number;     // Optional cap for memory safety
  validateRunStatus?: (runId: string) => Promise<boolean>; // Optional DB validation hook
  logEnabled?: boolean;     // Default: false; enable in dev only
}

export class GameSessionService {
  private sessions = new Map<string, GameSession>();
  private readonly ttlMs: number;
  private readonly idleTimeoutMs: number;
  private readonly maxSessions?: number;
  private readonly validateRunStatus?: (runId: string) => Promise<boolean>;
  private readonly logEnabled: boolean;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: GameSessionServiceOptions = {}) {
    this.ttlMs = options.ttlMs ?? 60 * 60 * 1000; // 1 hour default
    this.idleTimeoutMs = options.idleTimeoutMs ?? 15 * 60 * 1000; // 15 min idle default
    this.maxSessions = options.maxSessions;
    this.validateRunStatus = options.validateRunStatus;
    this.logEnabled = options.logEnabled ?? false;

    this.startCleanupInterval();
  }

  private log(message: string, context?: Record<string, unknown>) {
    if (this.logEnabled) {
      console.log(`[GameSession] ${message}`, context || {});
    }
  }

  private startCleanupInterval() {
    // Clear existing timer if any
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
    // Only unref in non-test environments to allow graceful shutdown
    if (process.env.NODE_ENV !== 'test' && this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  async createSession(
    runId: string,
    data: Omit<GameSession, 'runId' | 'createdAt' | 'expiresAt' | 'lastActivityAt'>
  ): Promise<string> {
    const now = Date.now();

    // Enforce max session cap if configured
    if (this.maxSessions && this.sessions.size >= this.maxSessions) {
      // Evict oldest session by createdAt
      let oldestToken: string | null = null;
      let oldestTime = Infinity;
      for (const [token, session] of this.sessions.entries()) {
        if (session.createdAt < oldestTime) {
          oldestTime = session.createdAt;
          oldestToken = token;
        }
      }
      if (oldestToken) {
        this.log('Evicting oldest session due to capacity limit', { token: oldestToken });
        this.sessions.delete(oldestToken);
      }
    }

    const token = crypto.randomBytes(32).toString('hex');

    const session: GameSession = {
      runId,
      ...data,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      lastActivityAt: now
    };

    this.sessions.set(token, session);
    this.log('Session created', { runId, token: token.substring(0, 8) + '...' });

    return token;
  }

  async getSession(token: string): Promise<GameSession | null> {
    const session = this.sessions.get(token);

    if (!session) {
      this.log('Session not found', { token: token.substring(0, 8) + '...' });
      return null;
    }

    const now = Date.now();

    // Check absolute expiration
    if (now > session.expiresAt) {
      this.log('Session expired (absolute TTL)', { runId: session.runId });
      this.sessions.delete(token);
      return null;
    }

    // Check idle timeout if enabled
    if (this.idleTimeoutMs > 0 && now - session.lastActivityAt > this.idleTimeoutMs) {
      this.log('Session expired (idle timeout)', { runId: session.runId });
      this.sessions.delete(token);
      return null;
    }

    // Optional: validate run status against database
    if (this.validateRunStatus) {
      const isActive = await this.validateRunStatus(session.runId);
      if (!isActive) {
        this.log('Session invalidated: run no longer active', { runId: session.runId });
        this.sessions.delete(token);
        return null;
      }
    }

    // Update last activity timestamp
    session.lastActivityAt = now;
    this.sessions.set(token, session);

    return session;
  }

  async endSession(token: string): Promise<void> {
    const session = this.sessions.get(token);
    if (session) {
      this.log('Session ended', { runId: session.runId });
      this.sessions.delete(token);
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [token, session] of this.sessions.entries()) {
      const isExpired = now > session.expiresAt;
      const isIdle = this.idleTimeoutMs > 0 && (now - session.lastActivityAt > this.idleTimeoutMs);

      if (isExpired || isIdle) {
        this.sessions.delete(token);
        expiredCount++;
        this.log('Session cleaned up', { 
          runId: session.runId, 
          reason: isExpired ? 'TTL' : 'idle' 
        });
      }
    }

    if (expiredCount > 0 && this.logEnabled) {
      console.log(`[GameSession] Cleaned up ${expiredCount} expired sessions`);
    }
  }

  // Expose for testing/graceful shutdown
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.sessions.clear();
  }
}
