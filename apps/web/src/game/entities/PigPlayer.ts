import Phaser from 'phaser';

type MovementKeys = {
  up?: Phaser.Input.Keyboard.Key;
  down?: Phaser.Input.Keyboard.Key;
  left?: Phaser.Input.Keyboard.Key;
  right?: Phaser.Input.Keyboard.Key;
};

export class PigPlayer extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'player') {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setOrigin(0.5, 0.5);
  }

  updateMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: MovementKeys,
    speed: number
  ) {
    let vx = 0;
    let vy = 0;

    if (cursors.left?.isDown || wasd.left?.isDown) vx = -speed;
    if (cursors.right?.isDown || wasd.right?.isDown) vx = speed;
    if (cursors.up?.isDown || wasd.up?.isDown) vy = -speed;
    if (cursors.down?.isDown || wasd.down?.isDown) vy = speed;

    if (vx !== 0 && vy !== 0) {
      const diagonalFactor = Math.SQRT1_2;
      vx *= diagonalFactor;
      vy *= diagonalFactor;
    }

    this.setVelocity(vx, vy);
  }
}
