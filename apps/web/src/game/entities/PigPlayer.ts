import Phaser from 'phaser';

// Typed player state keys for setData/getData safety
export interface PlayerData {
  isMoving: boolean;
  moveDirection: { x: number; y: number } | null;
  health?: number;
  invulnerableUntil?: number;
}

type MovementKeys = {
  up?: Phaser.Input.Keyboard.Key;
  down?: Phaser.Input.Keyboard.Key;
  left?: Phaser.Input.Keyboard.Key;
  right?: Phaser.Input.Keyboard.Key;
};

// Constants for movement math
const DIAGONAL_FACTOR = Math.SQRT1_2; // ~0.707 for normalized diagonal movement

export class PigPlayer extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed = 200;
  private targetVelocity = new Phaser.Math.Vector2(0, 0);

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string = 'player',
    frame?: string | number
  ) {
    const resolvedTexture = scene.textures.exists(texture) ? texture : 'fallback_player';

    super(scene, x, y, resolvedTexture, frame);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Origin centered for consistent rotation/flipping; weapon attachment should account for this
    this.setOrigin(0.5, 0.5);
    this.setCollideWorldBounds(true);
    this.setDepth(10);

    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setAllowGravity(false);
      // Conservative hitbox to prevent snagging on small platforms
      body.setSize(this.width * 0.6, this.height * 0.7, true);
      body.setDrag(0, 0);
      body.setMaxVelocity(420, 420);
      // Note: Arcade Body does not support useDamping; removed to avoid confusion
    }

    // Initialize typed player state
    this.setData('isMoving', false);
    this.setData('moveDirection', null);
  }

  setMoveSpeed(speed: number) {
    this.moveSpeed = Math.max(0, speed);
  }

  setMoveVector(x: number, y: number, speed?: number) {
    const moveSpeed = speed ?? this.moveSpeed;

    let vx = x;
    let vy = y;

    // Normalize diagonal movement to prevent faster diagonal travel
    if (vx !== 0 && vy !== 0) {
      vx *= DIAGONAL_FACTOR;
      vy *= DIAGONAL_FACTOR;
    }

    this.targetVelocity.set(vx * moveSpeed, vy * moveSpeed);
    this.applyVelocity();
  }

  stopMovement() {
    this.targetVelocity.set(0, 0);
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setVelocity(0, 0);
    }
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

  /**
   * Flip sprite horizontally based on pointer X position relative to player.
   * @param pointerX - World X coordinate of pointer/input
   */
  facePointer(pointerX: number) {
    this.setFlipX(pointerX < this.x);
  }

  /**
   * Extended aiming: flip based on 2D angle.
   * @param targetX - World X of target
   * @param targetY - World Y of target (unused for horizontal flip, reserved for future)
   */
  faceTarget(targetX: number, _targetY?: number) {
    this.setFlipX(targetX < this.x);
  }

  /**
   * Optional: set animation frame based on movement state.
   * Call this in GameScene.update() if using multi-frame sprites.
   * @param isMoving - Whether player is currently moving
   * @param framePrefix - Base name for animation frames (e.g., 'run')
   */
  updateAnimation(isMoving: boolean, framePrefix = 'idle') {
    if (!isMoving) {
      this.setFrame(`${framePrefix}_0`);
      return;
    }

    // Simple 2-frame walk cycle toggle
    const frame = Math.floor(this.scene.time.now / 150) % 2;
    this.setFrame(`${framePrefix}_${frame}`);
  }

  private applyVelocity() {
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return; // Fixed: Null guard

    body.setVelocity(this.targetVelocity.x, this.targetVelocity.y);

    const isMoving = this.targetVelocity.x !== 0 || this.targetVelocity.y !== 0;
    this.setData('isMoving', isMoving);

    if (isMoving) {
      this.setData('moveDirection', {
        x: Math.sign(this.targetVelocity.x),
        y: Math.sign(this.targetVelocity.y)
      });
    } else {
      this.setData('moveDirection', null);
    }
  }

  // Typed getter for player state
  getPlayerData(): Partial<PlayerData> {
    return {
      isMoving: this.getData('isMoving'),
      moveDirection: this.getData('moveDirection'),
      health: this.getData('health'),
      invulnerableUntil: this.getData('invulnerableUntil')
    };
  }

  // Typed setter for player state
  setPlayerData(data: Partial<PlayerData>) {
    Object.entries(data).forEach(([key, value]) => {
      this.setData(key, value);
    });
  }
}
