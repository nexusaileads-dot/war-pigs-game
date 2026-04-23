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
  pierce?: number;
};

type CharacterStats = {
  speed: number;
  maxHealth: number;
  scale: number;
};

type EnemyStats = {
  hp: number;
  speed: number;
  size: number;
  contactDamage: number;
};

type BossConfig = {
  key: string;
  name: string;
  hp: number;
  speed: number;
  size: number;
  contactDamage: number;
};

const WORLD_WIDTH = 4200;
const WORLD_HEIGHT = 2400;
const KILL_TARGET = 10;

const JOYSTICK_MARGIN = 108;
const JOYSTICK_RADIUS = 64;
const JOYSTICK_THUMB_RADIUS = 28;
const JOYSTICK_MAX_DISTANCE = 52;

const FIRE_BUTTON_MARGIN_X = 110;
const FIRE_BUTTON_MARGIN_Y = 110;
const FIRE_BUTTON_RADIUS = 58;

const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  oink_pistol: {
    projectileKey: 'bullet',
    fireRate: 320,
    bulletSpeed: 760,
    bulletSize: 20,
    damage: 1,
    projectileLifetime: 1200
  },
  sow_machinegun: {
    projectileKey: 'bullet',
    fireRate: 120,
    bulletSpeed: 820,
    bulletSize: 16,
    damage: 1,
    projectileLifetime: 1000,
    spread: 0.08
  },
  boar_rifle: {
    projectileKey: 'bullet',
    fireRate: 180,
    bulletSpeed: 900,
    bulletSize: 18,
    damage: 1,
    projectileLifetime: 1100,
    spread: 0.03
  },
  tusk_shotgun: {
    projectileKey: 'bullet',
    fireRate: 500,
    bulletSpeed: 700,
    bulletSize: 16,
    damage: 1,
    projectileLifetime: 650,
    burst: 5,
    spread: 0.28
  },
  sniper_swine: {
    projectileKey: 'sniper_bullet',
    fireRate: 900,
    bulletSpeed: 1200,
    bulletSize: 24,
    damage: 2,
    projectileLifetime: 1400,
    pierce: 1
  },
  belcha_minigun: {
    projectileKey: 'bullet',
    fireRate: 90,
    bulletSpeed: 860,
    bulletSize: 14,
    damage: 1,
    projectileLifetime: 950,
    spread: 0.12
  },
  plasma_porker: {
    projectileKey: 'plasma_globule',
    fireRate: 420,
    bulletSpeed: 640,
    bulletSize: 28,
    damage: 2,
    projectileLifetime: 1300
  },
  bacon_blaster: {
    projectileKey: 'rocket',
    fireRate: 700,
    bulletSpeed: 620,
    bulletSize: 30,
    damage: 3,
    projectileLifetime: 1200
  }
};

const CHARACTER_STATS: Record<string, CharacterStats> = {
  grunt_bacon: { speed: 240, maxHealth: 100, scale: 72 },
  iron_tusk: { speed: 180, maxHealth: 160, scale: 84 },
  swift_hoof: { speed: 300, maxHealth: 85, scale: 68 },
  precision_squeal: { speed: 220, maxHealth: 90, scale: 70 },
  blast_ham: { speed: 210, maxHealth: 115, scale: 74 },
  general_goldsnout: { speed: 255, maxHealth: 125, scale: 78 }
};

const ENEMY_POOL = ['wolf_grunt', 'wolf_soldier', 'wolf_heavy', 'cyber_fox'];

