import Redis from 'ioredis';

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
  private redis: Redis;
  private readonly SESSION_TTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async createSession(runId: string, data: Omit<GameSession, 'createdAt'>): Promise<string> {
    const session: GameSession = {
      ...data,
      createdAt: Date.now()
    };

    const token = `session_${runId}_${Date.now()}`;
    await this.redis.setex(
      token,
      this.SESSION_TTL,
      JSON.stringify(session)
    );

    return token;
  }

  async getSession(token: string): Promise<GameSession | null> {
    const data = await this.redis.get(token);
    if (!data) return null;
    return JSON.parse(data);
  }

  async endSession(token: string): Promise<void> {
    await this.redis.del(token);
  }
}
