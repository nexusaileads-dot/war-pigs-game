import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Projectile, ProjectileConfig } from '../entities/Projectile';

export interface CombatResult {
  hits: Array<{
    targetId: string;
    damage: number;
    isCrit: boolean;
    isKill: boolean;
  }>;
  projectilesToRemove: string[];
  explosions: Array<{
    x: number;
    y: number;
    radius: number;
    damage: number;
  }>;
}

export class CombatSystem {
  processProjectiles(
    projectiles: Projectile[],
    players: Map<string, Player>,
    enemies: Map<string, Enemy>,
    boss: Boss | null
  ): CombatResult {
    const result: CombatResult = {
      hits: [],
      projectilesToRemove: [],
      explosions: []
    };

    projectiles.forEach(proj => {
      if (!proj.isActive) return;

      if (proj.isPlayerProjectile) {
        // Check enemy collisions
        enemies.forEach(enemy => {
          if (enemy.isAlive && proj.checkCollision(enemy.x, enemy.y, 20)) {
            const hitResult = this.processHit(proj, enemy.health);
            enemy.takeDamage(hitResult.damage);
            
            result.hits.push({
              targetId: enemy.id,
              damage: hitResult.damage,
              isCrit: hitResult.isCrit,
              isKill: !enemy.isAlive
            });

            const projResult = proj.onHit();
            if (projResult.shouldDestroy) {
              proj.isActive = false;
              result.projectilesToRemove.push(proj.id);
            }
            if (projResult.explosion) {
              result.explosions.push({
                x: proj.x,
                y: proj.y,
                ...projResult.explosion
              });
              this.processExplosion(proj.x, proj.y, projResult.explosion.radius, projResult.explosion.damage, enemies, players, boss, result);
            }
          }
        });

        // Check boss collision
        if (boss && boss.isAlive && proj.checkCollision(boss.x, boss.y, 40)) {
          const hitResult = this.processHit(proj, boss.health);
          boss.takeDamage(hitResult.damage);
          
          result.hits.push({
            targetId: boss.id,
            damage: hitResult.damage,
            isCrit: hitResult.isCrit,
            isKill: !boss.isAlive
          });

          proj.isActive = false;
          result.projectilesToRemove.push(proj.id);
        }
      } else {
        // Enemy projectile hitting players
        players.forEach(player => {
          if (player.isAlive() && proj.checkCollision(player.x, player.y, 15)) {
            const died = player.takeDamage(proj.damage);
            result.hits.push({
              targetId: player.id,
              damage: proj.damage,
              isCrit: false,
              isKill: died
            });
            proj.isActive = false;
            result.projectilesToRemove.push(proj.id);
          }
        });
      }
    });

    return result;
  }

  private processHit(projectile: Projectile, targetHealth: number): { damage: number; isCrit: boolean } {
    let damage = projectile.damage;
    let isCrit = false;

    // Critical hit chance (would be based on shooter stats)
    if (Math.random() < 0.1) { // 10% base crit
      damage *= 2;
      isCrit = true;
    }

    return { damage: Math.round(damage), isCrit };
  }

  private processExplosion(
    x: number, 
    y: number, 
    radius: number, 
    damage: number,
    enemies: Map<string, Enemy>,
    players: Map<string, Player>,
    boss: Boss | null,
    result: CombatResult
  ): void {
    enemies.forEach(enemy => {
      if (!enemy.isAlive) return;
      const dist = Math.sqrt((enemy.x - x) ** 2 + (enemy.y - y) ** 2);
      if (dist < radius) {
        const falloff = 1 - (dist / radius);
        const actualDamage = Math.round(damage * falloff);
        enemy.takeDamage(actualDamage);
        result.hits.push({
          targetId: enemy.id,
          damage: actualDamage,
          isCrit: false,
          isKill: !enemy.isAlive
        });
      }
    });

    if (boss && boss.isAlive) {
      const dist = Math.sqrt((boss.x - x) ** 2 + (boss.y - y) ** 2);
      if (dist < radius) {
        const falloff = 1 - (dist / radius);
        const actualDamage = Math.round(damage * falloff);
        boss.takeDamage(actualDamage);
        result.hits.push({
          targetId: boss.id,
          damage: actualDamage,
          isCrit: false,
          isKill: !boss.isAlive
        });
      }
    }
  }

  processMeleeCombat(
    attacker: Player | Enemy | Boss,
    targets: (Player | Enemy | Boss)[],
    damage: number
  ): CombatResult {
    const result: CombatResult = {
      hits: [],
      projectilesToRemove: [],
      explosions: []
    };

    targets.forEach(target => {
      const isPlayerTarget = target instanceof Player;
      const isAlive = isPlayerTarget ? (target as Player).isAlive() : (target as Enemy | Boss).isAlive;
      
      if (!isAlive || target === attacker) return;

      let hit = false;
      if (attacker instanceof Player && (target instanceof Enemy || target instanceof Boss)) {
        hit = true;
      } else if ((attacker instanceof Enemy || attacker instanceof Boss) && target instanceof Player) {
        hit = true;
      }

      if (hit) {
        let died = false;
        if (isPlayerTarget) {
          died = (target as Player).takeDamage(damage);
        } else {
          died = (target as Enemy | Boss).takeDamage(damage);
        }

        result.hits.push({
          targetId: (target as any).id,
          damage,
          isCrit: false,
          isKill: died
        });
      }
    });

    return result;
  }
}
