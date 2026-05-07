import { EnemyTemplate } from './Enemy';

export interface BossPhase {
  healthThreshold: number; // 0.0 to 1.0
  abilities: string[];
  speedMultiplier: number;
  damageMultiplier: number;
}

export class Boss {
  id: string;
  templateId: string;
  name: string;
  title: string;
  x: number = 0; // FIXED: Initialized to 0
  y: number = 0; // FIXED: Initialized to 0
  health: number;
  maxHealth: number;
  baseDamage: number;
  baseSpeed: number;
  currentPhase: number = 0;
  phases: BossPhase[];
  abilities: string[];
  isAlive: boolean = true;
  isEnraged: boolean = false;
  
  // Ability cooldowns
  abilityCooldowns: Map<string, number> = new Map();
  lastAbilityTime: Map<string, number> = new Map();

  constructor(
    id: string,
    templateId: string,
    name: string,
    title: string,
    maxHealth: number,
    damage: number,
    speed: number,
    abilities: string[],
    phases: BossPhase[]
  ) {
    this.id = id;
    this.templateId = templateId;
    this.name = name;
    this.title = title;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.baseDamage = damage;
    this.baseSpeed = speed;
    this.abilities = abilities;
    this.phases = phases.sort((a, b) => b.healthThreshold - a.healthThreshold); // Highest first
    
    // Initialize cooldowns
    abilities.forEach(ability => {
      this.abilityCooldowns.set(ability, 5000 + Math.random() * 5000); // 5-10s base
      this.lastAbilityTime.set(ability, 0);
    });
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    
    // Check phase transitions
    const healthPercent = this.health / this.maxHealth;
    while (this.currentPhase < this.phases.length - 1 && 
           healthPercent <= this.phases[this.currentPhase + 1].healthThreshold) {
      this.currentPhase++;
      this.onPhaseChange(this.phases[this.currentPhase]);
    }

    if (this.health <= 0 && this.isAlive) {
      this.isAlive = false;
      return true;
    }
    return false;
  }

  private onPhaseChange(phase: BossPhase): void {
    console.log(`Boss ${this.name} entered phase with abilities: ${phase.abilities.join(', ')}`);
    // Reset some cooldowns for immediate response
    phase.abilities.forEach(ability => {
      this.lastAbilityTime.set(ability, Date.now() - 3000); // Ready in 2s
    });
  }

  update(deltaTime: number, playerX: number, playerY: number, currentTime: number): { type: string; data?: any }[] {
    if (!this.isAlive) return [];

    const events: { type: string; data?: any }[] = [];
    const currentPhaseData = this.phases[this.currentPhase];
    
    // Movement toward player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const speed = this.baseSpeed * currentPhaseData.speedMultiplier;
    this.x += (dx / distance) * speed * (deltaTime / 1000);
    this.y += (dy / distance) * speed * (deltaTime / 1000);

    // Check abilities
    currentPhaseData.abilities.forEach(ability => {
      const lastUsed = this.lastAbilityTime.get(ability) || 0;
      const cooldown = this.abilityCooldowns.get(ability) || 5000;
      
      if (currentTime - lastUsed > cooldown) {
        const abilityEvent = this.executeAbility(ability, playerX, playerY, distance);
        if (abilityEvent) {
          events.push(abilityEvent);
          this.lastAbilityTime.set(ability, currentTime);
        }
      }
    });

    return events;
  }

  private executeAbility(ability: string, playerX: number, playerY: number, distance: number): { type: string; data: any } | null {
    const damage = this.baseDamage * this.phases[this.currentPhase].damageMultiplier;
    
    switch (ability) {
      case 'HOWL':
        return {
          type: 'SUMMON',
          data: { count: 3, enemyType: 'wolf_grunt', x: this.x, y: this.y }
        };
        
      case 'LEAP':
        return {
          type: 'LEAP',
          data: { targetX: playerX, targetY: playerY, damage: damage * 1.5, radius: 80 }
        };
        
      case 'FRENZY':
        this.phases[this.currentPhase].speedMultiplier *= 1.5;
        return {
          type: 'BUFF',
          data: { type: 'SPEED', value: 1.5, duration: 5000 }
        };
        
      case 'ROCKET_SALVO':
        const rockets = [];
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          rockets.push({
            direction: { x: Math.cos(angle), y: Math.sin(angle) },
            damage: damage * 0.8
          });
        }
        return { type: 'ROCKET_SALVO', data: { rockets } };
        
      case 'GROUND_POUND':
        return {
          type: 'SHOCKWAVE',
          data: { damage: damage, radius: 150, stunDuration: 2000 }
        };
        
      case 'SHIELD_DRONE':
        return {
          type: 'SHIELD',
          data: { regenPerSecond: 50, duration: 10000 }
        };
        
      case 'PHASE_SHIFT':
        return {
          type: 'TELEPORT',
          data: { 
            invulnerable: true, 
            duration: 2000,
            newX: playerX + (Math.random() - 0.5) * 200,
            newY: playerY + (Math.random() - 0.5) * 200
          }
        };
        
      case 'CLONE_ARMY':
        return {
          type: 'CLONE',
          data: { count: 5, health: this.maxHealth * 0.1 }
        };
        
      case 'DEATH_FROM_ABOVE':
        return {
          type: 'LASER_RAIN',
          data: { 
            duration: 5000, 
            damagePerSecond: damage * 0.5,
            coverage: 300
          }
        };
        
      case 'TIME_WARP':
        return {
          type: 'DEBUFF',
          data: { type: 'SLOW', value: 0.5, duration: 5000, target: 'PLAYER' }
        };
        
      default:
        return null;
    }
  }

  getCurrentStats(): { damage: number; speed: number } {
    const phase = this.phases[this.currentPhase];
    return {
      damage: this.baseDamage * phase.damageMultiplier,
      speed: this.baseSpeed * phase.speedMultiplier,
    };
  }
}