const BOSS_BY_LEVEL: Record<string, BossConfig> = {
  '4': {
    key: 'alpha_wolfgang',
    name: 'WOLFGANG THE RAVAGER',
    hp: 18,
    speed: 90,
    size: 132,
    contactDamage: 20
  }
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
  abilityKey?: Phaser.Input.Keyboard.Key;
  projectiles!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;

  lastShotTime = 0;
  kills = 0;
  health = 100;
  maxHealth = 100;
  playerSpeed = 200;
  killTarget = KILL_TARGET;
  spawnTimer?: Phaser.Time.TimerEvent;
  isFinishing = false;
  runData!: CurrentRunPayload;
  weaponConfig!: WeaponConfig;

  private hudText?: Phaser.GameObjects.Text;
  private missionText?: Phaser.GameObjects.Text;
  private debugText?: Phaser.GameObjects.Text;
  private progressBarFill?: Phaser.GameObjects.Rectangle;

  private currentCharacterId = 'grunt_bacon';
  private abilityCooldownMs = 6000;
  private lastAbilityUseTime = -99999;
  private abilityLabel = 'TACTICAL BURST';
  private abilityActiveUntil = 0;
  private bossSpawned = false;
  private bossDefeated = false;

  private isTouchDevice = false;
  private movePointerId: number | null = null;
  private aimPointerId: number | null = null;
  private moveVector = new Phaser.Math.Vector2(0, 0);
  private aimWorldPoint = new Phaser.Math.Vector2(0, 0);
  private wantsToShoot = false;

  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;
  private fireButton?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a1a');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
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

    this.currentCharacterId = this.runData.run.characterId;
    this.configureCharacterAbility();

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
    this.setupPointerControls();
    this.createTouchControls();
    this.handleResize(this.scale.gameSize);

    this.spawnTimer = this.time.addEvent({
      delay: 1400,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.aimWorldPoint.set(this.player.x + 200, this.player.y);
    this.updateHud();
    this.emitKillsUpdate();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update() {
    if (!this.player || !this.player.active || this.isFinishing) return;

    if (this.abilityKey && Phaser.Input.Keyboard.JustDown(this.abilityKey)) {
      this.useCharacterAbility();
    }

    this.updateAbilityState();

    if (this.isTouchDevice) {
      this.updateTouchMovement();
      if (this.wantsToShoot) {
        void this.shoot();
      }
    } else {
      this.player.updateMovement(this.cursors, this.wasd, this.playerSpeed);
    }

    const pointerX = this.isTouchDevice ? this.aimWorldPoint.x : this.input.activePointer.worldX;
    const pointerY = this.isTouchDevice ? this.aimWorldPoint.y : this.input.activePointer.worldY;

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
      const remainingCd = Math.max(
        0,
        Math.ceil((this.abilityCooldownMs - (this.time.now - this.lastAbilityUseTime)) / 1000)
      );
      this.debugText.setText(
        `Enemies: ${this.enemies.countActive(true)} | Bullets: ${this.projectiles.countActive(true)} | Ability: ${remainingCd}s | Touch: ${this.isTouchDevice ? 'ON' : 'OFF'}`
      );
    }

    this.updateHud();
  }

  async shoot() {
    if (this.isFinishing || !this.player?.active) return;

    const effectiveFireRate = this.getEffectiveFireRate();
    const now = this.time.now;
    if (now - this.lastShotTime < effectiveFireRate) return;
    this.lastShotTime = now;

    const burst = this.weaponConfig.burst ?? 1;
    const spread = this.getEffectiveSpread();
    const damageBoost = this.getDamageBonus();
    const speedBoost = this.getProjectileSpeedBonus();
    const extraPierce = this.getExtraPierce();

    const baseAngle = this.player.getData('aimAngle') || 0;
    const muzzle = this.getMuzzlePosition(baseAngle);

    for (let i = 0; i < burst; i += 1) {
      const projectileKey = this.textures.exists(this.weaponConfig.projectileKey)
        ? this.weaponConfig.projectileKey
        : 'bullet';

      const bullet = this.projectiles.get(
        muzzle.x,
        muzzle.y,
        projectileKey
      ) as Phaser.Physics.Arcade.Image | Phaser.Physics.Arcade.Sprite | null;

      if (!bullet) continue;

      bullet.setTexture(projectileKey);
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setAlpha(1);
      bullet.setPosition(muzzle.x, muzzle.y);
      bullet.setDepth(50);
      bullet.clearTint();
      bullet.setDisplaySize(
        this.weaponConfig.bulletSize,
        projectileKey === 'rocket'
          ? Math.max(14, this.weaponConfig.bulletSize * 0.6)
          : this.weaponConfig.bulletSize
      );

      const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) continue;

      body.enable = true;
      body.reset(muzzle.x, muzzle.y);
      body.setAllowGravity(false);

      const randomSpread = spread > 0 ? Phaser.Math.FloatBetween(-spread, spread) : 0;
      const shotAngle =
        burst > 1
          ? baseAngle + randomSpread + (i - (burst - 1) / 2) * 0.04
          : baseAngle + randomSpread;

      this.physics.velocityFromRotation(
        shotAngle,
        this.weaponConfig.bulletSpeed + speedBoost,
        body.velocity
      );

      bullet.setRotation(shotAngle);
      bullet.setData('damage', this.weaponConfig.damage + damageBoost);
      bullet.setData('projectileKey', projectileKey);
      bullet.setData('pierceLeft', (this.weaponConfig.pierce ?? 0) + extraPierce);

      if (projectileKey === 'plasma_globule') {
        bullet.setTint(0x66e0ff);
      } else if (projectileKey === 'rocket') {
        bullet.setTint(0xffaa33);
      } else if (projectileKey === 'sniper_bullet') {
        bullet.setTint(0xffffff);
      } else {
        bullet.setTint(0xffe066);
      }

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

    const shouldSpawnBoss =
      !this.bossSpawned &&
      !this.bossDefeated &&
      Boolean(BOSS_BY_LEVEL[this.runData.run.levelId]) &&
      this.kills >= Math.max(4, this.killTarget - 4);

    if (shouldSpawnBoss) {
      this.spawnBoss();
      return;
    }

    const enemyKey = this.pickEnemyKey();
    if (!enemyKey || !this.textures.exists(enemyKey)) {
      console.error('[GameScene] Missing enemy texture:', enemyKey);
      this.showFatalMessage('ENEMY ASSET MISSING');
      this.forceDefeat();
      return;
    }

    const edges = [
      { x: Phaser.Math.Between(0, WORLD_WIDTH), y: -40 },
      { x: Phaser.Math.Between(0, WORLD_WIDTH), y: WORLD_HEIGHT + 40 },
      { x: -40, y: Phaser.Math.Between(0, WORLD_HEIGHT) },
      { x: WORLD_WIDTH + 40, y: Phaser.Math.Between(0, WORLD_HEIGHT) }
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
    enemy.setData('isBoss', false);
    enemy.setData('rewardKills', 1);

    const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setAllowGravity(false);
      body.setImmovable(false);
    }
  }

  private spawnBoss() {
    const boss = BOSS_BY_LEVEL[this.runData.run.levelId];
    if (!boss) return;

    if (!this.textures.exists(boss.key)) {
      console.error('[GameScene] Missing boss texture:', boss.key);
      this.showFatalMessage('BOSS ASSET MISSING');
      this.forceDefeat();
      return;
    }

    this.bossSpawned = true;

    const spawn = { x: WORLD_WIDTH / 2, y: -120 };
    const enemy = this.enemies.create(spawn.x, spawn.y, boss.key) as Phaser.Physics.Arcade.Sprite;

    if (!enemy) return;

    enemy.setDisplaySize(boss.size, boss.size);
    enemy.setDepth(7);
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setTint(0xffe0a3);
    enemy.setData('hp', boss.hp);
    enemy.setData('moveSpeed', boss.speed);
    enemy.setData('contactDamage', boss.contactDamage);
    enemy.setData('enemyKey', boss.key);
    enemy.setData('isBoss', true);
    enemy.setData('rewardKills', 4);
    enemy.setData('bossName', boss.name);

    const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setAllowGravity(false);
    }

    if (this.missionText) {
      this.missionText.setText(boss.name);
      this.missionText.setVisible(true);
      this.time.delayedCall(1800, () => {
        if (!this.isFinishing && this.missionText) {
          this.missionText.setVisible(false);
        }
      });
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
    const projectileKey = bullet.getData('projectileKey') ?? 'bullet';

    const damage = bullet.getData('damage') ?? 1;
    const currentHp = enemy.getData('hp') ?? 1;
    const nextHp = currentHp - damage;

    const pierceLeft = bullet.getData('pierceLeft') ?? 0;
    if (pierceLeft > 0 && projectileKey !== 'rocket') {
      bullet.setData('pierceLeft', pierceLeft - 1);
    } else {
      bullet.setActive(false);
      bullet.setVisible(false);
      const bulletBody = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      bulletBody?.stop();
    }

    this.createHitEffect(hitX, hitY, projectileKey);

    if (projectileKey === 'rocket') {
      this.applySplashDamage(hitX, hitY, 85, damage);
    }

    if (!enemy.active) return;

    if (nextHp > 0) {
      enemy.setData('hp', nextHp);
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(70, () => {
        if (enemy.active) enemy.clearTint();
      });
      this.showFloatingText(hitX, hitY - 20, `-${damage}`, '#ff8a65');
      return;
    }

    const rewardKills = enemy.getData('rewardKills') ?? 1;
    const isBoss = enemy.getData('isBoss') === true;

    enemy.destroy();

    this.kills += rewardKills;
    if (isBoss) this.bossDefeated = true;

    this.updateHud();
    this.emitKillsUpdate();
    this.showFloatingText(
      hitX,
      hitY - 20,
      isBoss ? '+BOSS' : `+${rewardKills}`,
      isBoss ? '#ffe082' : '#ffd166'
    );

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
          bossKilled: this.bossDefeated
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
      const background = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'background');
      background.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
      background.setScrollFactor(1);
      background.setDepth(0);
      return;
    }

    console.error('[GameScene] Missing background texture');
    this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x1a1a1a)
      .setOrigin(0.5)
      .setDepth(0);
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

    this.player = new PigPlayer(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, characterKey);
    this.player.setDisplaySize(scale, scale);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.setMoveSpeed(this.playerSpeed);

    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setRoundPixels(false);

    const screenW = this.scale.width || 1600;
    const screenH = this.scale.height || 900;
    const isSmallScreen = screenW < 900 || screenH < 600;

    this.cameras.main.setZoom(isSmallScreen ? 1.02 : 1.12);

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

    this.abilityKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

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

  private setupPointerControls() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isTouchDevice =
        this.input.pointer1.isDown || this.input.pointer2.isDown || pointer.wasTouch;

      const fireZoneStartX = this.scale.width * 0.58;
      const isLeftSide = pointer.x < this.scale.width * 0.42;
      const isRightSide = pointer.x > fireZoneStartX;

      if (pointer.wasTouch && isLeftSide && this.movePointerId === null) {
        this.movePointerId = pointer.id;
        this.updateMoveVectorFromPointer(pointer);
        this.updateJoystickVisual(pointer.x, pointer.y);
        return;
      }

      if (pointer.wasTouch && isRightSide) {
        this.aimPointerId = pointer.id;
        this.wantsToShoot = true;
        this.setAimFromPointer(pointer);
        this.showFireButtonPressed(true);
        return;
      }

      if (!pointer.wasTouch) {
        void this.shoot();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.movePointerId === pointer.id) {
        this.updateMoveVectorFromPointer(pointer);
        this.updateJoystickVisual(pointer.x, pointer.y);
      }

      if (this.aimPointerId === pointer.id) {
        this.setAimFromPointer(pointer);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.movePointerId === pointer.id) {
        this.movePointerId = null;
        this.moveVector.set(0, 0);
        this.player.stopMovement();
        this.resetJoystickVisual();
      }

      if (this.aimPointerId === pointer.id) {
        this.aimPointerId = null;
        this.wantsToShoot = false;
        this.showFireButtonPressed(false);
      }
    });
  }

  private createTouchControls() {
    this.joystickBase = this.add
      .circle(
        JOYSTICK_MARGIN,
        this.scale.height - JOYSTICK_MARGIN,
        JOYSTICK_RADIUS,
        0x000000,
        0.34
      )
      .setStrokeStyle(3, 0xffffff, 0.25)
      .setScrollFactor(0)
      .setDepth(1200)
      .setVisible(true);

    this.joystickThumb = this.add
      .circle(
        JOYSTICK_MARGIN,
        this.scale.height - JOYSTICK_MARGIN,
        JOYSTICK_THUMB_RADIUS,
        0xffffff,
        0.45
      )
      .setScrollFactor(0)
      .setDepth(1201)
      .setVisible(true);

    const fireBg = this.add
      .circle(
        this.scale.width - FIRE_BUTTON_MARGIN_X,
        this.scale.height - FIRE_BUTTON_MARGIN_Y,
        FIRE_BUTTON_RADIUS,
        0x8b0000,
        0.42
      )
      .setStrokeStyle(3, 0xffd27a, 0.55);

    const fireCore = this.add.circle(
      this.scale.width - FIRE_BUTTON_MARGIN_X,
      this.scale.height - FIRE_BUTTON_MARGIN_Y,
      28,
      0xff6b35,
      0.9
    );

    const fireLabel = this.add
      .text(this.scale.width - FIRE_BUTTON_MARGIN_X, this.scale.height - FIRE_BUTTON_MARGIN_Y, 'FIRE', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.fireButton = this.add
      .container(0, 0, [fireBg, fireCore, fireLabel])
      .setScrollFactor(0)
      .setDepth(1200)
      .setVisible(true)
      .setAlpha(0.92);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    if (this.missionText) {
      this.missionText.setPosition(width / 2, 70);
    }

    if (this.joystickBase) {
      this.joystickBase.setPosition(JOYSTICK_MARGIN, height - JOYSTICK_MARGIN);
    }

    if (this.joystickThumb) {
      this.joystickThumb.setPosition(JOYSTICK_MARGIN, height - JOYSTICK_MARGIN);
    }

    if (this.fireButton) {
      this.fireButton.setPosition(width - FIRE_BUTTON_MARGIN_X, height - FIRE_BUTTON_MARGIN_Y);
    }
  }

  private updateTouchMovement() {
    this.player.setMoveVector(this.moveVector.x, this.moveVector.y, this.playerSpeed);
  }

  private updateMoveVectorFromPointer(pointer: Phaser.Input.Pointer) {
    const baseX = JOYSTICK_MARGIN;
    const baseY = this.scale.height - JOYSTICK_MARGIN;
    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 0.0001) {
      this.moveVector.set(0, 0);
      this.player.stopMovement();
      return;
    }

    const clampedDistance = Math.min(distance, JOYSTICK_MAX_DISTANCE);
    this.moveVector.set(
      (dx / distance) * (clampedDistance / JOYSTICK_MAX_DISTANCE),
      (dy / distance) * (clampedDistance / JOYSTICK_MAX_DISTANCE)
    );
  }

  private updateJoystickVisual(pointerX: number, pointerY: number) {
    if (!this.joystickBase || !this.joystickThumb) return;

    const baseX = JOYSTICK_MARGIN;
    const baseY = this.scale.height - JOYSTICK_MARGIN;
    const dx = pointerX - baseX;
    const dy = pointerY - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let thumbX = baseX;
    let thumbY = baseY;

    if (distance > 0) {
      const clamped = Math.min(distance, JOYSTICK_MAX_DISTANCE);
      thumbX = baseX + (dx / distance) * clamped;
      thumbY = baseY + (dy / distance) * clamped;
    }

    this.joystickThumb.setPosition(thumbX, thumbY);
  }

  private resetJoystickVisual() {
    if (!this.joystickBase || !this.joystickThumb) return;
    this.joystickThumb.setPosition(JOYSTICK_MARGIN, this.scale.height - JOYSTICK_MARGIN);
  }

  private setAimFromPointer(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.aimWorldPoint.set(worldPoint.x, worldPoint.y);
  }

  private showFireButtonPressed(isPressed: boolean) {
    if (!this.fireButton) return;
    this.fireButton.setScale(isPressed ? 0.92 : 1);
    this.fireButton.setAlpha(isPressed ? 1 : 0.92);
  }

  private getMuzzlePosition(angle: number) {
    const muzzleDistance = 34;

    return {
      x: this.player.x + Math.cos(angle) * muzzleDistance,
      y: this.player.y + Math.sin(angle) * muzzleDistance
    };
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

    return available.includes('wolf_grunt') ? 'wolf_grunt' : available[0];
  }

  private getEnemyStats(enemyKey: string): EnemyStats {
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

    const cooldownLeft = Math.max(
      0,
      Math.ceil((this.abilityCooldownMs - (this.time.now - this.lastAbilityUseTime)) / 1000)
    );
    const abilityReady = this.time.now - this.lastAbilityUseTime >= this.abilityCooldownMs;
    const abilityStatus = abilityReady ? 'READY' : `${cooldownLeft}s`;

    this.hudText.setText([
      `Health: ${this.health}/${this.maxHealth}`,
      `Kills: ${this.kills}/${this.killTarget}`,
      `Weapon: ${this.runData?.run?.weaponId || 'default'}`,
      `Ability (${this.abilityLabel}): ${abilityStatus}`
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

    const circle = this.add.circle(x, y, 12, color, 0.95).setDepth(800);

    this.tweens.add({
      targets: circle,
      radius: projectileKey === 'rocket' ? 36 : 22,
      alpha: 0,
      duration: projectileKey === 'rocket' ? 220 : 120,
      onComplete: () => circle.destroy()
    });

    if (projectileKey === 'rocket' && this.textures.exists('explosion')) {
      const explosion = this.add.image(x, y, 'explosion').setDepth(801);
      explosion.setDisplaySize(44, 44);
      this.tweens.add({
        targets: explosion,
        scaleX: 2.4,
        scaleY: 2.4,
        alpha: 0,
        duration: 240,
        onComplete: () => explosion.destroy()
      });
    }
  }

  private configureCharacterAbility() {
    switch (this.currentCharacterId) {
      case 'iron_tusk':
        this.abilityLabel = 'IRON SLAM';
        this.abilityCooldownMs = 7000;
        break;
      case 'swift_hoof':
        this.abilityLabel = 'SCOUT DASH';
        this.abilityCooldownMs = 4500;
        break;
      case 'precision_squeal':
        this.abilityLabel = 'FOCUS MODE';
        this.abilityCooldownMs = 7000;
        break;
      case 'blast_ham':
        this.abilityLabel = 'DEMOLITION BURST';
        this.abilityCooldownMs = 6500;
        break;
      case 'general_goldsnout':
        this.abilityLabel = 'RALLY ORDER';
        this.abilityCooldownMs = 8000;
        break;
      default:
        this.abilityLabel = 'BATTLE STIM';
        this.abilityCooldownMs = 6000;
        break;
    }
  }

  private useCharacterAbility() {
    if (this.time.now - this.lastAbilityUseTime < this.abilityCooldownMs) return;
    if (!this.player?.active) return;

    this.lastAbilityUseTime = this.time.now;

    switch (this.currentCharacterId) {
      case 'iron_tusk':
        this.useIronSlam();
        break;
      case 'swift_hoof':
        this.useScoutDash();
        break;
      case 'precision_squeal':
        this.useFocusMode();
        break;
      case 'blast_ham':
        this.useDemolitionBurst();
        break;
      case 'general_goldsnout':
        this.useRallyOrder();
        break;
      default:
        this.useBattleStim();
        break;
    }

    this.updateHud();
  }

  private useIronSlam() {
    const radius = 150;

    this.cameras.main.shake(140, 0.012);
    this.createAreaPulse(this.player.x, this.player.y, radius, 0xb0bec5);

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y
      );

      if (distance <= radius) {
        const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
        if (body) {
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
          this.physics.velocityFromRotation(angle, 420, body.velocity);
        }

        const nextHp = (enemy.getData('hp') ?? 1) - 2;
        if (nextHp <= 0) {
          enemy.destroy();
          this.kills += enemy.getData('rewardKills') ?? 1;
          this.emitKillsUpdate();
        } else {
          enemy.setData('hp', nextHp);
        }
      }
    });

    this.showFloatingText(this.player.x, this.player.y - 60, 'IRON SLAM', '#cfd8dc');
  }

  private useScoutDash() {
    const aimAngle = this.player.getData('aimAngle') || 0;
    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    this.physics.velocityFromRotation(aimAngle, 640, body.velocity);
    this.createAreaPulse(this.player.x, this.player.y, 60, 0x81c784);
    this.showFloatingText(this.player.x, this.player.y - 50, 'DASH', '#81c784');
  }

  private useFocusMode() {
    this.abilityActiveUntil = this.time.now + 3500;
    this.player.setTint(0xd1c4e9);
    this.showFloatingText(this.player.x, this.player.y - 50, 'FOCUS', '#d1c4e9');
  }

  private useDemolitionBurst() {
    this.createAreaPulse(this.player.x, this.player.y, 85, 0xffb74d);

    const angles = [-0.6, -0.3, 0, 0.3, 0.6];
    angles.forEach((offset) => {
      const baseAngle = this.player.getData('aimAngle') || 0;
      const shotAngle = baseAngle + offset;
      const muzzle = this.getMuzzlePosition(shotAngle);

      const bullet = this.projectiles.get(muzzle.x, muzzle.y, 'rocket') as
        | Phaser.Physics.Arcade.Image
        | Phaser.Physics.Arcade.Sprite
        | null;

      if (!bullet) return;

      bullet.setTexture(this.textures.exists('rocket') ? 'rocket' : 'bullet');
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setAlpha(1);
      bullet.setPosition(muzzle.x, muzzle.y);
      bullet.setDepth(50);
      bullet.setDisplaySize(24, 14);
      bullet.setTint(0xffaa33);
      bullet.setData('damage', 2);
      bullet.setData('projectileKey', 'rocket');
      bullet.setData('pierceLeft', 0);

      const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) return;

      body.enable = true;
      body.reset(muzzle.x, muzzle.y);
      body.setAllowGravity(false);

      this.physics.velocityFromRotation(shotAngle, 520, body.velocity);
      bullet.setRotation(shotAngle);

      this.time.delayedCall(700, () => {
        if (!bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        body.stop();
      });
    });

    this.showFloatingText(this.player.x, this.player.y - 50, 'DEMOLITION', '#ffb74d');
  }

  private useRallyOrder() {
    this.abilityActiveUntil = this.time.now + 4500;
    this.player.setTint(0xffd54f);
    this.showFloatingText(this.player.x, this.player.y - 50, 'RALLY', '#ffeb3b');
  }

  private useBattleStim() {
    this.abilityActiveUntil = this.time.now + 3500;
    this.player.setTint(0xff8a65);
    this.showFloatingText(this.player.x, this.player.y - 50, 'STIM', '#ff8a65');
  }

  private updateAbilityState() {
    if (this.abilityActiveUntil > 0 && this.time.now > this.abilityActiveUntil) {
      this.abilityActiveUntil = 0;
      this.player.clearTint();
    }
  }

  private getEffectiveFireRate() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return Math.max(60, Math.floor(this.weaponConfig.fireRate * 0.55));
    }

    if (this.currentCharacterId === 'general_goldsnout' && this.abilityActiveUntil > this.time.now) {
      return Math.max(60, Math.floor(this.weaponConfig.fireRate * 0.7));
    }

    if (this.currentCharacterId === 'grunt_bacon' && this.abilityActiveUntil > this.time.now) {
      return Math.max(60, Math.floor(this.weaponConfig.fireRate * 0.8));
    }

    return this.weaponConfig.fireRate;
  }

  private getEffectiveSpread() {
    let spread = this.weaponConfig.spread ?? 0;

    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      spread *= 0.2;
    }

    return spread;
  }

  private getDamageBonus() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return 1;
    }

    if (this.currentCharacterId === 'general_goldsnout' && this.abilityActiveUntil > this.time.now) {
      return 1;
    }

    return 0;
  }

  private getProjectileSpeedBonus() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return 180;
    }

    return 0;
  }

  private getExtraPierce() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return 1;
    }

    return 0;
  }

  private applySplashDamage(x: number, y: number, radius: number, damage: number) {
    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) return;

      const splashDamage = Math.max(1, damage - Math.floor(distance / 45));
      const nextHp = (enemy.getData('hp') ?? 1) - splashDamage;

      if (nextHp <= 0) {
        const rewardKills = enemy.getData('rewardKills') ?? 1;
        const isBoss = enemy.getData('isBoss') === true;
        enemy.destroy();
        this.kills += rewardKills;
        if (isBoss) this.bossDefeated = true;
        this.emitKillsUpdate();
      } else {
        enemy.setData('hp', nextHp);
      }
    });

    this.updateHud();
  }

  private createAreaPulse(x: number, y: number, radius: number, color: number) {
    const ring = this.add.circle(x, y, 12, color, 0.2).setDepth(790);
    ring.setStrokeStyle(3, color, 0.9);

    this.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 260,
      onComplete: () => ring.destroy()
    });
  }

  private cleanup() {
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.input.off('pointerup');
    this.spawnTimer?.remove(false);
    this.scale.off('resize', this.handleResize, this);
  }
}
