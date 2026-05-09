import Phaser from 'phaser';

export interface EnemySpriteConfig {
  id: string;
  texture: string;
  hp?: number;
  speed?: number;
  damage?: number;
}

export class EnemySprite extends Phaser.Physics.Arcade.Sprite {
  id: string;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemySpriteConfig) {
    super(scene, x, y, config.texture);
    
    this.id = config.id;
    this.hp = config.hp ?? 2;
    this.maxHp = this.hp;
    this.speed = config.speed ?? 100;
    this.damage = config.damage ?? 5;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize default display size if needed
    this.setDepth(10);
  }

  chase(target: Phaser.GameObjects.Sprite, customSpeed?: number) {
    if (!this.body) return; // Fixed: Null guard

    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const moveSpeed = customSpeed ?? this.speed;
    
    this.scene.physics.velocityFromRotation(angle, moveSpeed, this.body.velocity);
  }
}
