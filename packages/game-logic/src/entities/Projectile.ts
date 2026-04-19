export interface ProjectileConfig {
  speed: number;
  damage: number;
  maxRange: number;
  radius?: number;
  penetration?: number;
  explosionRadius?: number;
  explosionDamage?: number;
  lifetimeMs?: number;
}

export class Projectile {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  directionX: number;
  directionY: number;
  speed: number;
  damage: number;
  maxRange: number;
  radius: number;
  penetration: number;
  explosionRadius?: number;
  explosionDamage?: number;
  lifetimeMs: number;
  createdAt: number;
  isPlayerProjectile: boolean;
  isActive: boolean = true;
  hitsRemaining: number;

  constructor(
    id: string,
    x: number,
    y: number,
    directionX: number,
    directionY: number,
    isPlayerProjectile: boolean,
    config: ProjectileConfig
  ) {
    const magnitude = Math.sqrt(directionX * directionX + directionY * directionY) || 1;

    this.id = id;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.directionX = directionX / magnitude;
    this.directionY = directionY / magnitude;
    this.speed = config.speed;
    this.damage = config.damage;
    this.maxRange = config.maxRange;
    this.radius = config.radius ?? 8;
    this.penetration = config.penetration ?? 1;
    this.explosionRadius = config.explosionRadius;
    this.explosionDamage = config.explosionDamage;
    this.lifetimeMs = config.lifetimeMs ?? 5000;
    this.createdAt = Date.now();
    this.isPlayerProjectile = isPlayerProjectile;
    this.hitsRemaining = this.penetration;
  }

  update(deltaTime: number, currentTime: number = Date.now()): void {
    if (!this.isActive) return;

    const deltaSeconds = deltaTime / 1000;
    this.x += this.directionX * this.speed * deltaSeconds;
    this.y += this.directionY * this.speed * deltaSeconds;

    if (this.hasExceededRange() || currentTime - this.createdAt > this.lifetimeMs) {
      this.isActive = false;
    }
  }

  checkCollision(targetX: number, targetY: number, targetRadius: number): boolean {
    if (!this.isActive) return false;

    const dx = this.x - targetX;
    const dy = this.y - targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.radius + targetRadius;
  }

  onHit(): {
    shouldDestroy: boolean;
    explosion?: {
      radius: number;
      damage: number;
    };
  } {
    if (!this.isActive) {
      return { shouldDestroy: false };
    }

    this.hitsRemaining -= 1;

    const shouldDestroy = this.hitsRemaining <= 0;
    if (shouldDestroy) {
      this.isActive = false;
    }

    if (this.explosionRadius && this.explosionDamage) {
      return {
        shouldDestroy,
        explosion: {
          radius: this.explosionRadius,
          damage: this.explosionDamage
        }
      };
    }

    return { shouldDestroy };
  }

  getDistanceTraveled(): number {
    const dx = this.x - this.startX;
    const dy = this.y - this.startY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  hasExceededRange(): boolean {
    return this.getDistanceTraveled() >= this.maxRange;
  }

  deactivate(): void {
    this.isActive = false;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
  }
