import Phaser from 'phaser';
import { PigPlayer } from '../entities/PigPlayer';
import { apiClient } from '../../api/client';
import { getLevelDefinition, LevelDefinition, LevelEnemyKind } from '../levels';

type CurrentRunPayload = {
  run: {
    id: string;
    characterId: string;
    weaponId: string;
    levelId: string;
    characterUpgradeLevel?: number;
    weaponUpgradeLevel?: number;
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
  weaponScale?: { width: number; height: number };
};

type CharacterStats = {
  speed: number;
  maxHealth: number;
  scale: number;
  jumpVelocity: number;
};

type EnemyConfig = {
  key: string;
  fallbackKey: string;
  kind: LevelEnemyKind;
  hp: number;
  speed: number;
  width: number;
  height: number;
  contactDamage: number;
  rewardKills: number;
  flying?: boolean;
};

const MOVE_STICK_MARGIN = 78;
const MOVE_STICK_BASE_RADIUS = 38;
const MOVE_STICK_THUMB_RADIUS = 12;
const MOVE_STICK_MAX_DISTANCE = 28;

const FIRE_BUTTON_RADIUS = 42;
const JUMP_BUTTON_RADIUS = 34;
const ABILITY_BUTTON_RADIUS = 30;

const FIRE_BUTTON_MARGIN_X = 88;
const FIRE_BUTTON_MARGIN_Y = 82;
const JUMP_BUTTON_MARGIN_X = 178;
const JUMP_BUTTON_MARGIN_Y = 104;
const ABILITY_BUTTON_MARGIN_X = 118;
const ABILITY_BUTTON_MARGIN_Y = 178;

const FIRE_DRAG_DEADZONE = 0.22;

const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  oink_pistol: {
    projectileKey: 'bullet',
    fireRate: 320,
    bulletSpeed: 840,
    bulletSize: 18,
    damage: 1,
    projectileLifetime: 1200,
    weaponScale: { width: 34, height: 18 }
  },
  sow_machinegun: {
    projectileKey: 'bullet',
    fireRate: 120,
    bulletSpeed: 900,
    bulletSize: 15,
    damage: 1,
    projectileLifetime: 1000,
    spread: 0.06,
    weaponScale: { width: 42, height: 20 }
  },
  boar_rifle: {
    projectileKey: 'bullet',
    fireRate: 180,
    bulletSpeed: 980,
    bulletSize: 17,
    damage: 1,
    projectileLifetime: 1100,
    spread: 0.025,
    weaponScale: { width: 46, height: 18 }
  },
  tusk_shotgun: {
    projectileKey: 'bullet',
    fireRate: 500,
    bulletSpeed: 760,
    bulletSize: 15,
    damage: 1,
    projectileLifetime: 650,
    burst: 5,
    spread: 0.25,
    weaponScale: { width: 42, height: 20 }
  },
  sniper_swine: {
    projectileKey: 'sniper_bullet',
    fireRate: 850,
    bulletSpeed: 1300,
    bulletSize: 22,
    damage: 2,
    projectileLifetime: 1450,
    pierce: 1,
    weaponScale: { width: 56, height: 16 }
  },
  belcha_minigun: {
    projectileKey: 'bullet',
    fireRate: 90,
    bulletSpeed: 940,
    bulletSize: 14,
    damage: 1,
    projectileLifetime: 950,
    spread: 0.1,
    weaponScale: { width: 44, height: 24 }
  },
  plasma_porker: {
    projectileKey: 'plasma_globule',
    fireRate: 420,
    bulletSpeed: 720,
    bulletSize: 26,
    damage: 2,
    projectileLifetime: 1300,
    weaponScale: { width: 44, height: 22 }
  },
  bacon_blaster: {
    projectileKey: 'rocket',
    fireRate: 700,
    bulletSpeed: 700,
    bulletSize: 30,
    damage: 3,
    projectileLifetime: 1200,
    weaponScale: { width: 52, height: 24 }
  }
};

const CHARACTER_STATS: Record<string, CharacterStats> = {
  grunt_bacon: { speed: 245, maxHealth: 100, scale: 72, jumpVelocity: 690 },
  iron_tusk: { speed: 205, maxHealth: 160, scale: 84, jumpVelocity: 640 },
  swift_hoof: { speed: 315, maxHealth: 85, scale: 68, jumpVelocity: 760 },
  precision_squeal: { speed: 235, maxHealth: 90, scale: 70, jumpVelocity: 690 },
  blast_ham: { speed: 225, maxHealth: 115, scale: 74, jumpVelocity: 675 },
  general_goldsnout: { speed: 270, maxHealth: 125, scale: 78, jumpVelocity: 700 }
};

