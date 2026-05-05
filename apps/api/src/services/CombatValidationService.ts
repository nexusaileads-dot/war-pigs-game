import { CombatSystem, WeaponConfig, EnemyConfig } from '@war-pigs/game-logic';

// Strict input types to prevent injection and ensure validation coverage
export interface CombatInput {
  type: 'MOVE' | 'SHOOT' | 'HIT' | 'ABILITY';
  timestamp: number; // Client-reported timestamp (ms)
  serverReceivedAt?: number; // Optional: server-side receipt time for trust scoring
  data: {
    weaponId?: string;
    enemyId?: string;
    playerX?: number;
    playerY?: number;
    enemyX?: number;
    enemyY?: number;
    damage?: number;
    abilityId?: string;
  };
}

export interface ValidationContext {
  weaponConfigs: Record<string, WeaponConfig>;
  enemyConfigs: Record<string, EnemyConfig>;
  levelDurationMs: number;
  maxTheoreticalKills: number;
  maxTheoreticalDamage: number;
}

/**
 * Server-side combat validation to prevent client cheating.
 * Validates that reported combat sequences are mathematically and physically possible.
 */
export class CombatValidationService {
  constructor(private combatSystem?: CombatSystem) {
    // Optional DI for testability
  }

  validateCombatSequence(
    inputs: CombatInput[],
    context: ValidationContext
  ): { valid: boolean; reason?: string; confidence: 'high' | 'medium' | 'low' } {
    // Sort by server-received time if available, else client timestamp
    const sorted = [...inputs].sort((a, b) => 
      (a.serverReceivedAt ?? a.timestamp) - (b.serverReceivedAt ?? b.timestamp)
    );

    const weaponCooldowns = new Map<string, number>();
    const hitRegistry = new Set<string>(); // Prevent duplicate hit reports

    for (const input of sorted) {
      switch (input.type) {
        case 'SHOOT': {
          const weaponId = input.data.weaponId;
          if (!weaponId) break;

          const config = context.weaponConfigs[weaponId];
          if (!config) return { valid: false, reason: 'Unknown weapon', confidence: 'high' };

          const cooldown = config.fireRate;
          const lastShot = weaponCooldowns.get(weaponId) ?? -Infinity;
          
          // Use server-received time for trust if available
          const currentTime = input.serverReceivedAt ?? input.timestamp;
          
          if (currentTime - lastShot < cooldown * 0.9) { // 10% tolerance for network jitter
            return { valid: false, reason: `Fire rate exceeded for ${weaponId}`, confidence: 'high' };
          }
          weaponCooldowns.set(weaponId, currentTime);
          break;
        }

        case 'HIT': {
          const key = `${input.data.enemyId}-${input.timestamp}`;
          if (hitRegistry.has(key)) {
            return { valid: false, reason: 'Duplicate hit report', confidence: 'high' };
          }
          hitRegistry.add(key);

          // Basic range validation (simplified)
          const { playerX, playerY, enemyX, enemyY, weaponId } = input.data;
          if (playerX !== undefined && enemyX !== undefined && weaponId) {
            const distance = Math.hypot(playerX - enemyX, (playerY ?? 0) - (enemyY ?? 0));
            const config = context.weaponConfigs[weaponId];
            // Approximate max range: bulletSpeed * projectileLifetime / 1000 (pixels)
            const maxRange = config ? (config.bulletSpeed * config.projectileLifetime) / 1000 : 1000;
            if (distance > maxRange * 1.2) { // 20% tolerance for movement during projectile flight
              return { valid: false, reason: 'Hit out of weapon range', confidence: 'medium' };
            }
          }
          break;
        }

        case 'ABILITY': {
          // TODO: Validate ability cooldowns and effects based on character config
          break;
        }
      }
    }

    return { valid: true, confidence: 'medium' }; // Medium: client timestamps still trusted
  }

  /**
   * Validates final run stats against theoretical maximums.
   * Used as a secondary check after sequence validation.
   */
  validateFinalStats(
    stats: { kills: number; damageDealt: number; timeElapsed: number },
    context: ValidationContext
  ): { valid: boolean; reason?: string } {
    if (stats.kills > context.maxTheoreticalKills * 1.1) { // 10% tolerance
      return { valid: false, reason: 'Kill count exceeds theoretical maximum' };
    }
    if (stats.damageDealt > context.maxTheoreticalDamage * 1.2) {
      return { valid: false, reason: 'Damage dealt exceeds theoretical maximum' };
    }
    if (stats.timeElapsed < 10 || stats.timeElapsed > context.levelDurationMs * 2) {
      return { valid: false, reason: 'Suspicious run duration' };
    }
    return { valid: true };
  }
}
