interface GameSession {
  userId: string;
  levelId: string;
  characterId: string;
  weaponId: string;
  maxEnemies: number;
  difficulty: number;
  createdAt: number;
}

export class GameSessionService {
  private sessions = new Map<string, GameSession>();
  private readonly SESSION_TTL = 3600 * 1000; // 1 hour in ms

  async createSession(runId: string, data: Omit<GameSession, 'createdAt'>): Promise<string> {
    const session: GameSession = {
      ...data,
      createdAt: Date.now()
    };

    const token = `session_${runId}_${Date.now()}`;
    this.sessions.set(token, session);

    setTimeout(() => {
      this.sessions.delete(token);
    }, this.SESSION_TTL);

    return token;
  }

  async getSession(token: string): Promise<GameSession | null> {
    const session = this.sessions.get(token);
    if (!session) return null;

    const expired = Date.now() - session.createdAt > this.SESSION_TTL;
    if (expired) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  async endSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}
