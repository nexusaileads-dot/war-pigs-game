export interface PlayerStats {
  maxHealth: number;
  currentHealth: number;
  speed: number;
  damageMultiplier: number;
  fireRateMultiplier: number;
  critChance: number;
  invulnerable: boolean;
}

export class Player {
  id: string;
  x: number;
  y: number;
  stats: PlayerStats;
  characterId: string;
  weaponId: string;
  lastShotTime: number = 0;
  xp: number = 0;
  level: number = 1;

  constructor(id: string, x: number, y: number, characterId: string, weaponId: string, baseStats: Partial<PlayerStats> = {}) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.characterId = characterId;
    this.weaponId = weaponId;
    
    this.stats = {
      maxHealth: baseStats.maxHealth || 100,
      currentHealth: baseStats.maxHealth || 100,
      speed: baseStats.speed || 5,
      damageMultiplier: baseStats.damageMultiplier || 1.0,
      fireRateMultiplier: baseStats.fireRateMultiplier || 1.0,
      critChance: baseStats.critChance || 0.05,
      invulnerable: false,
    };
  }

  takeDamage(amount: number): boolean {
    if (this.stats.invulnerable || this.stats.currentHealth <= 0) return false;
    
    this.stats.currentHealth = Math.max(0, this.stats.currentHealth - amount);
    return this.stats.currentHealth <= 0;
  }

  heal(amount: number): void {
    this.stats.currentHealth = Math.min(this.stats.maxHealth, this.stats.currentHealth + amount);
  }

  canShoot(currentTime: number, weaponCooldown: number): boolean {
    const adjustedCooldown = weaponCooldown / this.stats.fireRateMultiplier;
    return currentTime - this.lastShotTime >= adjustedCooldown;
  }

  shoot(currentTime: number): void {
    this.lastShotTime = currentTime;
  }

  isAlive(): boolean {
    return this.stats.currentHealth > 0;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  applyPassiveAbility(abilityName: string): void {
    switch (abilityName) {
      case 'BATTLE_HARDENED':
        if (this.stats.currentHealth < this.stats.maxHealth * 0.5) {
          this.stats.damageMultiplier *= 0.9; // 10% reduction
        }
        break;
      case 'UNBREAKABLE':
        this.stats.invulnerable = false; // Logic handled separately
        break;
      case 'ADRENALINE':
        // Speed boost logic handled in movement
        break;
      case 'HEADHUNTER':
        this.stats.critChance += 0.25;
        break;
      case 'CHAIN_REACTION':
        // Explosion logic handled in projectile
        break;
      case 'TACTICAL_GENIUS':
        this.stats.damageMultiplier *= 1.15;
        break;
    }
  }
      }
    