const ENEMY_CONFIGS: Record<LevelEnemyKind, EnemyConfig> = {
  soldier: {
    key: 'wolf_grunt',
    fallbackKey: 'fallback_enemy_soldier',
    kind: 'soldier',
    hp: 2,
    speed: 82,
    width: 62,
    height: 74,
    contactDamage: 8,
    rewardKills: 1
  },
  heavy: {
    key: 'wolf_heavy',
    fallbackKey: 'fallback_enemy_heavy',
    kind: 'heavy',
    hp: 4,
    speed: 62,
    width: 78,
    height: 86,
    contactDamage: 12,
    rewardKills: 1
  },
  drone: {
    key: 'cyber_fox',
    fallbackKey: 'fallback_drone',
    kind: 'drone',
    hp: 2,
    speed: 110,
    width: 64,
    height: 54,
    contactDamage: 9,
    rewardKills: 1,
    flying: true
  },
  helicopter: {
    key: 'helicopter',
    fallbackKey: 'fallback_helicopter',
    kind: 'helicopter',
    hp: 7,
    speed: 82,
    width: 120,
    height: 58,
    contactDamage: 14,
    rewardKills: 1,
    flying: true
  },
  tank: {
    key: 'alpha_wolfgang',
    fallbackKey: 'fallback_tank',
    kind: 'tank',
    hp: 12,
    speed: 42,
    width: 154,
    height: 96,
    contactDamage: 16,
    rewardKills: 1
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

  jumpKey?: Phaser.Input.Keyboard.Key;
  abilityKey?: Phaser.Input.Keyboard.Key;

  platforms!: Phaser.Physics.Arcade.StaticGroup;
  projectiles!: Phaser.Physics.Arcade.Group;
  enemyProjectiles!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;

  runData!: CurrentRunPayload;
  weaponConfig!: WeaponConfig;

  lastShotTime = 0;
  kills = 0;
  health = 100;
  maxHealth = 100;
  playerSpeed = 240;
  jumpVelocity = 690;
  isFinishing = false;

  private level: LevelDefinition = getLevelDefinition();

  private currentCharacterId = 'grunt_bacon';
  private characterUpgradeLevel = 0;
  private weaponUpgradeLevel = 0;
  private playerDisplaySize = 72;

  private facingDirection: 1 | -1 = 1;
  private aimAngle = 0;
  private wantsToShoot = false;
  private wantsToJump = false;
  private jumpHeld = false;
  private canDoubleJump = true;

  private abilityCooldownMs = 6000;
  private lastAbilityUseTime = -99999;
  private abilityActiveUntil = 0;
  private abilityLabel = 'MUD SLOW';

  private stageCompleted = false;
  private bossSpawned = false;
  private bossDefeated = false;
  private isPaused = false;
  private dynamicSpawnsCreated = 0;
  private lastExtractionWarningAt = -99999;

  private spawnTimer?: Phaser.Time.TimerEvent;
  private enemyFireTimer?: Phaser.Time.TimerEvent;

  private hudText?: Phaser.GameObjects.Text;
  private missionText?: Phaser.GameObjects.Text;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private progressBarFill?: Phaser.GameObjects.Rectangle;
  private healthBarFill?: Phaser.GameObjects.Rectangle;
  private pauseButton?: Phaser.GameObjects.Container;
  private pauseButtonText?: Phaser.GameObjects.Text;

  private weaponObject?: Phaser.GameObjects.Image | Phaser.GameObjects.Container;

  private movePointerId: number | null = null;
  private firePointerId: number | null = null;
  private jumpPointerId: number | null = null;
  private abilityPointerId: number | null = null;

  private moveVector = new Phaser.Math.Vector2(0, 0);
  private fireVector = new Phaser.Math.Vector2(1, 0);

  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;

  private fireButtonBase?: Phaser.GameObjects.Arc;
  private fireButtonRing?: Phaser.GameObjects.Arc;
  private fireButtonIcon?: Phaser.GameObjects.Text;

  private jumpButtonBase?: Phaser.GameObjects.Arc;
  private jumpButtonIcon?: Phaser.GameObjects.Text;

  private abilityButtonBase?: Phaser.GameObjects.Arc;
  private abilityButtonIcon?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.createFallbackTextures();

    const storedRun = sessionStorage.getItem('currentRun');

    if (!storedRun) {
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
      this.showFatalMessage('RUN SESSION INVALID');
      this.forceDefeat();
      return;
    }

    this.level = getLevelDefinition(this.runData.run.levelId);

    this.physics.world.gravity.y = this.level.gravity;
    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.cameras.main.setBackgroundColor(this.level.backgroundColor);

    this.currentCharacterId = this.runData.run.characterId;
    this.characterUpgradeLevel = Math.max(0, Number(this.runData.run.characterUpgradeLevel ?? 0));
    this.weaponUpgradeLevel = Math.max(0, Number(this.runData.run.weaponUpgradeLevel ?? 0));

    this.configureCharacterAbility();

    const baseCharacterStats =
      CHARACTER_STATS[this.runData.run.characterId] ?? CHARACTER_STATS.grunt_bacon;
    const characterStats = this.applyCharacterUpgrades(baseCharacterStats);

    this.maxHealth = characterStats.maxHealth;
    this.health = characterStats.maxHealth;
    this.playerSpeed = characterStats.speed;
    this.jumpVelocity = characterStats.jumpVelocity;
    this.playerDisplaySize = characterStats.scale;

    const baseWeaponConfig = WEAPON_CONFIGS[this.runData.run.weaponId] ?? WEAPON_CONFIGS.oink_pistol;
    this.weaponConfig = this.applyWeaponUpgrades(baseWeaponConfig);

    this.createBackground();
    this.createStage();

    if (!this.createPlayer(characterStats.scale)) return;
    if (!this.createInput()) return;
    if (!this.createGroups()) return;

    this.createWeaponSprite();
    this.createHud();
    this.createTouchControls();
    this.createPauseButton();

    this.registerCollisions();
    this.spawnInitialEnemies();
    this.startTimers();

    this.setupPointerControls();
    this.handleResize(this.scale.gameSize);
    this.updateHud();
    this.showMissionIntro();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update() {
    if (!this.player || !this.player.active || this.isFinishing || this.isPaused) return;

    this.handleKeyboardInput();
    this.updatePlayerMovement();
    this.updateAiming();
    this.updateWeaponSprite(this.aimAngle);
    this.updateEnemies();
    this.updateAbilityState();
    this.maybeSpawnBoss();
    this.checkStageProgress();
    this.updateHud();

    if (this.player.y > this.level.worldHeight + 120) {
      this.health = 0;
      this.failMission();
    }
  }

  private startTimers() {
    this.spawnTimer?.remove(false);
    this.enemyFireTimer?.remove(false);

    if (this.level.allowDynamicSpawns && this.level.dynamicSpawnLimit > 0) {
      this.spawnTimer = this.time.addEvent({
        delay: 2300,
        callback: this.spawnEnemyAhead,
        callbackScope: this,
        loop: true
      });
    }

    this.enemyFireTimer = this.time.addEvent({
      delay: 1700,
      callback: this.enemyShootCycle,
      callbackScope: this,
      loop: true
    });
  }

  private showMissionIntro() {
    if (!this.missionText) return;

    this.missionText.setText(this.level.title.toUpperCase());
    this.missionText.setVisible(true);

    this.time.delayedCall(1600, () => {
      if (!this.isFinishing && this.missionText) {
        this.missionText.setText(this.level.subtitle.toUpperCase());
      }
    });

    this.time.delayedCall(3200, () => {
      if (!this.isFinishing && this.missionText) {
        this.missionText.setVisible(false);
      }
    });
  }

  private createFallbackTextures() {
    const makeRectTexture = (
      key: string,
      width: number,
      height: number,
      fill: number,
      stroke = 0x111111
    ) => {
      if (this.textures.exists(key)) return;

      const graphics = this.add.graphics();
      graphics.fillStyle(fill, 1);
      graphics.fillRoundedRect(0, 0, width, height, 8);
      graphics.lineStyle(3, stroke, 1);
      graphics.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, 8);
      graphics.generateTexture(key, width, height);
      graphics.destroy();
    };

    const makeCircleTexture = (key: string, radius: number, fill: number, stroke = 0x111111) => {
      if (this.textures.exists(key)) return;

      const graphics = this.add.graphics();
      graphics.fillStyle(fill, 1);
      graphics.fillCircle(radius, radius, radius);
      graphics.lineStyle(3, stroke, 1);
      graphics.strokeCircle(radius, radius, radius - 2);
      graphics.generateTexture(key, radius * 2, radius * 2);
      graphics.destroy();
    };

    makeRectTexture('fallback_player', 60, 76, 0xc47635, 0x4a2410);
    makeRectTexture('fallback_enemy_soldier', 54, 68, 0x6f7d49, 0x232912);
    makeRectTexture('fallback_enemy_heavy', 74, 82, 0x575757, 0x202020);
    makeRectTexture('fallback_tank', 150, 90, 0x6b6d46, 0x292914);
    makeCircleTexture('fallback_drone', 26, 0xb63a3a, 0x2e0b0b);
    makeRectTexture('fallback_helicopter', 120, 58, 0x4f5f59, 0x1d2421);
    makeRectTexture('fallback_bullet', 20, 8, 0xffd166, 0x5f3f00);
    makeCircleTexture('fallback_plasma', 15, 0x66e0ff, 0x0e4050);
    makeRectTexture('fallback_rocket', 32, 14, 0xff8844, 0x5a2100);
  }

  private createBackground() {
    this.add
      .rectangle(
        this.level.worldWidth / 2,
        this.level.worldHeight / 2,
        this.level.worldWidth,
        this.level.worldHeight,
        this.level.backgroundColor
      )
      .setDepth(-50);

    const bgKeys = ['level1_bg_left', 'level1_bg_middle', 'level1_bg_right'];
    const hasLevelBackgrounds = bgKeys.every((key) => this.textures.exists(key));

    if (hasLevelBackgrounds) {
      const segmentWidth = this.level.worldWidth / 3;

      bgKeys.forEach((key, index) => {
        const bg = this.add.image(segmentWidth * index + segmentWidth / 2, this.level.worldHeight / 2, key);
        bg.setDisplaySize(segmentWidth + 6, this.level.worldHeight);
        bg.setDepth(-45);
        bg.setScrollFactor(1);
      });

      return;
    }

    if (this.textures.exists('background')) {
      const bg = this.add.image(this.level.worldWidth / 2, this.level.worldHeight / 2, 'background');
      bg.setDisplaySize(this.level.worldWidth, this.level.worldHeight);
      bg.setDepth(-45);
      bg.setScrollFactor(1);
      return;
    }

    this.add
      .circle(this.level.worldWidth * 0.72, 125, 62, this.level.sunColor, 1)
      .setDepth(-44)
      .setScrollFactor(0.6);

    for (let i = 0; i < 18; i += 1) {
      const x = i * 360 + 100;
      const h = Phaser.Math.Between(140, 260);
      const y = this.level.groundY - 80 - h / 2;

      this.add
        .rectangle(x, y, Phaser.Math.Between(180, 320), h, 0x756b59, 0.26)
        .setDepth(-42)
        .setScrollFactor(0.7)
        .setRotation(Phaser.Math.FloatBetween(-0.08, 0.08));
    }

    for (let i = 0; i < 10; i += 1) {
      const x = i * 560 + 240;

      this.add
        .ellipse(x, 145 + Phaser.Math.Between(-20, 24), 260, 72, 0xffefd0, 0.55)
        .setDepth(-43)
        .setScrollFactor(0.5);
    }
  }

  private createStage() {
    this.platforms = this.physics.add.staticGroup();

    this.level.platforms.forEach((platform) => {
      this.createPlatform(
        platform.x,
        platform.y,
        platform.width,
        platform.height,
        platform.color ?? 0x7b704c
      );
    });

    this.level.crates.forEach((crate) => {
      this.createCrate(crate.x, crate.y);
    });

    this.level.buildings.forEach((building) => {
      this.createDecorationBuilding(
        building.x,
        building.y,
        building.width,
        building.height,
        building.color ?? 0xd0c8b8
      );
    });

    this.add
      .rectangle(this.level.extractionX, this.level.groundY - 78, 64, 116, 0xffd166, 0.9)
      .setStrokeStyle(3, 0x5a3200, 1)
      .setDepth(3);

    this.add
      .text(this.level.extractionX, this.level.groundY - 150, 'EXTRACTION', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#00000099',
        padding: { left: 8, right: 8, top: 5, bottom: 5 }
      })
      .setOrigin(0.5)
      .setDepth(4);
  }

  private createPlatform(x: number, y: number, width: number, height: number, color: number) {
    const platform = this.add.rectangle(x, y, width, height, color, 1).setDepth(1);
    platform.setStrokeStyle(2, 0x2b2118, 0.65);

    this.physics.add.existing(platform, true);

    const body = platform.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(width, height);
    body.updateFromGameObject();

    this.platforms.add(platform);
    return platform;
  }

  private createCrate(x: number, y: number) {
    const crate = this.createPlatform(x, y, 72, 72, 0x9b7448);
    crate.setDepth(2);

    this.add.line(x, y, -30, -30, 30, 30, 0x4b2d13, 0.65).setLineWidth(4).setDepth(3);
    this.add.line(x, y, 30, -30, -30, 30, 0x4b2d13, 0.65).setLineWidth(4).setDepth(3);
  }

  private createDecorationBuilding(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number
  ) {
    this.add.rectangle(x, y, width, height, color, 0.36).setDepth(-3);
    this.add.rectangle(x, y - height / 2 - 22, width + 30, 36, 0x918777, 0.42).setDepth(-2);

    for (let i = 0; i < 3; i += 1) {
      this.add
        .rectangle(x - width * 0.25 + i * width * 0.25, y - height * 0.12, 56, 68, 0x264047, 0.42)
        .setDepth(-2);
    }

    this.add.rectangle(x + width * 0.25, y + height * 0.25, 76, 112, 0x5f6d56, 0.4).setDepth(-2);
  }

  private createPlayer(scale: number): boolean {
    const characterKey = this.textures.exists(this.runData.run.characterId)
      ? this.runData.run.characterId
      : this.textures.exists('player')
        ? 'player'
        : 'fallback_player';

    this.player = new PigPlayer(this, 150, this.level.groundY - 120, characterKey);
    this.player.setDisplaySize(scale, scale);
    this.player.setDepth(20);
    this.player.setCollideWorldBounds(true);

    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;

    if (body) {
      body.setAllowGravity(true);
      body.setGravityY(0);
      body.setDragX(1300);
      body.setMaxVelocity(this.playerSpeed * 1.18, 1100);
      body.setSize(scale * 0.52, scale * 0.72);
      body.setOffset(scale * 0.24, scale * 0.28);
    }

    this.cameras.main.startFollow(this.player, true, 0.13, 0.16);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.cameras.main.setRoundPixels(false);
    this.updateCameraZoom();

    return true;
  }

  private createInput(): boolean {
    if (!this.input.keyboard) {
      this.showFatalMessage('KEYBOARD INPUT UNAVAILABLE');
      this.forceDefeat();
      return false;
    }

    this.input.addPointer(4);
    this.cursors = this.input.keyboard.createCursorKeys();

    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as typeof this.wasd;

    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.abilityKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    return true;
  }

  private createGroups(): boolean {
    this.projectiles = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: 'fallback_bullet',
      maxSize: 180,
      runChildUpdate: false
    });

    this.enemyProjectiles = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: 'fallback_bullet',
      maxSize: 80,
      runChildUpdate: false
    });

    this.enemies = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      defaultKey: 'fallback_enemy_soldier',
      maxSize: 30,
      runChildUpdate: false
    });

    return true;
  }

  private registerCollisions() {
    this.physics.add.collider(this.player, this.platforms, () => {
      const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;

      if (body?.blocked.down || body?.touching.down) {
        this.canDoubleJump = true;
      }
    });

    this.physics.add.collider(this.enemies, this.platforms);

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.enemyProjectiles,
      this.player,
      this.handleEnemyProjectileHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
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

  private createWeaponSprite() {
    const weaponKey = this.textures.exists(this.runData.run.weaponId) ? this.runData.run.weaponId : null;
    const size = this.weaponConfig.weaponScale ?? { width: 42, height: 18 };

    if (weaponKey) {
      const image = this.add.image(this.player.x, this.player.y, weaponKey);
      image.setDepth(23);
      image.setOrigin(0.25, 0.5);
      image.setDisplaySize(size.width, size.height);
      this.weaponObject = image;
      return;
    }

    const barrel = this.add.rectangle(size.width * 0.35, 0, size.width, size.height, 0x3a3a3a, 1);
    barrel.setStrokeStyle(2, 0x111111, 1);

    const muzzle = this.add.rectangle(size.width * 0.92, 0, 10, size.height * 0.55, 0x171717, 1);
    const grip = this.add.rectangle(-4, 8, 8, 16, 0x6b3a1e, 1);
    grip.setRotation(0.45);

    const highlight = this.add.rectangle(size.width * 0.36, -4, size.width * 0.72, 3, 0x8a8a8a, 0.85);

    this.weaponObject = this.add.container(this.player.x, this.player.y, [
      grip,
      barrel,
      muzzle,
      highlight
    ]);
    this.weaponObject.setDepth(23);
  }

  private updateWeaponSprite(angle: number) {
    if (!this.weaponObject || !this.player?.active) return;

    const handDistance = 27;
    const x = this.player.x + Math.cos(angle) * handDistance;
    const y = this.player.y + 2 + Math.sin(angle) * handDistance;

    this.weaponObject.setPosition(x, y);
    this.weaponObject.setRotation(angle);

    const facingLeft = Math.cos(angle) < 0;
    this.weaponObject.setDepth(facingLeft ? 18 : 23);

    if (this.weaponObject instanceof Phaser.GameObjects.Image) {
      this.weaponObject.setFlipY(facingLeft);
    } else {
      this.weaponObject.setScale(1, facingLeft ? -1 : 1);
    }
  }

  private createHud() {
    this.hudText = this.add
      .text(14, 14, '', {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000aa',
        padding: { left: 8, right: 8, top: 5, bottom: 5 }
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.add
      .rectangle(14, 92, 180, 12, 0x1b1b1b, 0.92)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.healthBarFill = this.add
      .rectangle(14, 92, 180, 12, 0xff4d4f, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    this.add
      .rectangle(14, 110, 180, 9, 0x1b1b1b, 0.92)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.progressBarFill = this.add
      .rectangle(14, 110, 0, 9, 0xffd166, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    this.missionText = this.add
      .text(this.scale.width / 2, 56, '', {
        fontSize: '22px',
        color: '#ffdd57',
        fontStyle: 'bold',
        backgroundColor: '#000000aa',
        padding: { left: 12, right: 12, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1100)
      .setVisible(false);
  }

  private createPauseButton() {
    const x = this.scale.width - 44;
    const y = 44;

    const outer = this.add.circle(0, 0, 28, 0x111111, 0.78).setStrokeStyle(4, 0xffb347, 0.9);

    this.pauseButtonText = this.add
      .text(0, -3, 'Ⅱ', {
        fontSize: '25px',
        color: '#ffb347',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.pauseButton = this.add.container(x, y, [outer, this.pauseButtonText]);
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setDepth(1300);
    this.pauseButton.setSize(58, 58);
    this.pauseButton.setInteractive(new Phaser.Geom.Circle(0, 0, 31), Phaser.Geom.Circle.Contains);

    this.pauseButton.on('pointerdown', () => {
      this.togglePause();
    });
  }

  private togglePause() {
    if (this.isFinishing) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.physics.world.pause();
      this.spawnTimer?.remove(false);
      this.enemyFireTimer?.remove(false);
      this.pauseButtonText?.setText('▶');
      this.createPauseOverlay();
      return;
    }

    this.physics.world.resume();
    this.startTimers();
    this.pauseButtonText?.setText('Ⅱ');
    this.pauseOverlay?.destroy();
    this.pauseOverlay = undefined;
  }

  private createPauseOverlay() {
    this.pauseOverlay?.destroy();

    const panel = this.add
      .rectangle(0, 0, 320, 150, 0x000000, 0.82)
      .setStrokeStyle(2, 0xffb347, 0.9);

    const title = this.add
      .text(0, -30, 'PAUSED', {
        fontSize: '28px',
        color: '#ffb347',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(0, 22, 'Tap pause again to resume', {
        fontSize: '14px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.pauseOverlay = this.add.container(this.scale.width / 2, this.scale.height / 2, [
      panel,
      title,
      sub
    ]);

    this.pauseOverlay.setScrollFactor(0);
    this.pauseOverlay.setDepth(1400);
  }

  private setupPointerControls() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused) return;

      const width = this.scale.width;
      const height = this.scale.height;

      const fireCenter = this.getFireButtonCenter();
      const jumpCenter = this.getJumpButtonCenter();
      const abilityCenter = this.getAbilityButtonCenter();

      const distanceToFire = Phaser.Math.Distance.Between(pointer.x, pointer.y, fireCenter.x, fireCenter.y);
      const distanceToJump = Phaser.Math.Distance.Between(pointer.x, pointer.y, jumpCenter.x, jumpCenter.y);
      const distanceToAbility = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        abilityCenter.x,
        abilityCenter.y
      );

      if (distanceToJump <= JUMP_BUTTON_RADIUS + 18 && this.jumpPointerId === null) {
        this.jumpPointerId = pointer.id;
        this.wantsToJump = true;
        this.jumpHeld = true;
        this.jumpButtonBase?.setAlpha(1);
        return;
      }

      if (distanceToAbility <= ABILITY_BUTTON_RADIUS + 18 && this.abilityPointerId === null) {
        this.abilityPointerId = pointer.id;
        this.useCharacterAbility();
        this.abilityButtonBase?.setAlpha(1);
        return;
      }

      if (pointer.x < width * 0.45 && pointer.y > height * 0.42 && this.movePointerId === null) {
        this.movePointerId = pointer.id;
        this.updateMoveVectorFromPointer(pointer);
        this.updateJoystickVisual(pointer.x, pointer.y);
        return;
      }

      if (distanceToFire <= FIRE_BUTTON_RADIUS + 32 && this.firePointerId === null) {
        this.firePointerId = pointer.id;
        this.wantsToShoot = true;
        this.fireVector.set(this.facingDirection, 0);
        this.aimAngle = this.facingDirection === 1 ? 0 : Math.PI;
        this.fireButtonBase?.setAlpha(1);
        void this.shoot();
        return;
      }

      if (!pointer.wasTouch) {
        this.wantsToShoot = true;
        void this.shoot();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused) return;

      if (this.movePointerId === pointer.id) {
        this.updateMoveVectorFromPointer(pointer);
        this.updateJoystickVisual(pointer.x, pointer.y);
      }

      if (this.firePointerId === pointer.id) {
        this.updateFireVectorFromPointer(pointer);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.movePointerId === pointer.id) {
        this.movePointerId = null;
        this.moveVector.set(0, 0);
        this.resetJoystickVisual();
      }

      if (this.firePointerId === pointer.id) {
        this.firePointerId = null;
        this.wantsToShoot = false;
        this.fireVector.set(this.facingDirection, 0);
        this.fireButtonBase?.setAlpha(0.84);
      }

      if (this.jumpPointerId === pointer.id) {
        this.jumpPointerId = null;
        this.jumpHeld = false;
        this.jumpButtonBase?.setAlpha(0.84);
      }

      if (this.abilityPointerId === pointer.id) {
        this.abilityPointerId = null;
        this.abilityButtonBase?.setAlpha(0.84);
      }
    });

    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      this.input.emit('pointerup', pointer);
    });
  }

  private createTouchControls() {
    const joyX = MOVE_STICK_MARGIN;
    const joyY = this.scale.height - MOVE_STICK_MARGIN;

    this.joystickBase = this.add
      .circle(joyX, joyY, MOVE_STICK_BASE_RADIUS, 0x000000, 0.42)
      .setStrokeStyle(3, 0xffb347, 0.7)
      .setScrollFactor(0)
      .setDepth(1200);

    this.joystickThumb = this.add
      .circle(joyX, joyY, MOVE_STICK_THUMB_RADIUS, 0xffffff, 0.72)
      .setScrollFactor(0)
      .setDepth(1202);

    const fireCenter = this.getFireButtonCenter();

    this.fireButtonBase = this.add
      .circle(fireCenter.x, fireCenter.y, FIRE_BUTTON_RADIUS, 0x1a0700, 0.84)
      .setStrokeStyle(4, 0xff9f1c, 0.95)
      .setScrollFactor(0)
      .setDepth(1200);

    this.fireButtonRing = this.add
      .circle(fireCenter.x, fireCenter.y, FIRE_BUTTON_RADIUS + 8, 0x000000, 0)
      .setStrokeStyle(3, 0xffc15f, 0.35)
      .setScrollFactor(0)
      .setDepth(1199);

    this.fireButtonIcon = this.add
      .text(fireCenter.x, fireCenter.y + 1, 'FIRE', {
        fontSize: '13px',
        color: '#ffb347',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1201);

    const jumpCenter = this.getJumpButtonCenter();

    this.jumpButtonBase = this.add
      .circle(jumpCenter.x, jumpCenter.y, JUMP_BUTTON_RADIUS, 0x050505, 0.84)
      .setStrokeStyle(3, 0xffb347, 0.7)
      .setScrollFactor(0)
      .setDepth(1200);

    this.jumpButtonIcon = this.add
      .text(jumpCenter.x, jumpCenter.y - 1, 'JUMP', {
        fontSize: '11px',
        color: '#ffb347',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1201);

    const abilityCenter = this.getAbilityButtonCenter();

    this.abilityButtonBase = this.add
      .circle(abilityCenter.x, abilityCenter.y, ABILITY_BUTTON_RADIUS, 0x050505, 0.84)
      .setStrokeStyle(3, 0x8fcfff, 0.7)
      .setScrollFactor(0)
      .setDepth(1200);

    this.abilityButtonIcon = this.add
      .text(abilityCenter.x, abilityCenter.y - 1, 'SKILL', {
        fontSize: '10px',
        color: '#8fcfff',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1201);
  }

  private getFireButtonCenter() {
    return {
      x: this.scale.width - FIRE_BUTTON_MARGIN_X,
      y: this.scale.height - FIRE_BUTTON_MARGIN_Y
    };
  }

  private getJumpButtonCenter() {
    return {
      x: this.scale.width - JUMP_BUTTON_MARGIN_X,
      y: this.scale.height - JUMP_BUTTON_MARGIN_Y
    };
  }

  private getAbilityButtonCenter() {
    return {
      x: this.scale.width - ABILITY_BUTTON_MARGIN_X,
      y: this.scale.height - ABILITY_BUTTON_MARGIN_Y
    };
  }

  private handleKeyboardInput() {
    if (this.abilityKey && Phaser.Input.Keyboard.JustDown(this.abilityKey)) {
      this.useCharacterAbility();
    }

    if (this.jumpKey && Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
      this.wantsToJump = true;
    }

    if (this.cursors?.up && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.wantsToJump = true;
    }

    if (this.wasd?.up && Phaser.Input.Keyboard.JustDown(this.wasd.up)) {
      this.wantsToJump = true;
    }

    if (this.input.activePointer.isDown && !this.input.activePointer.wasTouch) {
      this.wantsToShoot = true;
    } else if (!this.firePointerId) {
      this.wantsToShoot = false;
    }
  }

  private updatePlayerMovement() {
    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    let horizontal = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) horizontal -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) horizontal += 1;

    if (this.movePointerId !== null) {
      horizontal = Phaser.Math.Clamp(this.moveVector.x, -1, 1);
    }

    if (Math.abs(horizontal) > 0.08) {
      body.setVelocityX(horizontal * this.playerSpeed);
      this.facingDirection = horizontal >= 0 ? 1 : -1;
      this.player.setFlipX(this.facingDirection < 0);
    } else {
      body.setVelocityX(0);
    }

    const onGround = body.blocked.down || body.touching.down;

    if (onGround) {
      this.canDoubleJump = true;
    }

    if (this.wantsToJump) {
      if (onGround) {
        body.setVelocityY(-this.jumpVelocity);
        this.canDoubleJump = true;
      } else if (this.canDoubleJump) {
        body.setVelocityY(-this.jumpVelocity * 0.86);
        this.canDoubleJump = false;
        this.createAreaPulse(this.player.x, this.player.y + 28, 42, 0xffd166);
      }

      this.wantsToJump = false;
    }

    if (!this.jumpHeld && body.velocity.y < -120 && !onGround) {
      body.setVelocityY(body.velocity.y * 0.992);
    }

    this.applyMovementLean(horizontal, onGround);

    if (this.wantsToShoot) {
      void this.shoot();
    }
  }

  private updateAiming() {
    if (!this.player?.active) return;

    if (this.firePointerId !== null && this.fireVector.length() > FIRE_DRAG_DEADZONE) {
      const normalized = this.fireVector.clone().normalize();
      this.aimAngle = Phaser.Math.Angle.Between(0, 0, normalized.x, normalized.y);

      if (Math.abs(normalized.x) > 0.18) {
        this.facingDirection = normalized.x >= 0 ? 1 : -1;
        this.player.setFlipX(this.facingDirection < 0);
      }

      return;
    }

    if (this.input.activePointer && this.input.activePointer.isDown && !this.input.activePointer.wasTouch) {
      this.aimAngle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        this.input.activePointer.worldX,
        this.input.activePointer.worldY
      );

      this.facingDirection = Math.cos(this.aimAngle) >= 0 ? 1 : -1;
      this.player.setFlipX(this.facingDirection < 0);
      return;
    }

    this.aimAngle = this.facingDirection === 1 ? 0 : Math.PI;
  }

  private applyMovementLean(horizontal: number, onGround: boolean) {
    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    if (!onGround) {
      this.player.setRotation(Phaser.Math.Clamp(body.velocity.y / 1200, -0.16, 0.16));
      return;
    }

    if (Math.abs(horizontal) < 0.08) {
      this.player.setRotation(0);
      return;
    }

    this.player.setRotation(horizontal * 0.065);
  }

  async shoot() {
    if (this.isFinishing || this.isPaused || !this.player?.active) return;

    const now = this.time.now;
    const effectiveFireRate = this.getEffectiveFireRate();

    if (now - this.lastShotTime < effectiveFireRate) return;

    this.lastShotTime = now;

    const burst = this.weaponConfig.burst ?? 1;
    const spread = this.getEffectiveSpread();
    const damageBoost = this.getDamageBonus();
    const speedBoost = this.getProjectileSpeedBonus();
    const extraPierce = this.getExtraPierce();
    const shootAngle = this.aimAngle || (this.facingDirection === 1 ? 0 : Math.PI);
    const muzzle = this.getMuzzlePosition(shootAngle);

    for (let i = 0; i < burst; i += 1) {
      const projectileKey = this.resolveProjectileKey();

      const bullet = this.projectiles.get(muzzle.x, muzzle.y, projectileKey) as Phaser.Physics.Arcade.Image | null;

      if (!bullet) continue;

      bullet.setTexture(projectileKey);
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setAlpha(1);
      bullet.setPosition(muzzle.x, muzzle.y);
      bullet.setDepth(40);
      bullet.clearTint();
      bullet.setDisplaySize(
        this.weaponConfig.bulletSize,
        projectileKey === 'fallback_rocket' || projectileKey === 'rocket'
          ? Math.max(12, this.weaponConfig.bulletSize * 0.55)
          : this.weaponConfig.bulletSize * 0.5
      );

      const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) continue;

      body.enable = true;
      body.reset(muzzle.x, muzzle.y);
      body.setAllowGravity(false);

      const randomSpread = spread > 0 ? Phaser.Math.FloatBetween(-spread, spread) : 0;
      const shotAngle =
        burst > 1
          ? shootAngle + randomSpread + (i - (burst - 1) / 2) * 0.045
          : shootAngle + randomSpread;

      this.physics.velocityFromRotation(
        shotAngle,
        this.weaponConfig.bulletSpeed + speedBoost,
        body.velocity
      );

      bullet.setRotation(shotAngle);
      bullet.setData('damage', this.weaponConfig.damage + damageBoost);
      bullet.setData('projectileKey', projectileKey);
      bullet.setData('pierceLeft', (this.weaponConfig.pierce ?? 0) + extraPierce);

      if (projectileKey.includes('plasma')) {
        bullet.setTint(0x66e0ff);
      } else if (projectileKey.includes('rocket')) {
        bullet.setTint(0xffaa33);
      } else if (projectileKey.includes('sniper')) {
        bullet.setTint(0xffffff);
      } else {
        bullet.setTint(0xffe066);
      }

      this.createMuzzleFlash(muzzle.x, muzzle.y, shotAngle);

      this.time.delayedCall(this.weaponConfig.projectileLifetime, () => {
        if (!bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        body.stop();
      });
    }
  }

  private resolveProjectileKey() {
    if (this.textures.exists(this.weaponConfig.projectileKey)) {
      return this.weaponConfig.projectileKey;
    }

    if (this.weaponConfig.projectileKey === 'rocket') return 'fallback_rocket';
    if (this.weaponConfig.projectileKey === 'plasma_globule') return 'fallback_plasma';

    return this.textures.exists('bullet') ? 'bullet' : 'fallback_bullet';
  }

  private getMuzzlePosition(angle: number) {
    const muzzleDistance = 48;

    return {
      x: this.player.x + Math.cos(angle) * muzzleDistance,
      y: this.player.y + 2 + Math.sin(angle) * muzzleDistance
    };
  }

  private createMuzzleFlash(x: number, y: number, angle: number) {
    const flash = this.add.triangle(x, y, 0, -8, 28, 0, 0, 8, 0xffd166, 0.9).setDepth(50).setRotation(angle);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 80,
      onComplete: () => flash.destroy()
    });
  }

  private spawnInitialEnemies() {
    this.level.initialEnemies.forEach((spawn) => {
      this.createEnemy(ENEMY_CONFIGS[spawn.kind], spawn.x, spawn.y);
    });
  }

  private maybeSpawnBoss() {
    if (this.bossSpawned || this.bossDefeated || this.isFinishing) return;

    const reachedTrigger = this.player.x >= this.level.boss.triggerX;
    const clearedInitialThreats = this.kills >= this.level.initialEnemies.length;

    if (reachedTrigger || clearedInitialThreats) {
      this.spawnBoss();
    }
  }

  private spawnEnemyAhead() {
    if (this.isFinishing || this.isPaused || !this.player?.active) return;
    if (!this.level.allowDynamicSpawns) return;
    if (this.dynamicSpawnsCreated >= this.level.dynamicSpawnLimit) return;

    const cameraRight = this.cameras.main.scrollX + this.scale.width / this.cameras.main.zoom;

    const spawnX = Phaser.Math.Clamp(
      cameraRight + Phaser.Math.Between(160, 380),
      500,
      this.level.extractionX - 220
    );

    const roll = Math.random();
    const kind: LevelEnemyKind =
      roll > 0.86
        ? 'drone'
        : roll > 0.66
          ? 'heavy'
          : 'soldier';

    const config = ENEMY_CONFIGS[kind];
    const y = config.flying ? Phaser.Math.Between(230, 430) : this.level.groundY - 120;

    this.createEnemy(config, spawnX, y);
    this.dynamicSpawnsCreated += 1;
  }

  private spawnBoss() {
    if (this.bossSpawned) return;

    this.bossSpawned = true;

    const bossConfig = ENEMY_CONFIGS[this.level.boss.kind];
    const boss = this.createEnemy(bossConfig, this.level.boss.x, this.level.boss.y);

    boss.setTint(0xffe0a3);
    boss.setData('isBoss', true);

    this.missionText?.setText(this.level.boss.title);
    this.missionText?.setVisible(true);

    this.time.delayedCall(1600, () => {
      if (!this.isFinishing) this.missionText?.setVisible(false);
    });
  }

  private createEnemy(config: EnemyConfig, x: number, y: number) {
    const textureKey = this.textures.exists(config.key) ? config.key : config.fallbackKey;
    const enemy = this.enemies.get(x, y, textureKey) as Phaser.Physics.Arcade.Sprite;

    enemy.setTexture(textureKey);
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setPosition(x, y);
    enemy.setDisplaySize(config.width, config.height);
    enemy.setDepth(config.flying ? 17 : 16);
    enemy.clearTint();

    enemy.setData('hp', config.hp);
    enemy.setData('maxHp', config.hp);
    enemy.setData('moveSpeed', config.speed);
    enemy.setData('baseMoveSpeed', config.speed);
    enemy.setData('contactDamage', config.contactDamage);
    enemy.setData('rewardKills', config.rewardKills);
    enemy.setData('kind', config.kind);
    enemy.setData('flying', Boolean(config.flying));
    enemy.setData('isBoss', false);

    const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;

    if (body) {
      body.enable = true;
      body.reset(x, y);
      body.setAllowGravity(!config.flying);
      body.setDragX(900);
      body.setCollideWorldBounds(false);
      body.setSize(config.width * 0.72, config.height * 0.82);
      body.setOffset(config.width * 0.14, config.height * 0.1);
    }

    return enemy;
  }

  private updateEnemies() {
    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) return;

      const kind = enemy.getData('kind') as LevelEnemyKind;
      const speed = enemy.getData('moveSpeed') ?? 80;
      const direction = this.player.x >= enemy.x ? 1 : -1;
      const distanceX = Math.abs(this.player.x - enemy.x);

      enemy.setFlipX(direction < 0);

      if (enemy.getData('flying')) {
        const targetY = Phaser.Math.Clamp(this.player.y - 80, 180, this.level.groundY - 160);
        const yDirection = targetY > enemy.y ? 1 : -1;

        body.setVelocityX(direction * speed);
        body.setVelocityY(Math.abs(targetY - enemy.y) > 16 ? yDirection * speed * 0.55 : 0);
        enemy.rotation = Math.sin(this.time.now * 0.012 + enemy.x) * 0.08;
        return;
      }

      if (kind === 'tank') {
        body.setVelocityX(distanceX > 360 ? direction * speed : 0);
        return;
      }

      if (distanceX > 120) {
        body.setVelocityX(direction * speed);
      } else {
        body.setVelocityX(0);
      }
    });
  }

  private enemyShootCycle() {
    if (!this.player?.active || this.isFinishing || this.isPaused) return;

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (distance > 760) return;

      const kind = enemy.getData('kind') as LevelEnemyKind;

      if (kind === 'drone' || kind === 'tank' || kind === 'helicopter') {
        this.enemyShoot(enemy, kind);
      } else if (Math.random() > 0.72) {
        this.enemyShoot(enemy, kind);
      }
    });
  }

  private enemyShoot(enemy: Phaser.Physics.Arcade.Sprite, kind: LevelEnemyKind) {
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const speed = kind === 'tank' ? 500 : kind === 'drone' || kind === 'helicopter' ? 440 : 390;

    const bullet = this.enemyProjectiles.get(enemy.x, enemy.y, 'fallback_bullet') as Phaser.Physics.Arcade.Image;
    if (!bullet) return;

    bullet.setTexture(kind === 'tank' ? 'fallback_rocket' : 'fallback_bullet');
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setPosition(enemy.x, enemy.y);
    bullet.setDisplaySize(kind === 'tank' ? 28 : 18, kind === 'tank' ? 12 : 8);
    bullet.setDepth(39);
    bullet.setTint(kind === 'tank' ? 0xff8844 : 0xff4d4f);
    bullet.setData('damage', kind === 'tank' ? 10 : 6);

    const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    body.enable = true;
    body.reset(enemy.x, enemy.y);
    body.setAllowGravity(false);

    this.physics.velocityFromRotation(angle, speed, body.velocity);
    bullet.setRotation(angle);

    this.time.delayedCall(1600, () => {
      if (!bullet.active) return;
      bullet.setActive(false);
      bullet.setVisible(false);
      body.stop();
    });
  }

  handleHit(
    bulletObject: Phaser.GameObjects.GameObject,
    enemyObject: Phaser.GameObjects.GameObject
  ) {
    const bullet = bulletObject as Phaser.Physics.Arcade.Image;
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;

    if (!bullet.active || !enemy.active || this.isFinishing) return;

    const hitX = enemy.x;
    const hitY = enemy.y;
    const projectileKey = bullet.getData('projectileKey') ?? 'fallback_bullet';

    const damage = bullet.getData('damage') ?? 1;
    const currentHp = enemy.getData('hp') ?? 1;
    const nextHp = currentHp - damage;

    const pierceLeft = bullet.getData('pierceLeft') ?? 0;

    if (pierceLeft > 0 && !String(projectileKey).includes('rocket')) {
      bullet.setData('pierceLeft', pierceLeft - 1);
    } else {
      bullet.setActive(false);
      bullet.setVisible(false);
      const bulletBody = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      bulletBody?.stop();
    }

    this.createHitEffect(hitX, hitY, projectileKey);

    if (String(projectileKey).includes('rocket')) {
      this.applySplashDamage(hitX, hitY, 90 + this.weaponUpgradeLevel * 10, damage);
    }

    if (!enemy.active) return;

    if (nextHp > 0) {
      enemy.setData('hp', nextHp);
      enemy.setTintFill(0xffffff);

      this.time.delayedCall(70, () => {
        if (enemy.active) enemy.clearTint();
      });

      this.showFloatingText(hitX, hitY - 38, `-${damage}`, '#ff8a65');
      return;
    }

    this.killEnemy(enemy, hitX, hitY);
  }

  private handleEnemyProjectileHit(
    bulletObject: Phaser.GameObjects.GameObject,
    _playerObject: Phaser.GameObjects.GameObject
  ) {
    const bullet = bulletObject as Phaser.Physics.Arcade.Image;

    if (!bullet.active || this.isFinishing) return;

    const damage = bullet.getData('damage') ?? 6;

    bullet.setActive(false);
    bullet.setVisible(false);
    (bullet.body as Phaser.Physics.Arcade.Body | undefined)?.stop();

    this.damagePlayer(damage);
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite, x: number, y: number) {
    const rewardKills = enemy.getData('rewardKills') ?? 1;
    const isBoss = enemy.getData('isBoss') === true;

    enemy.destroy();

    this.kills += rewardKills;

    if (isBoss) {
      this.bossDefeated = true;
    }

    this.emitKillsUpdate();
    this.updateHud();

    this.showFloatingText(
      x,
      y - 32,
      isBoss ? '+MINI TANK' : `+${rewardKills}`,
      isBoss ? '#ffe082' : '#ffd166'
    );

    if (isBoss) {
      this.missionText?.setText('MINI TANK DESTROYED');
      this.missionText?.setVisible(true);

      this.time.delayedCall(1300, () => {
        if (!this.isFinishing) this.missionText?.setVisible(false);
      });
    }

    if (this.kills >= this.level.killTarget) {
      this.missionText?.setText('EXTRACTION OPEN');
      this.missionText?.setVisible(true);

      this.time.delayedCall(1200, () => {
        if (!this.isFinishing) this.missionText?.setVisible(false);
      });
    }
  }

  handlePlayerDamage(
    _playerObject: Phaser.GameObjects.GameObject,
    enemyObject: Phaser.GameObjects.GameObject
  ) {
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active || this.isFinishing) return;

    const damage = enemy.getData('contactDamage') ?? 10;

    if (enemy.getData('flying')) {
      enemy.destroy();
    } else {
      const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;

      if (body) {
        body.setVelocityX(this.player.x > enemy.x ? -260 : 260);
      }
    }

    this.damagePlayer(damage);
  }

  private damagePlayer(damage: number) {
    if (this.isFinishing) return;

    this.health = Math.max(0, this.health - damage);

    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;

    if (body) {
      body.setVelocityX(this.facingDirection === 1 ? -240 : 240);
      body.setVelocityY(-220);
    }

    this.player.setTintFill(0xffffff);

    this.time.delayedCall(80, () => {
      if (this.player?.active) this.player.clearTint();
    });

    this.cameras.main.shake(120, 0.01);

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'PLAYER_HIT',
          damage
        }
      })
    );

    this.updateHud();

    if (this.health <= 0) {
      this.failMission();
    }
  }

  private checkStageProgress() {
    if (this.stageCompleted) return;

    const extractionReached = this.player.x >= this.level.extractionX - 80;
    const objectiveMet = this.kills >= this.level.killTarget;

    if (extractionReached && objectiveMet) {
      this.stageCompleted = true;
      void this.finishGame();
      return;
    }

    if (extractionReached && !objectiveMet && this.time.now - this.lastExtractionWarningAt > 1200) {
      this.lastExtractionWarningAt = this.time.now;

      this.missionText?.setText(`CLEAR ${Math.max(0, this.level.killTarget - this.kills)} MORE`);
      this.missionText?.setVisible(true);

      this.time.delayedCall(800, () => {
        if (!this.isFinishing) this.missionText?.setVisible(false);
      });
    }
  }

  async finishGame() {
    if (this.isFinishing) return;

    this.isFinishing = true;
    this.spawnTimer?.remove(false);
    this.enemyFireTimer?.remove(false);
    this.enemies.clear(true, true);
    this.enemyProjectiles.clear(true, true);

    if (this.missionText) {
      this.missionText.setText('MISSION COMPLETE');
      this.missionText.setVisible(true);
    }

    try {
      await apiClient.post('/api/game/complete', {
        runId: this.runData.run.id,
        sessionToken: this.runData.sessionToken,
        clientHash: 'level-1-side-scroller-v3',
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
    this.enemyFireTimer?.remove(false);
    this.enemies?.clear(true, true);
    this.enemyProjectiles?.clear(true, true);

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
    this.enemyFireTimer?.remove(false);
    this.enemies?.clear(true, true);
    this.enemyProjectiles?.clear(true, true);
    this.isFinishing = true;

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

  private updateHud() {
    if (!this.hudText) return;

    const cooldownLeft = Math.max(
      0,
      Math.ceil((this.abilityCooldownMs - (this.time.now - this.lastAbilityUseTime)) / 1000)
    );

    const abilityReady = this.time.now - this.lastAbilityUseTime >= this.abilityCooldownMs;
    const abilityStatus = abilityReady ? 'READY' : `${cooldownLeft}s`;

    this.hudText.setText([
      `LEVEL 1`,
      `SCORE ${String(this.kills * 100).padStart(6, '0')}`,
      `THREATS ${this.kills}/${this.level.killTarget}`,
      `${this.abilityLabel} ${abilityStatus}`
    ]);

    if (this.healthBarFill) {
      const healthProgress = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
      this.healthBarFill.width = 180 * healthProgress;
    }

    if (this.progressBarFill) {
      const progress = Phaser.Math.Clamp(this.kills / this.level.killTarget, 0, 1);
      this.progressBarFill.width = 180 * progress;
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
      y: y - 34,
      alpha: 0,
      duration: 520,
      onComplete: () => text.destroy()
    });
  }

  private createHitEffect(x: number, y: number, projectileKey: string) {
    const color =
      String(projectileKey).includes('plasma')
        ? 0x66e0ff
        : String(projectileKey).includes('rocket')
          ? 0xff8844
          : String(projectileKey).includes('sniper')
            ? 0xffffff
            : 0xffc857;

    const circle = this.add.circle(x, y, 10, color, 0.95).setDepth(800);

    this.tweens.add({
      targets: circle,
      radius: String(projectileKey).includes('rocket') ? 42 : 24,
      alpha: 0,
      duration: String(projectileKey).includes('rocket') ? 230 : 120,
      onComplete: () => circle.destroy()
    });

    if (String(projectileKey).includes('rocket')) {
      const blast = this.add.circle(x, y, 18, 0xffd166, 0.36).setDepth(799);

      this.tweens.add({
        targets: blast,
        radius: 64,
        alpha: 0,
        duration: 230,
        onComplete: () => blast.destroy()
      });
    }
  }

  private createAreaPulse(x: number, y: number, radius: number, color: number) {
    const ring = this.add.circle(x, y, 12, color, 0.18).setDepth(790);
    ring.setStrokeStyle(3, color, 0.9);

    this.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 280,
      onComplete: () => ring.destroy()
    });
  }

  private applySplashDamage(x: number, y: number, radius: number, damage: number) {
    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) return;

      const splashDamage = Math.max(1, damage - Math.floor(distance / 44));
      const nextHp = (enemy.getData('hp') ?? 1) - splashDamage;

      if (nextHp <= 0) {
        this.killEnemy(enemy, enemy.x, enemy.y);
      } else {
        enemy.setData('hp', nextHp);
      }
    });

    this.updateHud();
  }

  private applyCharacterUpgrades(stats: CharacterStats): CharacterStats {
    return {
      ...stats,
      speed: stats.speed + this.characterUpgradeLevel * 8,
      maxHealth: stats.maxHealth + this.characterUpgradeLevel * 10,
      jumpVelocity: stats.jumpVelocity + this.characterUpgradeLevel * 10
    };
  }

  private applyWeaponUpgrades(config: WeaponConfig): WeaponConfig {
    const fireRateReduction = Math.min(0.22, this.weaponUpgradeLevel * 0.04);

    return {
      ...config,
      damage: config.damage + this.weaponUpgradeLevel,
      fireRate: Math.max(55, Math.floor(config.fireRate * (1 - fireRateReduction))),
      bulletSpeed: config.bulletSpeed + this.weaponUpgradeLevel * 35,
      projectileLifetime: config.projectileLifetime + this.weaponUpgradeLevel * 70,
      pierce: (config.pierce ?? 0) + (this.weaponUpgradeLevel >= 4 ? 1 : 0)
    };
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
        this.abilityLabel = 'DEMOLITION';
        this.abilityCooldownMs = 6500;
        break;

      case 'general_goldsnout':
        this.abilityLabel = 'RALLY';
        this.abilityCooldownMs = 8000;
        break;

      default:
        this.abilityLabel = 'MUD SLOW';
        this.abilityCooldownMs = 6000;
        break;
    }

    this.abilityCooldownMs = Math.max(2200, this.abilityCooldownMs - this.characterUpgradeLevel * 350);
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
        this.useMudSlow();
        break;
    }

    this.updateHud();
  }

  private useMudSlow() {
    const radius = 170 + this.characterUpgradeLevel * 26;
    const duration = 1700 + this.characterUpgradeLevel * 260;
    const slowFactor = Math.max(0.25, 0.55 - this.characterUpgradeLevel * 0.04);

    this.createAreaPulse(this.player.x, this.player.y, radius, 0x7b5e2f);
    this.showFloatingText(this.player.x, this.player.y - 58, 'MUD SLOW', '#d7b46a');

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance > radius) return;

      const baseSpeed = enemy.getData('baseMoveSpeed') ?? enemy.getData('moveSpeed') ?? 100;

      enemy.setData('moveSpeed', baseSpeed * slowFactor);
      enemy.setTint(0x8d6e63);

      this.time.delayedCall(duration, () => {
        if (!enemy.active) return;
        enemy.setData('moveSpeed', baseSpeed);
        enemy.clearTint();
      });
    });
  }

  private useIronSlam() {
    const radius = 165 + this.characterUpgradeLevel * 20;
    const slamDamage = 2 + Math.floor(this.characterUpgradeLevel / 2);

    this.cameras.main.shake(150, 0.012);
    this.createAreaPulse(this.player.x, this.player.y, radius, 0xb0bec5);
    this.showFloatingText(this.player.x, this.player.y - 60, 'IRON SLAM', '#cfd8dc');

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance > radius) return;

      const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;

      if (body) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        this.physics.velocityFromRotation(angle, 440 + this.characterUpgradeLevel * 35, body.velocity);
      }

      const nextHp = (enemy.getData('hp') ?? 1) - slamDamage;

      if (nextHp <= 0) {
        this.killEnemy(enemy, enemy.x, enemy.y);
      } else {
        enemy.setData('hp', nextHp);
      }
    });
  }

  private useScoutDash() {
    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    body.setVelocityX(this.facingDirection * (700 + this.characterUpgradeLevel * 55));
    body.setVelocityY(Math.min(body.velocity.y, -110));

    this.createAreaPulse(this.player.x, this.player.y, 70 + this.characterUpgradeLevel * 10, 0x81c784);
    this.showFloatingText(this.player.x, this.player.y - 52, 'DASH', '#81c784');
  }

  private useFocusMode() {
    this.abilityActiveUntil = this.time.now + 3500 + this.characterUpgradeLevel * 300;
    this.player.setTint(0xd1c4e9);
    this.showFloatingText(this.player.x, this.player.y - 52, 'FOCUS', '#d1c4e9');
  }

  private useDemolitionBurst() {
    this.createAreaPulse(this.player.x, this.player.y, 95 + this.characterUpgradeLevel * 12, 0xffb74d);

    const shotCount = 5 + Math.min(3, this.characterUpgradeLevel);
    const center = (shotCount - 1) / 2;

    for (let i = 0; i < shotCount; i += 1) {
      const offset = (i - center) * 0.2;
      const shotAngle = this.aimAngle + offset;
      const muzzle = this.getMuzzlePosition(shotAngle);

      const bullet = this.projectiles.get(muzzle.x, muzzle.y, 'fallback_rocket') as Phaser.Physics.Arcade.Image;
      if (!bullet) continue;

      bullet.setTexture(this.textures.exists('rocket') ? 'rocket' : 'fallback_rocket');
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setPosition(muzzle.x, muzzle.y);
      bullet.setDepth(50);
      bullet.setDisplaySize(30, 14);
      bullet.setTint(0xffaa33);
      bullet.setData('damage', 2 + Math.floor(this.characterUpgradeLevel / 2));
      bullet.setData('projectileKey', 'fallback_rocket');
      bullet.setData('pierceLeft', 0);

      const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) continue;

      body.enable = true;
      body.reset(muzzle.x, muzzle.y);
      body.setAllowGravity(false);

      this.physics.velocityFromRotation(shotAngle, 600 + this.characterUpgradeLevel * 30, body.velocity);
      bullet.setRotation(shotAngle);

      this.time.delayedCall(850, () => {
        if (!bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        body.stop();
      });
    }

    this.showFloatingText(this.player.x, this.player.y - 52, 'DEMOLITION', '#ffb74d');
  }

  private useRallyOrder() {
    this.abilityActiveUntil = this.time.now + 4500 + this.characterUpgradeLevel * 300;
    this.player.setTint(0xffd54f);
    this.showFloatingText(this.player.x, this.player.y - 52, 'RALLY', '#ffeb3b');
  }

  private updateAbilityState() {
    if (this.abilityActiveUntil > 0 && this.time.now > this.abilityActiveUntil) {
      this.abilityActiveUntil = 0;
      this.player.clearTint();
    }
  }

  private getEffectiveFireRate() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return Math.max(45, Math.floor(this.weaponConfig.fireRate * 0.55));
    }

    if (this.currentCharacterId === 'general_goldsnout' && this.abilityActiveUntil > this.time.now) {
      return Math.max(45, Math.floor(this.weaponConfig.fireRate * 0.7));
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
      return 1 + Math.floor(this.characterUpgradeLevel / 2);
    }

    if (this.currentCharacterId === 'general_goldsnout' && this.abilityActiveUntil > this.time.now) {
      return 1 + Math.floor(this.characterUpgradeLevel / 3);
    }

    return 0;
  }

  private getProjectileSpeedBonus() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return 180 + this.characterUpgradeLevel * 20;
    }

    return 0;
  }

  private getExtraPierce() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return 1 + (this.characterUpgradeLevel >= 4 ? 1 : 0);
    }

    return 0;
  }

  private updateMoveVectorFromPointer(pointer: Phaser.Input.Pointer) {
    const baseX = MOVE_STICK_MARGIN;
    const baseY = this.scale.height - MOVE_STICK_MARGIN;

    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 0.0001) {
      this.moveVector.set(0, 0);
      return;
    }

    const clampedDistance = Math.min(distance, MOVE_STICK_MAX_DISTANCE);

    this.moveVector.set(
      (dx / distance) * (clampedDistance / MOVE_STICK_MAX_DISTANCE),
      (dy / distance) * (clampedDistance / MOVE_STICK_MAX_DISTANCE)
    );

    if (this.moveVector.y < -0.58) {
      this.wantsToJump = true;
      this.jumpHeld = true;
    }
  }

  private updateFireVectorFromPointer(pointer: Phaser.Input.Pointer) {
    const center = this.getFireButtonCenter();

    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 10) {
      this.fireVector.set(this.facingDirection, 0);
      return;
    }

    const maxDistance = FIRE_BUTTON_RADIUS + 24;
    const clampedDistance = Math.min(distance, maxDistance);

    this.fireVector.set(
      (dx / distance) * (clampedDistance / maxDistance),
      (dy / distance) * (clampedDistance / maxDistance)
    );

    if (this.fireVector.length() < FIRE_DRAG_DEADZONE) {
      this.fireVector.set(this.facingDirection, 0);
    }
  }

  private updateJoystickVisual(pointerX: number, pointerY: number) {
    if (!this.joystickThumb) return;

    const baseX = MOVE_STICK_MARGIN;
    const baseY = this.scale.height - MOVE_STICK_MARGIN;

    const dx = pointerX - baseX;
    const dy = pointerY - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let thumbX = baseX;
    let thumbY = baseY;

    if (distance > 0) {
      const clamped = Math.min(distance, MOVE_STICK_MAX_DISTANCE);
      thumbX = baseX + (dx / distance) * clamped;
      thumbY = baseY + (dy / distance) * clamped;
    }

    this.joystickThumb.setPosition(thumbX, thumbY);
  }

  private resetJoystickVisual() {
    if (!this.joystickThumb) return;

    this.joystickThumb.setPosition(MOVE_STICK_MARGIN, this.scale.height - MOVE_STICK_MARGIN);
    this.jumpHeld = false;
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    if (this.missionText) {
      this.missionText.setPosition(width / 2, 56);
    }

    if (this.pauseButton) {
      this.pauseButton.setPosition(width - 44, 44);
    }

    if (this.pauseOverlay) {
      this.pauseOverlay.setPosition(width / 2, height / 2);
    }

    const joyX = MOVE_STICK_MARGIN;
    const joyY = height - MOVE_STICK_MARGIN;

    this.joystickBase?.setPosition(joyX, joyY);
    this.joystickThumb?.setPosition(joyX, joyY);

    const fireCenter = this.getFireButtonCenter();

    this.fireButtonBase?.setPosition(fireCenter.x, fireCenter.y);
    this.fireButtonRing?.setPosition(fireCenter.x, fireCenter.y);
    this.fireButtonIcon?.setPosition(fireCenter.x, fireCenter.y + 1);

    const jumpCenter = this.getJumpButtonCenter();

    this.jumpButtonBase?.setPosition(jumpCenter.x, jumpCenter.y);
    this.jumpButtonIcon?.setPosition(jumpCenter.x, jumpCenter.y - 1);

    const abilityCenter = this.getAbilityButtonCenter();

    this.abilityButtonBase?.setPosition(abilityCenter.x, abilityCenter.y);
    this.abilityButtonIcon?.setPosition(abilityCenter.x, abilityCenter.y - 1);

    this.updateCameraZoom();
  }

  private updateCameraZoom() {
    const width = this.scale.width || 1600;
    const height = this.scale.height || 900;

    const isPhonePortrait = height > width;
    const isSmallScreen = width < 900 || height < 560;

    this.cameras.main.setZoom(isPhonePortrait ? 0.78 : isSmallScreen ? 0.88 : 1);
  }

  private cleanup() {
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.input.off('pointerup');
    this.input.off('pointerupoutside');

    this.spawnTimer?.remove(false);
    this.enemyFireTimer?.remove(false);

    this.scale.off('resize', this.handleResize, this);

    this.weaponObject?.destroy();
    this.pauseButton?.destroy();
    this.pauseOverlay?.destroy();

    this.fireButtonBase?.destroy();
    this.fireButtonRing?.destroy();
    this.fireButtonIcon?.destroy();

    this.jumpButtonBase?.destroy();
    this.jumpButtonIcon?.destroy();

    this.abilityButtonBase?.destroy();
    this.abilityButtonIcon?.destroy();

    this.joystickBase?.destroy();
    this.joystickThumb?.destroy();
  }
}
