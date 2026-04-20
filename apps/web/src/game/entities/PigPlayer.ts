import Phaser from 'phaser';

type MovementKeys = {
  up?: Phaser.Input.Keyboard.Key;
  down?: Phaser.Input.Keyboard.Key;
  left?: Phaser.Input.Keyboard.Key;
  right?: Phaser.Input.Keyboard.Key;
};

export class PigPlayer extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed = 200;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'player') {
    const resolvedTexture = scene.textures.exists(texture) ? texture : 'player';

    super(scene, x, y, resolvedTexture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.5);
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setAllowGravity(false);
      body.setSize(this.width * 0.65, this.height * 0.75, true);
      body.setDrag(600, 600);
      body.setMaxVelocity(260, 260);
    }
  }

  setMoveSpeed(speed: number) {
    this.moveSpeed = Math.max(0, speed);
  }

  updateMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: MovementKeys,
    speed?: number
  ) {
    const moveSpeed = speed ?? this.moveSpeed;

    let vx = 0;
    let vy = 0;

    if (cursors.left?.isDown || wasd.left?.isDown) vx -= moveSpeed;
    if (cursors.right?.isDown || wasd.right?.isDown) vx += moveSpeed;
    if (cursors.up?.isDown || wasd.up?.isDown) vy -= moveSpeed;
    if (cursors.down?.isDown || wasd.down?.isDown) vy += moveSpeed;

    if (vx !== 0 && vy !== 0) {
      const diagonalFactor = Math.SQRT1_2;
      vx *= diagonalFactor;
      vy *= diagonalFactor;
    }

    this.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.setData('isMoving', true);
      this.setData('moveDirection', {
        x: Math.sign(vx),
        y: Math.sign(vy)
      });
    } else {
      this.setData('isMoving', false);
    }
  }

  facePointer(pointerX: number) {
    this.setFlipX(pointerX < this.x);
  }
}
