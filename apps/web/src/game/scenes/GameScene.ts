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

type WeaponConfig = {
  projectileKey: string;
  fireRate: number;
  bulletSpeed: number;
  bulletSize: number;
  damage: number;
  projectileLifetime: number;
  spread?: number;
  burst?: number;
};

const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  oink_pistol: {
    projectileKey: 'bullet',
    fireRate: 320,
    bulletSpeed: 620,
    bulletSize: 12,
    damage: 1,
    projectileLifetime: 1000
  },
  sow_machinegun: {
    projectileKey: 'bullet',
    fireRate: 120,
    bulletSpeed: 660,
    bulletSize: 10,
    damage: 1,
    projectileLifetime: 900,
    spread: 0.08
  },
  boar_rifle: {
    projectileKey: 'bullet',
    fireRate: 180,
    bulletSpeed: 720,
    bulletSize: 11,
    damage: 1,
    projectileLifetime: 950,
    spread: 0.03
  },
  tusk_shotgun: {
    projectileKey: 'bullet',
    fireRate: 500,
    bulletSpeed: 580,
    bulletSize: 10,
    damage: 1,
    projectileLifetime: 500,
    burst: 5,
    spread: 0.28
  },
  sniper_swine: {
    projectileKey: 'sniper_bullet',
    fireRate: 900,
    bulletSpeed: 980,
    bulletSize: 14,
    damage: 2,
    projectileLifetime: 1300
  },
  belcha_minigun: {
    projectileKey: 'bullet',
    fireRate: 90,
    bulletSpeed: 760,
    bulletSize: 9,
    damage: 1,
    projectileLifetime: 850,
    spread: 0.12
  },
  plasma_porker: {
    projectileKey: 'plasma_globule',
    fireRate: 420,
    bulletSpeed: 500,
    bulletSize: 16,
    damage: 2,
    projectileLifetime: 1200
  },
  bacon_blaster: {
    projectileKey: 'rocket',
    fireRate: 700,
    bulletSpeed: 520,
    bulletSize: 20,
    damage: 3,
    projectileLifetime: 1100
  }
};

const CHARACTER_STATS: Record<string, { speed: number; maxHealth: number; scale: number }> = {
  grunt_bacon: { speed: 205, maxHealth: 100, scale: 72 },
  iron_tusk: { speed: 155, maxHealth: 160, scale: 84 },
  swift_hoof: { speed: 250, maxHealth: 85, scale: 68 },
  precision_squeal: { speed: 190, maxHealth: 90, scale: 70 },
  blast_ham: { speed: 180, maxHealth: 115, scale: 74 },
  general_goldsnout: { speed: 215, maxHealth: 125, scale: 78 }
};

