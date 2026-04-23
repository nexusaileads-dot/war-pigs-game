import Phaser from 'phaser';

type MovementKeys = {
  up?: Phaser.Input.Keyboard.Key;
  down?: Phaser.Input.Keyboard.Key;
  left?: Phaser.Input.Keyboard.Key;
  right?: Phaser.Input.Keyboard.Key;
};

export class PigPlayer extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed = 200;
  private targetVelocity = new Phaser.Math.Vector2(0, 0);

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
      body.setSize(this.width * 0.6, this.height * 0.7, true);
      body.setDrag(0, 0);
      body.setMaxVelocity(420, 420);
      body.useDamping = false;
    }
  }

  setMoveSpeed(speed: number) {
    this.moveSpeed = Math.max(0, speed);
  }

  setMoveVector(x: number, y: number, speed?: number) {
    const moveSpeed = speed ?? this.moveSpeed;

    let vx = x;
    let vy = y;

    if (vx !== 0 && vy !== 0) {
      const diagonalFactor = Math.SQRT1_2;
      vx *= diagonalFactor;
      vy *= diagonalFactor;
    }

    this.targetVelocity.set(vx * moveSpeed, vy * moveSpeed);
    this.applyVelocity();
  }

  stopMovement() {
    this.targetVelocity.set(0, 0);
    this.setVelocity(0, 0);
    this.setData('isMoving', false);
  }

  updateMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: MovementKeys,
    speed?: number
  ) {
    const moveSpeed = speed ?? this.moveSpeed;

    let x = 0;
    let y = 0;

    if (cursors.left?.isDown || wasd.left?.isDown) x -= 1;
    if (cursors.right?.isDown || wasd.right?.isDown) x += 1;
    if (cursors.up?.isDown || wasd.up?.isDown) y -= 1;
    if (cursors.down?.isDown || wasd.down?.isDown) y += 1;

    this.setMoveVector(x, y, moveSpeed);
  }

  facePointer(pointerX: number) {
    this.setFlipX(pointerX < this.x);
  }

  private applyVelocity() {
    this.setVelocity(this.targetVelocity.x, this.targetVelocity.y);

    if (this.targetVelocity.x !== 0 || this.targetVelocity.y !== 0) {
      this.setData('isMoving', true);
      this.setData('moveDirection', {
        x: Math.sign(this.targetVelocity.x),
        y: Math.sign(this.targetVelocity.y)
      });
    } else {
      this.setData('isMoving', false);
    }
  }
  }
