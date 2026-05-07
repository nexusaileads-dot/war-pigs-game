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

// LANDSCAPE WORLD DIMENSIONS
const WORLD_WIDTH = 4600;
const WORLD_HEIGHT = 1280;
const GROUND_Y = 1100;
const EXTRACTION_X = 4300;

const PLAYER_SPEED = 320;
const JUMP_SPEED = 820;
const GRAVITY_Y = 2200;

const KILL_TARGET = 6;

const ENEMIES: Record<EnemyKind, EnemyConfig> = {
  soldier: {
    kind: 'soldier',
    textureKeys: ['level1_soldier', 'enemy_soldier'],
    fallbackKey: 'fallback_soldier',
    hp: 2,
    damage: 8,
    speed: 90,
    width: 64,
    height: 64,
    flying: false,
    score: 100
  },
  drone: {
    kind: 'drone',
    textureKeys: ['level1_drone', 'enemy_drone'],
    fallbackKey: 'fallback_drone',
    hp: 2,
    damage: 10,
    speed: 130,
    width: 64,
    height: 48,
    flying: true,
    score: 150
  },
  tank: {
    kind: 'tank',
    textureKeys: ['level1_mini_tank', 'enemy_mini_tank'],
    fallbackKey: 'fallback_tank',
    hp: 14,
    damage: 18,
    speed: 50,
    width: 140,
    height: 100,
    flying: false,
    score: 600
  }
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private weapon!: Phaser.GameObjects.Sprite; // Added Weapon Sprite
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
    this.cameras.main.setBackgroundColor('#87CEEB'); // Sky Blue

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

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(this.getCameraZoom());

    this.showMissionText('LEVEL 1: OUTSKIRTS BREACH');

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update() {
    if (this.isGameOver || !this.player?.active) return;

    this.updatePlayerMovement();
    this.updateWeaponPosition(); // Sync weapon to player
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
    this.makeRectTexture('fallback_player', 64, 64, 0xb46a34, 0x3b1d0d);
    this.makeRectTexture('fallback_soldier', 64, 64, 0x6f7d49, 0x202811);
    this.makeCircleTexture('fallback_drone', 30, 0xba2e2e, 0x2b0505);
    this.makeRectTexture('fallback_tank', 140, 100, 0x676b42, 0x25250f);
    this.makeRectTexture('player_bullet', 22, 8, 0xffe066, 0x5f3f00);
    this.makeRectTexture('enemy_bullet', 18, 8, 0xff4d4f, 0x5c0a0a);
    this.makeRectTexture('fallback_weapon', 40, 20, 0x555555, 0x333333);
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
    // Sky
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x87CEEB).setDepth(-60);
    
    // Background Hills (Parallax)
    for (let i = 0; i < 12; i++) {
      const x = i * 500;
      this.add.triangle(x, GROUND_Y, 0, 0, -250, Phaser.Math.Between(200, 400), 250, Phaser.Math.Between(200, 400), 0x4a6741, 1).setDepth(-55).setScrollFactor(0.3);
    }

    // Ground
    this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y + 50, WORLD_WIDTH, 200, 0x3c2b21).setDepth(-1);
    this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y, WORLD_WIDTH, 20, 0xb8a07d).setDepth(0);
  }

  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    // Floating Platforms for Landscape layout
    this.createPlatform(700, GROUND_Y - 250, 300, 40, 0x7b704c);
    this.createPlatform(1400, GROUND_Y - 400, 300, 40, 0x6c744a);
    this.createPlatform(2100, GROUND_Y - 250, 300, 40, 0x9a7c5a);
    this.createPlatform(2800, GROUND_Y - 350, 300, 40, 0x7b704c);
    this.createPlatform(3500, GROUND_Y - 300, 300, 40, 0x9a7c5a);
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

  private createGroups() {
    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 80 });
    this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 80 });
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 20 });
  }

  private createPlayer() {
    const charKey = this.resolveTexture([this.runData.run.characterId, 'grunt_bacon'], 'fallback_player');
    const weaponKey = this.resolveTexture([this.runData.run.weaponId, 'oink_pistol'], 'fallback_weapon');

    // Create Player
    this.player = this.physics.add.sprite(140, GROUND_Y - 70, charKey);
    this.player.setDisplaySize(72, 72);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(34, 54);
    body.setOffset(19, 16);
    body.setDragX(1100);

    // Create Weapon (Attached to Player)
    this.weapon = this.add.sprite(this.player.x, this.player.y, weaponKey);
    this.weapon.setDepth(21);
    this.weapon.setScale(0.8);
  }

  private updateWeaponPosition() {
    if (!this.weapon || !this.player) return;
    
    // Offset weapon slightly in front of player
    const offsetX = this.facing === 1 ? 25 : -25;
    this.weapon.setPosition(this.player.x + offsetX, this.player.y + 15);
    this.weapon.setFlipX(this.facing === -1);
  }

  private createEnemies() {
    this.spawnEnemy('soldier', 800, GROUND_Y - 70);
    this.spawnEnemy('soldier', 1500, GROUND_Y - 70);
    this.spawnEnemy('drone', 2000, GROUND_Y - 300);
    this.spawnEnemy('soldier', 2600, GROUND_Y - 70);
    this.spawnEnemy('soldier', 3200, GROUND_Y - 70);
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number) {
    const config = ENEMIES[kind];
    const textureKey = this.resolveTexture(config.textureKeys, config.fallbackKey);

    const enemy = this.enemies.get(x, y, textureKey) as Phaser.Physics.Arcade.Sprite;
    enemy.setActive(true).setVisible(true);
    enemy.setDisplaySize(config.width, config.height);
    enemy.setDepth(17);

    enemy.setData('kind', config.kind);
    enemy.setData('hp', config.hp);
    enemy.setData('speed', config.speed);
    enemy.setData('flying', config.flying);

    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(!config.flying);
    body.setCollideWorldBounds(false);

    return enemy;
  }

  private spawnTank() {
    if (this.tankSpawned) return;
    this.tankSpawned = true;
    const tank = this.spawnEnemy('tank', 3900, GROUND_Y - 80);
    tank.setTint(0xffe0a3);
    this.showMissionText('MINI TANK INCOMING');
  }

  private createExtractionZone() {
    const x = WORLD_WIDTH - 300;
    this.extractionZone = this.add.zone(x, GROUND_Y - 70, 110, 120);
    this.physics.add.existing(this.extractionZone, true);
    this.add.rectangle(x, GROUND_Y - 70, 110, 120, 0x00ff00, 0.12).setStrokeStyle(3, 0x00ff00, 0.45).setDepth(4);
    
    this.extractionText = this.add.text(x, GROUND_Y - 140, 'EXTRACTION\nLOCKED', {
      fontSize: '18px', color: '#ff4d4f', align: 'center', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
  }

  private updatePlayerMovement() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let horizontal = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown || this.leftHeld) horizontal -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown || this.rightHeld) horizontal += 1;

    body.setVelocityX(horizontal * PLAYER_SPEED);

    if (horizontal !== 0) {
      this.facing = horizontal > 0 ? 1 : -1;
      this.player.setFlipX(this.facing === -1);
    }

    if ((this.cursors.up.isDown || this.wasd.up.isDown || this.jumpHeld) && body.blocked.down) {
      body.setVelocityY(JUMP_SPEED);
    }
  }

  private updateEnemies() {
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const body = enemy.body as Phaser.Physics.Arcade.Body;
      const speed = enemy.getData('speed');
      const flying = enemy.getData('flying');
      const direction = this.player.x > enemy.x ? 1 : -1;

      // FIX: Inverted Flip Logic (Sprites face Left by default)
      enemy.setFlipX(direction === 1);

      const distance = Math.abs(this.player.x - enemy.x);

      if (flying) {
        body.setVelocityX(direction * speed);
        const targetY = this.player.y - 100;
        if (enemy.y > targetY) body.setVelocityY(-speed * 0.5);
        else body.setVelocityY(speed * 0.5);
      } else {
        if (distance > 100) body.setVelocityX(direction * speed);
        else body.setVelocityX(0);
      }
    });
  }

  private shoot() {
    if (this.isGameOver) return;
    const now = this.time.now;
    if (now - this.lastFired < this.fireRate) return;
    this.lastFired = now;

    const bullet = this.bullets.get(this.player.x, this.player.y, 'bullet') as Phaser.Physics.Arcade.Image;
    if (!bullet) return;

    bullet.setActive(true).setVisible(true);
    bullet.setPosition(this.player.x + (this.facing * 30), this.player.y + 15);
    bullet.setDepth(30);
    bullet.setRotation(this.facing === 1 ? 0 : Math.PI);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    body.setVelocityX(this.facing * 800);

    this.time.delayedCall(1000, () => {
      bullet.setActive(false).setVisible(false);
    });
  }

  private enemyShoot(enemy: Phaser.Physics.Arcade.Sprite) {
    const bullet = this.enemyBullets.get(enemy.x, enemy.y, 'enemy_bullet') as Phaser.Physics.Arcade.Image;
    if (!bullet) return;

    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    
    bullet.setActive(true).setVisible(true);
    bullet.setRotation(angle);
    bullet.setDepth(29);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    
    this.physics.velocityFromRotation(angle, 400, body.velocity);

    this.time.delayedCall(2000, () => {
      bullet.setActive(false).setVisible(false);
    });
  }

  private enemyShootCycle() {
    if (this.isGameOver) return;
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (distance < 600 && Math.random() < 0.3) {
        this.enemyShoot(enemy);
      }
    });
  }

  private setupInput() {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.keyboard.on('keydown-SPACE', () => this.shoot());
  }

  private setupCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      (b as Phaser.GameObjects.GameObject).setActive(false).setVisible(false);
      const enemy = e as Phaser.Physics.Arcade.Sprite;
      const hp = enemy.getData('hp') - 1;
      if (hp <= 0) {
        this.kills++;
        this.score += 100;
        enemy.destroy();
        if (this.kills >= KILL_TARGET) this.unlockExtraction();
      } else {
        enemy.setData('hp', hp);
      }
    }, undefined, this);

    this.physics.add.overlap(this.enemyBullets, this.player, (p, b) => {
      (b as Phaser.GameObjects.GameObject).setActive(false).setVisible(false);
      this.damagePlayer(10);
    }, undefined, this);

    this.physics.add.overlap(this.player, this.extractionZone, () => {
      if (this.extractionUnlocked) this.completeMission();
    }, undefined, this);
  }

  private startTimers() {
    this.enemyShootTimer = this.time.addEvent({ delay: 2000, callback: this.enemyShootCycle, callbackScope: this, loop: true });
    this.missionTimer = this.time.addEvent({ delay: 1000, callback: () => {
      this.remainingSeconds--;
      if (this.remainingSeconds <= 0) this.failMission('TIME UP');
    }, loop: true });
  }

  private damagePlayer(amount: number) {
    if (this.isGameOver) return;
    this.health -= amount;
    this.cameras.main.shake(100, 0.01);
    if (this.health <= 0) this.failMission('DIED');
  }

  private unlockExtraction() {
    this.extractionUnlocked = true;
    this.extractionText.setText('EXTRACTION\nREADY').setColor('#00ff00');
    this.showMissionText('EXTRACTION UNLOCKED');
  }

  private async completeMission() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.showMissionText('MISSION COMPLETE');
    
    try {
      await apiClient.post('/api/game/complete', {
        runId: this.runData.run.id,
        sessionToken: this.runData.sessionToken,
        clientHash: 'lvl1-done',
        stats: { kills: this.kills, damageDealt: this.score, damageTaken: 0, accuracy: 1, timeElapsed: 0, wavesCleared: 1, bossKilled: false }
      });
    } catch (e) { console.error(e); }

    window.dispatchEvent(new CustomEvent('WAR_PIGS_EVENT', { detail: { type: 'STATE_CHANGE', state: 'victory' } }));
  }

  private failMission(reason: string) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.showMissionText(reason);
    window.dispatchEvent(new CustomEvent('WAR_PIGS_EVENT', { detail: { type: 'STATE_CHANGE', state: 'defeat' } }));
  }

  private showMissionText(text: string) {
    if (!this.missionText) return;
    this.missionText.setText(text).setVisible(true);
    this.time.delayedCall(2000, () => this.missionText.setVisible(false));
  }

  private createHud() {
    this.hudText = this.add.text(16, 16, '', { fontSize: '16px', fontFamily: 'monospace', color: '#fff', backgroundColor: '#00000088', padding: { x: 10, y: 5 } }).setScrollFactor(0).setDepth(100);
    
    this.healthBar = this.add.rectangle(16, 70, 200, 16, 0xff4d4f).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
    this.progressBar = this.add.rectangle(16, 90, 0, 10, 0xffd166).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

    this.missionText = this.add.text(this.scale.width / 2, 100, '', { fontSize: '32px', color: '#ffdd57', fontStyle: 'bold' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
  }

  private updateHud() {
    this.hudText.setText(`KILLS: ${this.kills}/${KILL_TARGET} | TIME: ${this.remainingSeconds}`);
    this.healthBar.width = 200 * (this.health / this.maxHealth);
    this.progressBar.width = 200 * (this.kills / KILL_TARGET);
  }

  private createTouchControls() {
    const y = this.scale.height - 100;
    this.addButton(100, y, 'LEFT', () => this.leftHeld = true, () => this.leftHeld = false);
    this.addButton(200, y, 'RIGHT', () => this.rightHeld = true, () => this.rightHeld = false);
    this.addButton(this.scale.width - 100, y, 'FIRE', () => this.fireHeld = true, () => this.fireHeld = false);
    this.addButton(this.scale.width - 200, y, 'JUMP', () => this.jumpHeld = true, () => this.jumpHeld = false);
  }

  private addButton(x: number, y: number, text: string, onDown: () => void, onUp: () => void) {
    const btn = this.add.circle(x, y, 40, 0x000000, 0.5).setInteractive().setScrollFactor(0).setDepth(100);
    this.add.text(x, y, text, { fontSize: '12px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btn.on('pointerdown', onDown).on('pointerup', onUp).on('pointerout', onUp);
  }

  private resolveTexture(keys: string[], fallback: string) {
    for (const key of keys) {
      if (key && this.textures.exists(key)) return key;
    }
    return fallback;
  }

  private getCameraZoom() {
    const height = this.scale.height;
    // Zoom out slightly on smaller landscape screens to show more vertical space
    if (height < 500) return 0.8;
    if (height < 800) return 0.9;
    return 1;
  }

  private handleResize() {
    if (this.missionText) this.missionText.setPosition(this.scale.width / 2, 100);
  }

  private cleanup() {
    this.enemyShootTimer?.remove();
    this.missionTimer?.remove();
  }
}
