import Phaser from 'phaser';

export class EnemySprite extends Phaser.Physics.Arcade.Sprite {
  id: string;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x, y, 'enemy');
    this.id = id;
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  chase(target: Phaser.GameObjects.Sprite, speed: number) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.scene.physics.velocityFromRotation(angle, speed, this.body!.velocity);
  }
}
