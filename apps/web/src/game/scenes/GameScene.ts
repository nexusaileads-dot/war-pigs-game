import Phaser from 'phaser';
import { PigPlayer } from '../entities/PigPlayer';
import { apiClient } from '../../api/client';

type CurrentRunPayload = {
  run: {
    id: string;
    characterId: string;
    weaponId: string;
    levelId: string;
  };
  sessionToken: string;
};

export class GameScene extends Phaser.Scene {
  player!: PigPlayer;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  projectiles!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  lastShotTime = 0;
  kills = 0;
  health = 100;
  spawnTimer?: Phaser.Time.TimerEvent;
  isFinishing = false;
  runData!: CurrentRunPayload;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const storedRun = sessionStorage.getItem('currentRun');
    if (!storedRun) {
      this.failMission();
      return;
    }

    this.runData = JSON.parse(storedRun) as CurrentRunPayload;

    if (!this.runData?.run?.id || !this.runData?.sessionToken) {
      this.failMission();
      return;
    }

    this.physics.world.setBounds(0, 0, 1600, 1200);

    this.add.image(800, 600, 'background').setDisplaySize(1600, 1200);

    const characterKey = this.runData.run.characterId || 'player';
    this.player = new PigPlayer(this, 800, 600, characterKey);
    this.player.setDisplaySize(72, 72);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, 1600, 1200);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as typeof this.wasd;

    this.projectiles = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 80
    });

    this.enemies = this.physics.add.group();

    this.input.on('pointerdown', () => {
      void this.shoot();
    });

    this.spawnTimer = this.time.addEvent({
      delay: 1800,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerDamage as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  update() {
    if (!this.player || this.isFinishing) return;

    this.player.updateMovement(this.cursors, this.wasd, 200);

    const pointerX = this.input.activePointer.worldX;
    const pointerY = this.input.activePointer.worldY;

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointerX, pointerY);
    this.player.setData('aimAngle', angle);

    this.player.setFlipX(pointerX < this.player.x);

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      this.physics.moveToObject(enemy, this.player, 100);

      const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
      if (body) {
        enemy.setFlipX(body.velocity.x < 0);
      }
    });
  }

  async shoot() {
    if (this.isFinishing) return;

    const now = this.time.now;
    if (now - this.lastShotTime < 250) return;
    this.lastShotTime = now;

    const bullet = this.projectiles.get(this.player.x, this.player.y, 'bullet') as
      | Phaser.Physics.Arcade.Image
      | Phaser.Physics.Arcade.Sprite
      | null;

    if (!bullet) return;

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setPosition(this.player.x, this.player.y);
    bullet.setDisplaySize(12, 12);

    const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    body.enable = true;
    body.reset(this.player.x, this.player.y);

    const aimAngle = this.player.getData('aimAngle') || 0;
    this.physics.velocityFromRotation(aimAngle, 600, body.velocity);

    this.time.delayedCall(1000, () => {
      if (!bullet.active) return;
      bullet.setActive(false);
      bullet.setVisible(false);
      const bulletBody = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      bulletBody?.stop();
    });
  }

  spawnEnemy() {
    if (this.isFinishing) return;

    const edges = [
      { x: Phaser.Math.Between(0, 1600), y: -40 },
      { x: Phaser.Math.Between(0, 1600), y: 1240 },
      { x: -40, y: Phaser.Math.Between(0, 1200) },
      { x: 1640, y: Phaser.Math.Between(0, 1200) }
    ];

    const spawn = Phaser.Utils.Array.GetRandom(edges);
    const enemy = this.enemies.create(spawn.x, spawn.y, 'enemy') as Phaser.Physics.Arcade.Sprite;

    if (!enemy) return;

    enemy.setDisplaySize(64, 64);
    enemy.setActive(true);
    enemy.setVisible(true);
  }

  handleHit(
    bulletObject: Phaser.GameObjects.GameObject,
    enemyObject: Phaser.GameObjects.GameObject
  ) {
    const bullet = bulletObject as Phaser.Physics.Arcade.Image | Phaser.Physics.Arcade.Sprite;
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;

    if (!bullet.active || !enemy.active || this.isFinishing) return;

    bullet.setActive(false);
    bullet.setVisible(false);
    const bulletBody = bullet.body as Phaser.Physics.Arcade.Body | undefined;
    bulletBody?.stop();

    enemy.destroy();
    this.kills += 1;

    if (this.kills >= 10) {
      void this.finishGame();
    }
  }

  handlePlayerDamage(
    playerObject: Phaser.GameObjects.GameObject,
    enemyObject: Phaser.GameObjects.GameObject
  ) {
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active || this.isFinishing) return;

    enemy.destroy();

    this.health = Math.max(0, this.health - 10);

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'PLAYER_HIT',
          damage: 10
        }
      })
    );

    if (this.health <= 0) {
      this.failMission();
    }
  }

  async finishGame() {
    if (this.isFinishing) return;
    this.isFinishing = true;

    this.spawnTimer?.remove(false);
    this.enemies.clear(true, true);

    try {
      await apiClient.post('/api/game/complete', {
        runId: this.runData.run.id,
        sessionToken: this.runData.sessionToken,
        clientHash: 'validated',
        stats: {
          kills: this.kills,
          damageDealt: this.kills * 40,
          damageTaken: 100 - this.health,
          accuracy: 0.8,
          timeElapsed: 120,
          wavesCleared: 1,
          bossKilled: false
        }
      });

      window.dispatchEvent(
        new CustomEvent('WAR_PIGS_EVENT', {
          detail: {
            type: 'STATE_CHANGE',
            state: 'victory'
          }
        })
      );
    } catch (error) {
      console.error('Failed to complete run:', error);
      this.failMission();
    }
  }

  failMission() {
    if (this.isFinishing) return;
    this.isFinishing = true;

    this.spawnTimer?.remove(false);
    this.enemies?.clear(true, true);

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'STATE_CHANGE',
          state: 'defeat'
        }
      })
    );
  }
      }
