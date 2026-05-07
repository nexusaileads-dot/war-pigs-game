export type EnemyBehavior = 'CHASER' | 'SHOOTER' | 'TANK' | 'EXPLODER';

export interface EnemyTemplate {
  id: string;
  name: string;
  health: number;
  damage: number;
  speed: number;
  behavior: EnemyBehavior;
  rewardValue: number;
}

export class Enemy {
  id: string;
  templateId: string;
  x: number = 0; // FIXED: Initialized
  y: number = 0; // FIXED: Initialized
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  behavior: EnemyBehavior;
  isAlive: boolean = true;
  lastAttackTime: number = 0;
  attackCooldown: number = 1000; // ms
  
  // AI state
  targetX: number = 0;
  targetY: number = 0;
  state: 'IDLE' | 'CHASE' | 'ATTACK' | 'EXPLODE' = 'IDLE';
  explosionTimer: number = 0;

  constructor(id: string, template: EnemyTemplate, x: number, y: number) {
    this.id = id;
    this.templateId = template.id;
    this.x = x;
    this.y = y;
    this.maxHealth = template.health;
    this.health = template.health;
    this.damage = template.damage;
    this.speed = template.speed;
    this.behavior = template.behavior;
    
    if (this.behavior === 'EXPLODER') {
      this.attackCooldown = 2000; // Give player time to react
    }
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    if (this.health <= 0 && this.isAlive) {
      this.isAlive = false;
      return true; // Died
    }
    return false;
  }

  update(deltaTime: number, playerX: number, playerY: number): { type: string; data?: any } | null {
    if (!this.isAlive) return null;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    switch (this.behavior) {
      case 'CHASER':
        if (distance > 30) {
          this.x += (dx / distance) * this.speed * (deltaTime / 1000);
          this.y += (dy / distance) * this.speed * (deltaTime / 1000);
        } else {
          return { type: 'MELEE_ATTACK', data: { damage: this.damage } };
        }
        break;

      case 'SHOOTER':
        if (distance < 300 && distance > 150) {
          // Maintain distance
          this.x -= (dx / distance) * this.speed * 0.5 * (deltaTime / 1000);
          this.y -= (dy / distance) * this.speed * 0.5 * (deltaTime / 1000);
        } else if (distance >= 300) {
          // Get closer
          this.x += (dx / distance) * this.speed * (deltaTime / 1000);
          this.y += (dy / distance) * this.speed * (deltaTime / 1000);
        }
        
        if (distance < 400 && Date.now() - this.lastAttackTime > this.attackCooldown) {
          this.lastAttackTime = Date.now();
          return { 
            type: 'SHOOT', 
            data: { 
              direction: { x: dx / distance, y: dy / distance },
              damage: this.damage 
            } 
          };
        }
        break;

      case 'TANK':
        // Slow but steady advance
        this.x += (dx / distance) * this.speed * (deltaTime / 1000);
        this.y += (dy / distance) * this.speed * (deltaTime / 1000);
        if (distance < 50) {
          return { type: 'MELEE_ATTACK', data: { damage: this.damage } };
        }
        break;

      case 'EXPLODER':
        if (distance < 100) {
          this.state = 'EXPLODE';
          this.explosionTimer += deltaTime;
          if (this.explosionTimer > 1500) {
            this.isAlive = false;
            return { 
              type: 'EXPLODE', 
              data: { 
                damage: this.damage * 2, 
                radius: 100,
                x: this.x,
                y: this.y
              } 
            };
          }
        } else {
          this.x += (dx / distance) * this.speed * 1.5 * (deltaTime / 1000);
          this.y += (dy / distance) * this.speed * 1.5 * (deltaTime / 1000);
        }
        break;
    }

    return null;
  }
}
