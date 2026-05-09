import Phaser from 'phaser';

export interface BossSpriteConfig {
  id: string;
  texture: string;
  hp: number;
  phases?: number;
}

export class BossSprite extends Phaser.Physics.Arcade.Sprite {
  id: string;
  hp: number;
  maxHp: number;
  currentPhase: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BossSpriteConfig) {
    super(scene, x, y, config.texture);

    this.id = config.id;
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.currentPhase = config.phases ?? 1;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set high depth to ensure boss renders above platforms
    this.setDepth(25);
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;

    // Check for phase transition (e.g., at 50% health)
    if (this.currentPhase === 1 && this.hp <= this.maxHp * 0.5) {
      this.currentPhase = 2;
      this.emit('phase-change', this.currentPhase);
    }

    return this.hp <= 0;
  }
}
