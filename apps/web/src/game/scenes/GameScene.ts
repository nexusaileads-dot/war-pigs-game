import Phaser from 'phaser';
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

type EnemyKind = 'soldier' | 'drone' | 'tank';

type EnemyConfig = {
  kind: EnemyKind;
  textureKeys: string[];
  fallbackKey: string;
  hp: number;
  damage: number;
  speed: number;
  width: number;
  height: number;
  flying: boolean;
  score: number;
};

const WORLD_WIDTH = 4600;
const WORLD_HEIGHT = 760;
const GROUND_Y = 650;
const EXTRACTION_X = 4300;

const PLAYER_SPEED = 250;
const JUMP_SPEED = 690;
const GRAVITY_Y = 1850;

const KILL_TARGET = 6;

const ENEMIES: Record<EnemyKind, EnemyConfig> = {
  soldier: {
    kind: 'soldier',
    textureKeys: ['enemy_soldier', 'enemy-soldier', 'soldier', 'level1_soldier', 'wolf_grunt'],
    fallbackKey: 'fallback_soldier',
    hp: 2,
    damage: 8,
    speed: 70,
    width: 58,
    height: 70,
    flying: false,
    score: 100
  },
  drone: {
    kind: 'drone',
    textureKeys: ['enemy_drone', 'enemy-drone', 'drone', 'level1_drone', 'cyber_fox'],
    fallbackKey: 'fallback_drone',
    hp: 2,
    damage: 10,
    speed: 105,
    width: 62,
    height: 48,
    flying: true,
    score: 150
  },
  tank: {
    kind: 'tank',
    textureKeys: ['enemy_mini_tank', 'enemy-mini-tank', 'mini_tank', 'mini-tank', 'level1_tank', 'alpha_wolfgang'],
    fallbackKey: 'fallback_tank',
    hp: 14,
    damage: 18,
    speed: 32,
    width: 150,
    height: 88,
    flying: false,
    score: 600
  }
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;

  private extractionZone!: Phaser.GameObjects.Zone;
  private extractionText!: Phaser.GameObjects.Text;

  private hudText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private progressBar!: Phaser.GameObjects.Rectangle;
  private missionText!: Phaser.GameObjects.Text;

  private runData!: CurrentRunPayload;

  private score = 0;
  private kills = 0;
  private health = 100;
  private maxHealth = 100;

  private facing: 1 | -1 = 1;
  private lastFired = 0;
  private fireRate = 220;

  private isGameOver = false;
  private extractionUnlocked = false;
  private tankSpawned = false;

  private fireHeld = false;
  private jumpHeld = false;
  private leftHeld = false;
  private rightHeld = false;

  private enemyShootTimer?: Phaser.Time.TimerEvent;
  private missionTimer?: Phaser.Time.TimerEvent;
  private remainingSeconds = 180;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('[GameScene] Level 1 booting');

    this.createFallbackTextures();

    const storedRun = sessionStorage.getItem('currentRun');

    if (!storedRun) {
      this.failMission('NO ACTIVE MISSION');
      return;
    }

    try {
      this.runData = JSON.parse(storedRun) as CurrentRunPayload;
    } catch (error) {
      console.error('[GameScene] Invalid currentRun:', error);
      this.failMission('MISSION DATA ERROR');
      return;
    }

    if (!this.runData?.run?.id || !this.runData?.sessionToken) {
      this.failMission('MISSION SESSION ERROR');
      return;
    }

    this.physics.world.gravity.y = GRAVITY_Y;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor('#f0b66d');

    this.createBackground();
    this.createPlatforms();
    this.createGroups();
    this.createPlayer();
    this.createEnemies();
    this.createExtractionZone();
    this.createHud();
    this.createTouchControls();
    this.setupInput();
    this.setupCollisions();
    this.startTimers();

    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.setZoom(this.getCameraZoom());

    this.showMissionText('LEVEL 1: OUTSKIRTS BREACH');

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update() {
    if (this.isGameOver || !this.player?.active) return;

    this.updatePlayerMovement();
    this.updateEnemies();

    if (this.fireHeld) {
      this.shoot();
    }

    if (!this.tankSpawned && (this.player.x > 3300 || this.kills >= 5)) {
      this.spawnTank();
    }

    if (this.player.y > WORLD_HEIGHT + 80) {
      this.damagePlayer(999);
    }

    this.updateHud();
  }

  private createFallbackTextures() {
    this.makeRectTexture('fallback_player', 60, 76, 0xb46a34, 0x3b1d0d);
    this.makeRectTexture('fallback_soldier', 58, 70, 0x6f7d49, 0x202811);
    this.makeCircleTexture('fallback_drone', 30, 0xba2e2e, 0x2b0505);
    this.makeRectTexture('fallback_tank', 150, 88, 0x676b42, 0x25250f);
    this.makeRectTexture('player_bullet', 22, 8, 0xffe066, 0x5f3f00);
    this.makeRectTexture('enemy_bullet', 18, 8, 0xff4d4f, 0x5c0a0a);
  }

  private makeRectTexture(key: string, width: number, height: number, fill: number, stroke: number) {
    if (this.textures.exists(key)) return;

    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(0, 0, width, height, 8);
    g.lineStyle(3, stroke, 1);
    g.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, 8);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  private makeCircleTexture(key: string, radius: number, fill: number, stroke: number) {
    if (this.textures.exists(key)) return;

    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillCircle(radius, radius, radius);
    g.lineStyle(3, stroke, 1);
    g.strokeCircle(radius, radius, radius - 2);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  private createBackground() {
    const bgKeys = [
      'level1-left',
      'level1_left',
      'level1-bg-left',
      'level1-background-left',
      'background'
    ];

    const bgKey = this.resolveTexture(bgKeys, '');

    if (bgKey) {
      const bg = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, bgKey);
      bg.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
      bg.setDepth(-50);
      bg.setScrollFactor(0.55);
    }

    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0xf0b66d)
      .setDepth(-60);

    this.add.circle(3600, 110, 58, 0xfff6d7, 1).setDepth(-55).setScrollFactor(0.35);

    for (let i = 0; i < 14; i += 1) {
      const x = i * 360 + 120;
      const h = Phaser.Math.Between(150, 290);

      this.add.rectangle(x, GROUND_Y - 110 - h / 2, Phaser.Math.Between(180, 320), h, 0x6d6458, 0.22)
        .setDepth(-54)
        .setScrollFactor(0.4)
        .setRotation(Phaser.Math.FloatBetween(-0.08, 0.08));
    }

    for (let i = 0; i < 9; i += 1) {
      this.add.ellipse(i * 540 + 250, 140, 260, 70, 0xffefd0, 0.45)
        .setDepth(-56)
        .setScrollFactor(0.22);
    }
  }

  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    this.createPlatform(WORLD_WIDTH / 2, GROUND_Y + 44, WORLD_WIDTH, 90, 0x3c2b21);
    this.createPlatform(WORLD_WIDTH / 2, GROUND_Y, WORLD_WIDTH, 28, 0xb8a07d);

    this.createPlatform(690, 520, 360, 34, 0x7b704c);
    this.createPlatform(1240, 430, 390, 34, 0x6c744a);
    this.createPlatform(1840, 535, 360, 34, 0x9a7c5a);
    this.createPlatform(2450, 450, 420, 34, 0x7b704c);
    this.createPlatform(3180, 530, 420, 34, 0x9a7c5a);
    this.createPlatform(3820, 445, 420, 34, 0x6c744a);

    this.createDecorationBuilding(340, GROUND_Y - 138, 420, 260, 0xd0c8b8);
    this.createDecorationBuilding(1420, GROUND_Y - 164, 520, 310, 0xcfc5ad);
    this.createDecorationBuilding(2580, GROUND_Y - 145, 480, 270, 0xd6d0c1);
    this.createDecorationBuilding(3920, GROUND_Y - 175, 520, 330, 0xd4ccc0);

    this.createCrate(900, 480);
    this.createCrate(1500, 390);
    this.createCrate(2700, 410);
    this.createCrate(3520, 495);
  }

  private createPlatform(x: number, y: number, width: number, height: number, color: number) {
    const platform = this.add.rectangle(x, y, width, height, color, 1).setDepth(1);
    platform.setStrokeStyle(2, 0x2b2118, 0.65);

    this.physics.add.existing(platform, true);

    const body = platform.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(width, height);
    body.updateFromGameObject();

    this.platforms.add(platform);
  }

  private createCrate(x: number, y: number) {
    this.createPlatform(x, y, 72, 72, 0x9b7448);

    this.add.line(x, y, -30, -30, 30, 30, 0x4b2d13, 0.7).setLineWidth(4).setDepth(3);
    this.add.line(x, y, 30, -30, -30, 30, 0x4b2d13, 0.7).setLineWidth(4).setDepth(3);
  }

  private createDecorationBuilding(x: number, y: number, width: number, height: number, color: number) {
    this.add.rectangle(x, y, width, height, color, 0.88).setDepth(-2);
    this.add.rectangle(x, y - height / 2 - 22, width + 30, 36, 0x918777, 0.92).setDepth(-1);

    for (let i = 0; i < 3; i += 1) {
      this.add.rectangle(x - width * 0.25 + i * width * 0.25, y - height * 0.12, 56, 68, 0x264047, 0.82)
        .setDepth(-1);
    }

    this.add.rectangle(x + width * 0.25, y + height * 0.25, 76, 112, 0x5f6d56, 0.9).setDepth(-1);
  }

  private createGroups() {
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 80
    });

    this.enemyBullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 80
    });

    this.enemies = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 20
    });
  }

  private createPlayer() {
    const textureKey = this.resolveTexture(
      [this.runData.run.characterId, 'grunt_bacon', 'player', 'fallback_player'],
      'fallback_player'
    );

    this.player = this.physics.add.sprite(140, GROUND_Y - 70, textureKey);
    this.player.setDisplaySize(72, 72);
    this.player.setDepth(20);
    this.player.setCollideWorldBounds(true);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(34, 54);
    body.setOffset(19, 16);
    body.setDragX(1100);
    body.setMaxVelocity(PLAYER_SPEED * 1.15, 1100);
  }

  private createEnemies() {
    this.spawnEnemy('soldier', 760, GROUND_Y - 70);
    this.spawnEnemy('soldier', 1260, 360);
    this.spawnEnemy('drone', 1880, 330);
    this.spawnEnemy('soldier', 2520, GROUND_Y - 70);
    this.spawnEnemy('soldier', 3220, GROUND_Y - 70);
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number) {
    const config = ENEMIES[kind];
    const textureKey = this.resolveTexture(config.textureKeys, config.fallbackKey);

    const enemy = this.enemies.get(x, y, textureKey) as Phaser.Physics.Arcade.Sprite;

    enemy.setTexture(textureKey);
    enemy.setPosition(x, y);
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setDisplaySize(config.width, config.height);
    enemy.setDepth(config.flying ? 18 : 17);
    enemy.clearTint();

    enemy.setData('kind', config.kind);
    enemy.setData('hp', config.hp);
    enemy.setData('damage', config.damage);
    enemy.setData('speed', config.speed);
    enemy.setData('flying', config.flying);
    enemy.setData('score', config.score);
    enemy.setData('lastShot', 0);

    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(!config.flying);
    body.setCollideWorldBounds(false);
    body.setSize(config.width * 0.7, config.height * 0.8);
    body.setOffset(config.width * 0.15, config.height * 0.1);

    return enemy;
  }

  private spawnTank() {
    if (this.tankSpawned) return;

    this.tankSpawned = true;
    const tank = this.spawnEnemy('tank', 3900, GROUND_Y - 80);
    tank.setData('isTank', true);
    tank.setTint(0xffe0a3);

    this.showMissionText('MINI TANK INCOMING');
  }

  private createExtractionZone() {
    this.extractionZone = this.add.zone(EXTRACTION_X, GROUND_Y - 70, 110, 120);
    this.physics.add.existing(this.extractionZone, true);

    this.add.rectangle(EXTRACTION_X, GROUND_Y - 70, 110, 120, 0x00ff00, 0.12)
      .setStrokeStyle(3, 0x00ff00, 0.45)
      .setDepth(4);

    this.extractionText = this.add.text(EXTRACTION_X, GROUND_Y - 155, 'EXTRACTION\nLOCKED', {
      fontSize: '18px',
      color: '#ff4d4f',
      align: 'center',
      fontStyle: 'bold',
      backgroundColor: '#00000099',
      padding: { left: 8, right: 8, top: 5, bottom: 5 }
    }).setOrigin(0.5).setDepth(5);
  }

  private createHud() {
    this.hudText = this.add.text(16, 16, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#000000aa',
      padding: { left: 8, right: 8, top: 6, bottom: 6 }
    }).setScrollFactor(0).setDepth(1000);

    this.add.rectangle(16, 94, 180, 12, 0x151515, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.healthBar = this.add.rectangle(16, 94, 180, 12, 0xff4d4f, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    this.add.rectangle(16, 112, 180, 9, 0x151515, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.progressBar = this.add.rectangle(16, 112, 0, 9, 0xffd166, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    this.missionText = this.add.text(this.scale.width / 2, 58, '', {
      fontSize: '24px',
      color: '#ffdd57',
      fontStyle: 'bold',
      backgroundColor: '#000000aa',
      padding: { left: 12, right: 12, top: 8, bottom: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1200).setVisible(false);
  }

  private createTouchControls() {
    const makeButton = (
      x: number,
      y: number,
      radius: number,
      label: string,
      border: number,
      onDown: () => void,
      onUp: () => void
    ) => {
      const circle = this.add.circle(x, y, radius, 0x070707, 0.78)
        .setStrokeStyle(4, border, 0.9)
        .setScrollFactor(0)
        .setDepth(1300)
        .setInteractive();

      const text = this.add.text(x, y, label, {
        fontSize: radius > 36 ? '13px' : '11px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1301);

      circle.on('pointerdown', onDown);
      circle.on('pointerup', onUp);
      circle.on('pointerout', onUp);

      return { circle, text };
    };

    const h = this.scale.height;
    const w = this.scale.width;

    makeButton(72, h - 82, 40, 'LEFT', 0xffb347, () => {
      this.leftHeld = true;
      this.facing = -1;
    }, () => {
      this.leftHeld = false;
    });

    makeButton(164, h - 82, 40, 'RIGHT', 0xffb347, () => {
      this.rightHeld = true;
      this.facing = 1;
    }, () => {
      this.rightHeld = false;
    });

    makeButton(w - 90, h - 88, 44, 'FIRE', 0xff9f1c, () => {
      this.fireHeld = true;
      this.shoot();
    }, () => {
      this.fireHeld = false;
    });

    makeButton(w - 48, h - 160, 34, 'JUMP', 0xffb347, () => {
      this.jumpHeld = true;
      this.jump();
    }, () => {
      this.jumpHeld = false;
    });

    makeButton(w - 52, 58, 32, 'Ⅱ', 0xffb347, () => {
      this.pauseMission();
    }, () => {});
  }

  private setupInput() {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();

    this.wasd = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.keyboard.on('keydown-SPACE', () => this.jump());
    this.input.keyboard.on('keydown-J', () => this.shoot());
    this.input.keyboard.on('keydown-P', () => this.pauseMission());

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) return;
      this.shoot();
    });
  }

  private setupCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);

    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.handleBulletEnemy,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.enemyBullets,
      this.player,
      this.handleEnemyBulletPlayer,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerEnemy,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.extractionZone,
      this.tryExtraction,
      undefined,
      this
    );
  }

  private startTimers() {
    this.enemyShootTimer = this.time.addEvent({
      delay: 1200,
      callback: this.enemyShootCycle,
      callbackScope: this,
      loop: true
    });

    this.missionTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.remainingSeconds -= 1;

        if (this.remainingSeconds <= 0) {
          this.failMission('TIME EXPIRED');
        }
      },
      loop: true
    });
  }

  private updatePlayerMovement() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let horizontal = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown || this.leftHeld) horizontal -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown || this.rightHeld) horizontal += 1;

    body.setVelocityX(horizontal * PLAYER_SPEED);

    if (horizontal !== 0) {
      this.facing = horizontal > 0 ? 1 : -1;
      this.player.setFlipX(this.facing < 0);
    }

    if ((this.cursors.up.isDown || this.wasd.up.isDown) && body.blocked.down) {
      this.jump();
    }
  }

  private jump() {
    if (this.isGameOver) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (body.blocked.down || body.touching.down) {
      body.setVelocityY(-JUMP_SPEED);
    }
  }

  private shoot() {
    if (this.isGameOver) return;

    const now = this.time.now;

    if (now - this.lastFired < this.fireRate) return;

    this.lastFired = now;

    const bullet = this.bullets.get(
      this.player.x + this.facing * 38,
      this.player.y + 2,
      'player_bullet'
    ) as Phaser.Physics.Arcade.Image;

    if (!bullet) return;

    bullet.setTexture('player_bullet');
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setPosition(this.player.x + this.facing * 38, this.player.y + 2);
    bullet.setDisplaySize(22, 8);
    bullet.setDepth(30);
    bullet.setRotation(this.facing === 1 ? 0 : Math.PI);
    bullet.setData('damage', 1);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    body.setVelocityX(this.facing * 780);
    body.setVelocityY(0);

    this.time.delayedCall(1200, () => {
      if (!bullet.active) return;
      bullet.setActive(false);
      bullet.setVisible(false);
      body.stop();
    });
  }

  private enemyShootCycle() {
    if (this.isGameOver) return;

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;

      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (distance > 760) return;

      const kind = enemy.getData('kind') as EnemyKind;
      const chance = kind === 'tank' ? 1 : kind === 'drone' ? 0.65 : 0.35;

      if (Math.random() <= chance) {
        this.enemyShoot(enemy);
      }
    });
  }

  private enemyShoot(enemy: Phaser.Physics.Arcade.Sprite) {
    const kind = enemy.getData('kind') as EnemyKind;
    const damage = kind === 'tank' ? 14 : kind === 'drone' ? 8 : 6;
    const speed = kind === 'tank' ? 430 : 360;

    const bullet = this.enemyBullets.get(enemy.x, enemy.y, 'enemy_bullet') as Phaser.Physics.Arcade.Image;

    if (!bullet) return;

    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);

    bullet.setTexture('enemy_bullet');
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setPosition(enemy.x, enemy.y);
    bullet.setDisplaySize(kind === 'tank' ? 26 : 18, kind === 'tank' ? 10 : 8);
    bullet.setDepth(29);
    bullet.setRotation(angle);
    bullet.setData('damage', damage);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);

    this.physics.velocityFromRotation(angle, speed, body.velocity);

    this.time.delayedCall(1500, () => {
      if (!bullet.active) return;
      bullet.setActive(false);
      bullet.setVisible(false);
      body.stop();
    });
  }

  private updateEnemies() {
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;

      if (!enemy.active) return;

      const body = enemy.body as Phaser.Physics.Arcade.Body;
      const kind = enemy.getData('kind') as EnemyKind;
      const speed = enemy.getData('speed') as number;
      const direction = this.player.x > enemy.x ? 1 : -1;

      enemy.setFlipX(direction < 0);

      if (kind === 'drone') {
        const targetY = Phaser.Math.Clamp(this.player.y - 85, 220, GROUND_Y - 190);
        const yDirection = targetY > enemy.y ? 1 : -1;

        body.setVelocityX(direction * speed);
        body.setVelocityY(Math.abs(targetY - enemy.y) > 20 ? yDirection * speed * 0.55 : 0);
        return;
      }

      if (kind === 'tank') {
        body.setVelocityX(Math.abs(this.player.x - enemy.x) > 330 ? direction * speed : 0);
        return;
      }

      body.setVelocityX(Math.abs(this.player.x - enemy.x) > 120 ? direction * speed : 0);
    });
  }

  private handleBulletEnemy = (
    bulletObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObject: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) => {
    const bullet = bulletObject as Phaser.Physics.Arcade.Image;
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;

    if (!bullet.active || !enemy.active) return;

    bullet.setActive(false);
    bullet.setVisible(false);
    (bullet.body as Phaser.Physics.Arcade.Body).stop();

    const damage = bullet.getData('damage') ?? 1;
    const nextHp = (enemy.getData('hp') ?? 1) - damage;

    this.createHitEffect(enemy.x, enemy.y);

    if (nextHp > 0) {
      enemy.setData('hp', nextHp);
      enemy.setTintFill(0xffffff);

      this.time.delayedCall(70, () => {
        if (enemy.active) enemy.clearTint();
      });

      return;
    }

    this.killEnemy(enemy);
  };

  private handleEnemyBulletPlayer = (
    playerObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    bulletObject: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) => {
    const bullet = bulletObject as Phaser.Physics.Arcade.Image;

    if (!bullet.active) return;

    bullet.setActive(false);
    bullet.setVisible(false);
    (bullet.body as Phaser.Physics.Arcade.Body).stop();

    this.damagePlayer(bullet.getData('damage') ?? 8);
  };

  private handlePlayerEnemy = (
    playerObject: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemyObject: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) => {
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;

    if (!enemy.active) return;

    const now = this.time.now;
    const lastTouch = enemy.getData('lastTouch') ?? 0;

    if (now - lastTouch < 900) return;

    enemy.setData('lastTouch', now);

    this.damagePlayer(enemy.getData('damage') ?? 8);
  };

  private damagePlayer(amount: number) {
    if (this.isGameOver) return;

    this.health = Math.max(0, this.health - amount);

    this.player.setTintFill(0xffffff);

    this.time.delayedCall(80, () => {
      if (this.player?.active) this.player.clearTint();
    });

    this.cameras.main.shake(100, 0.008);

    if (this.health <= 0) {
      this.failMission('MISSION FAILED');
    }
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    const kind = enemy.getData('kind') as EnemyKind;
    const score = enemy.getData('score') ?? 100;

    enemy.destroy();

    this.kills += kind === 'tank' ? 1 : 1;
    this.score += score;

    if (kind === 'tank') {
      this.showMissionText('MINI TANK DESTROYED');
    }

    if (this.kills >= KILL_TARGET && !this.extractionUnlocked) {
      this.unlockExtraction();
    }
  }

  private unlockExtraction() {
    this.extractionUnlocked = true;
    this.extractionText.setText('EXTRACTION\nREADY');
    this.extractionText.setColor('#00ff00');
    this.showMissionText('EXTRACTION OPEN');
  }

  private tryExtraction = () => {
    if (this.isGameOver) return;

    if (!this.extractionUnlocked) {
      this.showMissionText(`CLEAR ${Math.max(0, KILL_TARGET - this.kills)} MORE`);
      return;
    }

    void this.completeMission();
  };

  private async completeMission() {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.stopTimers();
    this.showMissionText('MISSION COMPLETE');

    try {
      await apiClient.post('/api/game/complete', {
        runId: this.runData.run.id,
        sessionToken: this.runData.sessionToken,
        clientHash: 'level-1-fixed',
        stats: {
          kills: this.kills,
          damageDealt: this.score,
          damageTaken: this.maxHealth - this.health,
          accuracy: 0.8,
          timeElapsed: 180 - this.remainingSeconds,
          wavesCleared: 1,
          bossKilled: this.tankSpawned
        }
      });
    } catch (error) {
      console.error('[GameScene] Failed to complete mission:', error);
    }

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'STATE_CHANGE',
          state: 'victory'
        }
      })
    );
  }

  private failMission(reason: string) {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.stopTimers();

    if (this.missionText) {
      this.showMissionText(reason);
    }

    try {
      if (this.runData?.run?.id && this.runData?.sessionToken) {
        void apiClient.post('/api/game/fail', {
          runId: this.runData.run.id,
          sessionToken: this.runData.sessionToken
        });
      }
    } catch (error) {
      console.error('[GameScene] Failed to report failed mission:', error);
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

  private pauseMission() {
    if (this.isGameOver) return;

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'STATE_CHANGE',
          state: 'paused'
        }
      })
    );

    this.scene.pause();
  }

  private updateHud() {
    if (!this.hudText) return;

    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;

    this.hudText.setText([
      'LEVEL 1',
      `SCORE ${String(this.score).padStart(6, '0')}`,
      `KILLS ${this.kills}/${KILL_TARGET}`,
      `TIME ${mins}:${secs.toString().padStart(2, '0')}`
    ]);

    this.healthBar.width = 180 * Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
    this.progressBar.width = 180 * Phaser.Math.Clamp(this.kills / KILL_TARGET, 0, 1);
  }

  private showMissionText(text: string) {
    if (!this.missionText) return;

    this.missionText.setText(text);
    this.missionText.setVisible(true);

    this.time.delayedCall(1300, () => {
      if (!this.isGameOver && this.missionText) {
        this.missionText.setVisible(false);
      }
    });
  }

  private createHitEffect(x: number, y: number) {
    const flash = this.add.circle(x, y, 10, 0xffd166, 0.9).setDepth(100);

    this.tweens.add({
      targets: flash,
      radius: 24,
      alpha: 0,
      duration: 130,
      onComplete: () => flash.destroy()
    });
  }

  private stopTimers() {
    this.enemyShootTimer?.remove(false);
    this.missionTimer?.remove(false);
  }

  private resolveTexture(keys: string[], fallback: string) {
    for (const key of keys) {
      if (key && this.textures.exists(key)) {
        return key;
      }
    }

    return fallback;
  }

  private getCameraZoom() {
    const width = this.scale.width || 1600;
    const height = this.scale.height || 900;

    if (height > width) return 0.78;
    if (width < 900 || height < 560) return 0.88;

    return 1;
  }

  private handleResize() {
    this.cameras.main.setZoom(this.getCameraZoom());

    if (this.missionText) {
      this.missionText.setPosition(this.scale.width / 2, 58);
    }
  }

  private cleanup() {
    this.stopTimers();
    this.scale.off('resize', this.handleResize, this);
  }
  }
