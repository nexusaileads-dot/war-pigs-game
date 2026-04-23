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
      body.setCollideWorldBounds(true);
      body.setSize(this.width * 0.6, this.height * 0.72, true);
      body.setOffset(this.width * 0.2, this.height * 0.18);
      body.setDrag(0, 0);
      body.setDamping(false);
      body.setMaxVelocity(420, 420);
      body.setImmovable(false);
    }
  }

  setMoveSpeed(speed: number) {
    this.moveSpeed = Math.max(0, speed);

    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setMaxVelocity(this.moveSpeed, this.moveSpeed);
    }
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

    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setVelocity(vx, vy);

      if (vx === 0) {
        body.setVelocityX(0);
      }

      if (vy === 0) {
        body.setVelocityY(0);
      }
    } else {
      this.setVelocity(vx, vy);
    }

    if (vx !== 0 || vy !== 0) {
      this.setData('isMoving', true);
      this.setData('moveDirection', {
        x: Math.sign(vx),
        y: Math.sign(vy)
      });
    } else {
      this.setData('isMoving', false);
      this.setData('moveDirection', { x: 0, y: 0 });
    }
  }

  setMoveVector(x: number, y: number, speed?: number) {
    const moveSpeed = speed ?? this.moveSpeed;

    let vx = Phaser.Math.Clamp(x, -1, 1) * moveSpeed;
    let vy = Phaser.Math.Clamp(y, -1, 1) * moveSpeed;

    if (vx !== 0 && vy !== 0) {
      const diagonalFactor = Math.SQRT1_2;
      vx *= diagonalFactor;
      vy *= diagonalFactor;
    }

    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setVelocity(vx, vy);

      if (Math.abs(vx) < 0.001) {
        body.setVelocityX(0);
      }

      if (Math.abs(vy) < 0.001) {
        body.setVelocityY(0);
      }
    } else {
      this.setVelocity(vx, vy);
    }

    if (vx !== 0 || vy !== 0) {
      this.setData('isMoving', true);
      this.setData('moveDirection', {
        x: Math.sign(vx),
        y: Math.sign(vy)
      });
    } else {
      this.setData('isMoving', false);
      this.setData('moveDirection', { x: 0, y: 0 });
    }
  }

  stopMovement() {
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setVelocity(0, 0);
      body.setAcceleration(0, 0);
    } else {
      this.setVelocity(0, 0);
    }

    this.setData('isMoving', false);
    this.setData('moveDirection', { x: 0, y: 0 });
  }

  facePointer(pointerX: number) {
    this.setFlipX(pointerX < this.x);
  }
  }
