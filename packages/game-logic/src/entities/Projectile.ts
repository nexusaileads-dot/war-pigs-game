export interface ProjectileConfig {
  speed: number;
  damage: number;
  piercing?: boolean;
  explosive?: boolean;
  explosiveRadius?: number;
  homing?: boolean;
  specialEffect?: string;
}

export class Projectile {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  damage: number;
  ownerId: string; // player or enemy id
  isPlayerProjectile: boolean;
  config: ProjectileConfig;
  isActive: boolean = true;
  distanceTraveled: number = 0;
  maxDistance: number = 1000;

  constructor(
    id: string,
    x: number,
    y: number,
    directionX: number,
    directionY: number,
    ownerId: string,
    isPlayer: boolean,
    config: ProjectileConfig
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.isPlayerProjectile = isPlayer;
    this.config = config;
    this.damage = config.damage;
    
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    this.velocityX = (directionX / length) * config.speed;
    this.velocityY = (directionY / length) * config.speed;
  }

  update(deltaTime: number, targetX?: number, targetY?: number): { type: string; data?: any } | null {
    if (!this.isActive) return null;

    // Homing logic
    if (this.config.homing && targetX !== undefined && targetY !== undefined) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const homingStrength = 0.1;
        this.velocityX += (dx / dist * this.config.speed - this.velocityX) * homingStrength;
        this.velocityY += (dy / dist * this.config.speed - this.velocityY) * homingStrength;
      }
    }

    const moveX = this.velocityX * (deltaTime / 1000);
    const moveY = this.velocityY * (deltaTime / 1000);
    
    this.x += moveX;
    this.y += moveY;
    this.distanceTraveled += Math.sqrt(moveX * moveX + moveY * moveY);

    if (this.distanceTraveled > this.maxDistance) {
      this.isActive = false;
    }

    return null;
  }

  checkCollision(targetX: number, targetY: number, targetRadius: number): boolean {
    if (!this.isActive) return false;
    
    const dx = this.x - targetX;
    const dy = this.y - targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < targetRadius;
  }

  onHit(): { shouldDestroy: boolean; explosion?: { radius: number; damage: number } } {
    if (this.config.explosive) {
      return {
        shouldDestroy: true,
        explosion: {
          radius: this.config.explosiveRadius || 50,
          damage: this.damage * 0.5
        }
      };
    }
    
    return {
      shouldDestroy: !this.config.piercing
    };
  }
}
