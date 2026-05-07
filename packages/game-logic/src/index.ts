// --- REWARD LOGIC ---

export interface RewardInput {
  kills: number;
  damageDealt: number;
  damageTaken: number;
  accuracy: number;
  timeElapsed: number;
  wavesCleared: number;
  bossKilled: boolean;
  difficulty: number;
  isPerfectRun: boolean;
}

export interface RewardOutput {
  total: number;
  xpEarned: number;
  bonusReasons: string[];
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export class RewardCalculator {
  private readonly BASE_PIGS_PER_KILL = 10;
  private readonly BASE_XP_PER_KILL = 5;
  private readonly BOSS_BONUS_PIGS = 100;
  private readonly BOSS_BONUS_XP = 50;
  private readonly PERFECT_RUN_BONUS = 0.25;

  calculateRewards(input: RewardInput): RewardOutput {
    let totalPigs = input.kills * this.BASE_PIGS_PER_KILL;
    let totalXp = input.kills * this.BASE_XP_PER_KILL;
    const bonusReasons: string[] = [];

    const difficultyMultiplier = 1 + (input.difficulty - 1) * 0.15;
    totalPigs = Math.floor(totalPigs * difficultyMultiplier);
    totalXp = Math.floor(totalXp * difficultyMultiplier);

    if (input.bossKilled) {
      totalPigs += this.BOSS_BONUS_PIGS;
      totalXp += this.BOSS_BONUS_XP;
      bonusReasons.push('Boss Defeated');
    }

    if (input.isPerfectRun) {
      const perfectBonus = Math.floor(totalPigs * this.PERFECT_RUN_BONUS);
      totalPigs += perfectBonus;
      totalXp += Math.floor(totalXp * this.PERFECT_RUN_BONUS);
      bonusReasons.push('Perfect Run');
    }

    if (input.timeElapsed < 60) {
      const timeBonus = Math.floor((60 - input.timeElapsed) * 2);
      totalPigs += timeBonus;
      bonusReasons.push('Speed Bonus');
    }

    return {
      total: totalPigs,
      xpEarned: totalXp,
      bonusReasons
    };
  }

  validateRunStats(input: RewardInput, maxPossibleKills: number): ValidationResult {
    if (input.kills < 0) return { valid: false, reason: 'Negative kills' };
    if (input.kills > maxPossibleKills * 1.5) return { valid: false, reason: 'Impossible kill count' };
    if (input.accuracy < 0 || input.accuracy > 100) return { valid: false, reason: 'Invalid accuracy' };
    if (input.timeElapsed < 0) return { valid: false, reason: 'Negative time' };
    return { valid: true };
  }
}

// --- CONFIG TYPES (Required by API) ---

export interface WeaponConfig {
  id: string;
  name: string;
  damage: number;
  fireRate: number; // ms between shots
  bulletSpeed: number; // pixels per second
  projectileLifetime: number; // ms
  range: number;
  type: 'PISTOL' | 'RIFLE' | 'SHOTGUN' | 'SNIPER' | 'ROCKET';
}

export interface EnemyConfig {
  id: string;
  name: string;
  health: number;
  damage: number;
  speed: number;
  behavior: 'CHASER' | 'SHOOTER' | 'TANK' | 'EXPLODER';
  rewardValue: number;
}

// --- COMBAT SYSTEM (Required by API) ---

export class CombatSystem {
  constructor() {}

  // Placeholder for future server-side combat simulation logic
  calculateDamage(weapon: WeaponConfig, enemy: EnemyConfig): number {
    return weapon.damage;
  }
}

// --- ENTITIES ---

export * from './entities/Enemy';
export * from './entities/Boss';