const ENEMY_POOL = ['wolf_grunt', 'wolf_soldier', 'wolf_heavy', 'cyber_fox'];

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
  playerSpeed = 200;
  killTarget = 10;
  spawnTimer?: Phaser.Time.TimerEvent;
  isFinishing = false;
  runData!: CurrentRunPayload;
  weaponConfig!: WeaponConfig;

  private hudText?: Phaser.GameObjects.Text;
  private missionText?: Phaser.GameObjects.Text;
  private debugText?: Phaser.GameObjects.Text;
  private progressBarFill?: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a1a');
    this.physics.world.setBounds(0, 0, 1600, 1200);
    this.createHud();

    const storedRun = sessionStorage.getItem('currentRun');
    if (!storedRun) {
      console.error('[GameScene] Missing currentRun in sessionStorage');
      this.showFatalMessage('RUN DATA MISSING');
      this.forceDefeat();
      return;
    }

    try {
      this.runData = JSON.parse(storedRun) as CurrentRunPayload;
    } catch (error) {
      console.error('[GameScene] Failed to parse currentRun:', error);
      this.showFatalMessage('RUN DATA INVALID');
      this.forceDefeat();
      return;
    }

    if (!this.runData?.run?.id || !this.runData?.sessionToken) {
      console.error('[GameScene] Incomplete runData:', this.runData);
      this.showFatalMessage('RUN SESSION INVALID');
      this.forceDefeat();
      return;
    }

    const characterStats =
      CHARACTER_STATS[this.runData.run.characterId] ?? CHARACTER_STATS.grunt_bacon;
    this.maxHealth = characterStats.maxHealth;
    this.health = characterStats.maxHealth;
    this.playerSpeed = characterStats.speed;

    this.weaponConfig =
      WEAPON_CONFIGS[this.runData.run.weaponId] ?? WEAPON_CONFIGS.oink_pistol;

    this.createBackground();

    if (!this.createPlayer(characterStats.scale)) return;
    if (!this.createInput()) return;
    if (!this.createGroups()) return;

    this.registerCollisions();

    this.input.on('pointerdown', () => {
      void this.shoot();
    });

    this.spawnTimer = this.time.addEvent({
      delay: 1400,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.updateHud();
    this.emitKillsUpdate();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update() {
    if (!this.player || !this.player.active || this.isFinishing) return;

    this.player.updateMovement(this.cursors, this.wasd, this.playerSpeed);

    const pointerX = this.input.activePointer.worldX;
    const pointerY = this.input.activePointer.worldY;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointerX, pointerY);

    this.player.setData('aimAngle', angle);
    this.player.setFlipX(pointerX < this.player.x);

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const speed = enemy.getData('moveSpeed') ?? 100;
      this.physics.moveToObject(enemy, this.player, speed);

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
    if (now - this.lastShotTime < this.weaponConfig.fireRate) return;
    this.lastShotTime = now;

    const burst = this.weaponConfig.burst ?? 1;
    const spread = this.weaponConfig.spread ?? 0;

    for (let i = 0; i < burst; i += 1) {
      const projectileKey = this.textures.exists(this.weaponConfig.projectileKey)
        ? this.weaponConfig.projectileKey
        : 'bullet';

      const bullet = this.projectiles.get(
        this.player.x,
        this.player.y,
        projectileKey
      ) as Phaser.Physics.Arcade.Image | Phaser.Physics.Arcade.Sprite | null;

      if (!bullet) continue;

      bullet.setTexture(projectileKey);
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setPosition(this.player.x, this.player.y);
      bullet.setDepth(6);
      bullet.setDisplaySize(
        this.weaponConfig.bulletSize,
        projectileKey === 'rocket'
          ? Math.max(10, this.weaponConfig.bulletSize * 0.55)
          : this.weaponConfig.bulletSize
      );

      const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) continue;

      body.enable = true;
      body.reset(this.player.x, this.player.y);
      body.setAllowGravity(false);

      const baseAngle = this.player.getData('aimAngle') || 0;
      const randomSpread = spread > 0 ? Phaser.Math.FloatBetween(-spread, spread) : 0;
      const shotAngle =
        burst > 1
          ? baseAngle + randomSpread + (i - (burst - 1) / 2) * 0.04
          : baseAngle + randomSpread;

      this.physics.velocityFromRotation(
        shotAngle,
        this.weaponConfig.bulletSpeed,
        body.velocity
      );

      bullet.setRotation(shotAngle);
      bullet.setData('damage', this.weaponConfig.damage);
      bullet.setData('projectileKey', projectileKey);

      this.time.delayedCall(this.weaponConfig.projectileLifetime, () => {
        if (!bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        body.stop();
      });
    }
  }

  spawnEnemy() {
    if (this.isFinishing || !this.player?.active) return;

    const enemyKey = this.pickEnemyKey();
    if (!enemyKey || !this.textures.exists(enemyKey)) {
      console.error('[GameScene] Missing enemy texture:', enemyKey);
      this.showFatalMessage('ENEMY ASSET MISSING');
      this.forceDefeat();
      return;
    }

    const edges = [
      { x: Phaser.Math.Between(0, 1600), y: -40 },
      { x: Phaser.Math.Between(0, 1600), y: 1240 },
      { x: -40, y: Phaser.Math.Between(0, 1200) },
      { x: 1640, y: Phaser.Math.Between(0, 1200) }
    ];

    const spawn = Phaser.Utils.Array.GetRandom(edges);
    const enemy = this.enemies.create(spawn.x, spawn.y, enemyKey) as Phaser.Physics.Arcade.Sprite;

    if (!enemy) return;

    const stats = this.getEnemyStats(enemyKey);

    enemy.setDisplaySize(stats.size, stats.size);
    enemy.setDepth(5);
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setCollideWorldBounds(false);
    enemy.setData('hp', stats.hp);
    enemy.setData('moveSpeed', stats.speed);
    enemy.setData('contactDamage', stats.contactDamage);
    enemy.setData('enemyKey', enemyKey);

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

    const hitX = enemy.x;
    const hitY = enemy.y;

    bullet.setActive(false);
    bullet.setVisible(false);

    const bulletBody = bullet.body as Phaser.Physics.Arcade.Body | undefined;
    bulletBody?.stop();

    const damage = bullet.getData('damage') ?? 1;
    const currentHp = enemy.getData('hp') ?? 1;
    const nextHp = currentHp - damage;

    this.createHitEffect(hitX, hitY, bullet.getData('projectileKey') ?? 'bullet');

    if (nextHp > 0) {
      enemy.setData('hp', nextHp);
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(70, () => {
        if (enemy.active) enemy.clearTint();
      });
      this.showFloatingText(hitX, hitY - 20, `-${damage}`, '#ff8a65');
      return;
    }

    enemy.destroy();
    this.kills += 1;
    this.updateHud();
    this.emitKillsUpdate();
    this.showFloatingText(hitX, hitY - 20, '+1', '#ffd166');

    if (this.kills >= this.killTarget) {
      void this.finishGame();
    }
  }

  handlePlayerDamage(
    _playerObject: Phaser.GameObjects.GameObject,
    enemyObject: Phaser.GameObjects.GameObject
  ) {
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active || this.isFinishing) return;

    const damage = enemy.getData('contactDamage') ?? 10;
    enemy.destroy();

    this.health = Math.max(0, this.health - damage);
    this.updateHud();
    this.cameras.main.shake(120, 0.01);

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'PLAYER_HIT',
          damage
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

    if (this.missionText) {
      this.missionText.setText('MISSION COMPLETE');
      this.missionText.setVisible(true);
    }

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
      console.error('[GameScene] Failed to complete run:', error);
      this.forceDefeat();
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

  private forceDefeat() {
    this.spawnTimer?.remove(false);
    this.enemies?.clear(true, true);

    if (this.missionText) {
      this.missionText.setText('MISSION FAILED');
      this.missionText.setVisible(true);
    }

    this.isFinishing = true;

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'STATE_CHANGE',
          state: 'defeat'
        }
      })
    );
  }

  private createBackground() {
    if (this.textures.exists('background')) {
      const background = this.add.image(800, 600, 'background');
      background.setDisplaySize(1600, 1200);
      background.setScrollFactor(1);
      background.setDepth(0);
      return;
    }

    console.error('[GameScene] Missing background texture');
    this.add.rectangle(800, 600, 1600, 1200, 0x1a1a1a).setOrigin(0.5).setDepth(0);
  }

  private createPlayer(scale: number): boolean {
    const characterKey = this.textures.exists(this.runData.run.characterId)
      ? this.runData.run.characterId
      : this.textures.exists('player')
        ? 'player'
        : null;

    if (!characterKey) {
      console.error('[GameScene] Missing player texture');
      this.showFatalMessage('PLAYER ASSET MISSING');
      this.forceDefeat();
      return false;
    }

    this.player = new PigPlayer(this, 800, 600, characterKey);
    this.player.setDisplaySize(scale, scale);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, 1600, 1200);
    this.cameras.main.setZoom(1);

    return true;
  }

  private createInput(): boolean {
    if (!this.input.keyboard) {
      console.error('[GameScene] Keyboard input unavailable');
      this.showFatalMessage('KEYBOARD INPUT UNAVAILABLE');
      this.forceDefeat();
      return false;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as typeof this.wasd;

    return true;
  }

  private createGroups(): boolean {
    const projectileKey = this.textures.exists(this.weaponConfig.projectileKey)
      ? this.weaponConfig.projectileKey
      : this.textures.exists('bullet')
        ? 'bullet'
        : '__DEFAULT';

    if (projectileKey === '__DEFAULT') {
      console.error('[GameScene] Missing bullet texture');
      this.showFatalMessage('BULLET ASSET MISSING');
      this.forceDefeat();
      return false;
    }

    this.projectiles = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: projectileKey,
      maxSize: 120,
      runChildUpdate: false
    });

    this.enemies = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 60
    });

    return true;
  }

  private registerCollisions() {
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

  private pickEnemyKey(): string {
    const available = ENEMY_POOL.filter((key) => this.textures.exists(key));
    if (available.length === 0) return 'enemy';

    if (this.kills >= 8 && available.includes('wolf_heavy')) return 'wolf_heavy';
    if (this.kills >= 5 && available.includes('cyber_fox') && Math.random() < 0.35) {
      return 'cyber_fox';
    }
    if (this.kills >= 3 && available.includes('wolf_soldier') && Math.random() < 0.5) {
      return 'wolf_soldier';
    }

    return available[0];
  }

  private getEnemyStats(enemyKey: string) {
    switch (enemyKey) {
      case 'wolf_heavy':
        return { hp: 3, speed: 70, size: 78, contactDamage: 15 };
      case 'cyber_fox':
        return { hp: 1, speed: 150, size: 58, contactDamage: 12 };
      case 'wolf_soldier':
        return { hp: 2, speed: 95, size: 66, contactDamage: 10 };
      default:
        return { hp: 1, speed: 100, size: 64, contactDamage: 10 };
    }
  }

  private createHud() {
    this.hudText = this.add
      .text(16, 16, '', {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { left: 10, right: 10, top: 8, bottom: 8 }
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.missionText = this.add
      .text(this.scale.width / 2, 70, '', {
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

    this.debugText = this.add
      .text(16, 88, 'Scene live', {
        fontSize: '14px',
        color: '#bbbbbb',
        backgroundColor: '#00000088',
        padding: { left: 8, right: 8, top: 6, bottom: 6 }
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.add
      .rectangle(16, 122, 220, 16, 0x222222)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.progressBarFill = this.add
      .rectangle(16, 122, 0, 16, 0xff6b35)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1001);
  }

  private updateHud() {
    if (!this.hudText) return;

    this.hudText.setText([
      `Health: ${this.health}/${this.maxHealth}`,
      `Kills: ${this.kills}/${this.killTarget}`,
      `Weapon: ${this.runData?.run?.weaponId || 'default'}`
    ]);

    if (this.progressBarFill) {
      const progress = Phaser.Math.Clamp(this.kills / this.killTarget, 0, 1);
      this.progressBarFill.width = 220 * progress;
    }
  }

  private emitKillsUpdate() {
    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'KILLS_UPDATE',
          kills: this.kills
        }
      })
    );
  }

  private showFatalMessage(message: string) {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, message, {
        fontSize: '28px',
        color: '#ff4d4f',
        backgroundColor: '#000000cc',
        padding: { left: 14, right: 14, top: 10, bottom: 10 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
  }

  private showFloatingText(x: number, y: number, value: string, color = '#ffd166') {
    const text = this.add
      .text(x, y, value, {
        fontSize: '18px',
        color,
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(900);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 500,
      onComplete: () => text.destroy()
    });
  }

  private createHitEffect(x: number, y: number, projectileKey: string) {
    const color =
      projectileKey === 'plasma_globule'
        ? 0x66e0ff
        : projectileKey === 'rocket'
          ? 0xff8844
          : projectileKey === 'sniper_bullet'
            ? 0xffffff
            : 0xffc857;

    const circle = this.add.circle(x, y, 10, color, 0.85).setDepth(800);

    this.tweens.add({
      targets: circle,
      radius: projectileKey === 'rocket' ? 30 : 18,
      alpha: 0,
      duration: projectileKey === 'rocket' ? 220 : 120,
      onComplete: () => circle.destroy()
    });

    if (projectileKey === 'rocket' && this.textures.exists('explosion')) {
      const explosion = this.add.image(x, y, 'explosion').setDepth(801);
      explosion.setDisplaySize(26, 26);
      this.tweens.add({
        targets: explosion,
        scaleX: 2.2,
        scaleY: 2.2,
        alpha: 0,
        duration: 240,
        onComplete: () => explosion.destroy()
      });
    }
  }

  private cleanup() {
    this.input.off('pointerdown');
    this.spawnTimer?.remove(false);
  }
                                       }
