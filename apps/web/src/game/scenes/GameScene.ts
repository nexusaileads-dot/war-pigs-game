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
  maxHealth = 100;
  spawnTimer?: Phaser.Time.TimerEvent;
  isFinishing = false;
  runData!: CurrentRunPayload;

  private hudText!: Phaser.GameObjects.Text;
  private missionText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a1a');

    const storedRun = sessionStorage.getItem('currentRun');
    if (!storedRun) {
      console.error('[GameScene] Missing currentRun in sessionStorage');
      this.showFatalMessage('RUN DATA MISSING');
      this.failMission();
      return;
    }

    try {
      this.runData = JSON.parse(storedRun) as CurrentRunPayload;
    } catch (error) {
      console.error('[GameScene] Failed to parse currentRun:', error);
      this.showFatalMessage('RUN DATA INVALID');
      this.failMission();
      return;
    }

    if (!this.runData?.run?.id || !this.runData?.sessionToken) {
      console.error('[GameScene] Incomplete runData:', this.runData);
      this.showFatalMessage('RUN SESSION INVALID');
      this.failMission();
      return;
    }

    this.physics.world.setBounds(0, 0, 1600, 1200);

    const background = this.add.image(800, 600, 'background');
    background.setDisplaySize(1600, 1200);
    background.setScrollFactor(1);

    const characterKey = this.textures.exists(this.runData.run.characterId)
      ? this.runData.run.characterId
      : 'player';

    this.player = new PigPlayer(this, 800, 600, characterKey);
    this.player.setDisplaySize(72, 72);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, 1600, 1200);
    this.cameras.main.setZoom(1);

    if (!this.input.keyboard) {
      console.error('[GameScene] Keyboard input unavailable');
      this.showFatalMessage('KEYBOARD INPUT UNAVAILABLE');
      this.failMission();
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as typeof this.wasd;

    this.projectiles = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: 'bullet',
      maxSize: 80,
      runChildUpdate: false
    });

    this.enemies = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 40
    });

    this.createHud();
    this.updateHud();

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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
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

    if (this.debugText) {
      this.debugText.setText(
        `Enemies: ${this.enemies.countActive(true)} | Bullets: ${this.projectiles.countActive(true)}`
      );
    }
  }

  async shoot() {
    if (this.isFinishing || !this.player?.active) return;

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
    bullet.setDepth(6);
    bullet.setDisplaySize(12, 12);

    const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    body.enable = true;
    body.reset(this.player.x, this.player.y);
    body.setAllowGravity(false);

    const aimAngle = this.player.getData('aimAngle') || 0;
    this.physics.velocityFromRotation(aimAngle, 600, body.velocity);

    this.time.delayedCall(1000, () => {
      if (!bullet.active) return;
      bullet.setActive(false);
      bullet.setVisible(false);
      body.stop();
    });
  }

  spawnEnemy() {
    if (this.isFinishing || !this.player?.active) return;

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
    enemy.setDepth(5);
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setCollideWorldBounds(false);

    const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setAllowGravity(false);
      body.setImmovable(false);
    }
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
    this.updateHud();

    this.showFloatingText(enemy.x, enemy.y - 20, '+1');

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
    this.updateHud();
    this.cameras.main.shake(120, 0.01);

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

    this.missionText.setText('MISSION COMPLETE');
    this.missionText.setVisible(true);

    try {
      await apiClient.post('/api/game/complete', {
        runId: this.runData.run.id,
        sessionToken: this.runData.sessionToken,
        clientHash: 'validated',
        stats: {
          kills: this.kills,
          damageDealt: this.kills * 40,
          damageTaken: this.maxHealth - this.health,
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

    if (this.missionText) {
      this.missionText.setText('MISSION FAILED');
      this.missionText.setVisible(true);
    }

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'STATE_CHANGE',
          state: 'defeat'
        }
      })
    );
  }

  private createHud() {
    this.hudText = this.add.text(16, 16, '', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { left: 10, right: 10, top: 8, bottom: 8 }
    })
      .setScrollFactor(0)
      .setDepth(1000);

    this.missionText = this.add.text(this.scale.width / 2, 70, '', {
      fontSize: '28px',
      color: '#ffdd57',
      fontStyle: 'bold',
      backgroundColor: '#000000aa',
      padding: { left: 14, right: 14, top: 10, bottom: 10 }
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    this.debugText = this.add.text(16, 88, 'Scene live', {
      fontSize: '14px',
      color: '#bbbbbb',
      backgroundColor: '#00000088',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    })
      .setScrollFactor(0)
      .setDepth(1000);
  }

  private updateHud() {
    if (!this.hudText) return;

    this.hudText.setText([
      `Health: ${this.health}/${this.maxHealth}`,
      `Kills: ${this.kills}/10`,
      `Weapon: ${this.runData?.run?.weaponId || 'default'}`
    ]);
  }

  private showFatalMessage(message: string) {
    this.add.text(this.scale.width / 2, this.scale.height / 2, message, {
      fontSize: '28px',
      color: '#ff4d4f',
      backgroundColor: '#000000cc',
      padding: { left: 14, right: 14, top: 10, bottom: 10 }
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
  }

  private showFloatingText(x: number, y: number, value: string) {
    const text = this.add.text(x, y, value, {
      fontSize: '18px',
      color: '#ffd166',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 500,
      onComplete: () => text.destroy()
    });
  }

  private cleanup() {
    this.input.off('pointerdown');
    this.spawnTimer?.remove(false);
  }
  }
