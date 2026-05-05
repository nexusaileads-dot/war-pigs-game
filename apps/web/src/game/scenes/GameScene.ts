import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private extractionZone!: Phaser.GameObjects.Zone;
  private score: number = 0;
  private kills: number = 0;
  private health: number = 100;
  private maxHealth: number = 100;
  private ammo: number = 30;
  private maxAmmo: number = 30;
  private isExtractionUnlocked: boolean = false;
  private killTarget: number = 6;
  private timerText!: Phaser.GameObjects.Text;
  private healthText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private extractionText!: Phaser.GameObjects.Text;
  private lastFired: number = 0;
  private fireRate: number = 150;
  private gameTime: number = 300; // 5 minutes in seconds
  private timerEvent!: Phaser.Time.TimerEvent;
  private isGameOver: boolean = false;
  private miniTank!: Phaser.Physics.Arcade.Sprite;
  private miniTankHealth: number = 100;
  private miniTankActive: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('[GameScene] Creating Level 1: Outskirts Breach');

    // Load session data
    const sessionData = sessionStorage.getItem('currentRun');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      console.log('[GameScene] Session loaded:', session);
    }

    // Setup world
    this.physics.world.setBounds(0, 0, 2400, 600);
    this.cameras.main.setBounds(0, 0, 2400, 600);
    // Create background
    this.createBackground();

    // Create platforms
    this.createPlatforms();

    // Create player
    this.createPlayer();

    // Create enemies
    this.createEnemies();

    // Create extraction zone
    this.createExtractionZone();

    // Create UI
    this.createUI();

    // Setup collisions
    this.setupCollisions();

    // Start timer
    this.startTimer();

    // Spawn mini tank after 30 seconds or 4 kills
    this.time.delayedCall(30000, () => this.spawnMiniTank());
  }

  private createBackground() {
    // Sky gradient
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x8B4513, 0x8B4513, 0xD2691E, 0xD2691E, 1);
    graphics.fillRect(0, 0, 2400, 600);

    // Sun
    const sun = this.add.circle(2200, 80, 40, 0xFFD700);
    sun.setAlpha(0.8);

    // Ground
    const ground = this.add.rectangle(1200, 580, 2400, 40, 0x3d2817);
    this.physics.add.existing(ground, true);
  }

  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    // Main ground platforms
    this.platforms.create(400, 550, null).setScale(3, 1).refreshBody();
    this.platforms.create(1200, 550, null).setScale(3, 1).refreshBody();    this.platforms.create(2000, 550, null).setScale(2, 1).refreshBody();

    // Elevated platforms
    const platforms = [
      { x: 300, y: 450, w: 200 },
      { x: 600, y: 380, w: 150 },
      { x: 900, y: 450, w: 180 },
      { x: 1300, y: 380, w: 200 },
      { x: 1700, y: 450, w: 150 },
      { x: 2100, y: 380, w: 180 },
    ];

    platforms.forEach(p => {
      const platform = this.add.rectangle(p.x, p.y, p.w, 20, 0x556B2F);
      this.physics.add.existing(platform, true);
      this.platforms.add(platform);
    });
  }

  private createPlayer() {
    // Create player sprite (placeholder - replace with actual sprite)
    this.player = this.add.rectangle(100, 500, 30, 50, 0x4CAF50);
    this.physics.add.existing(this.player);
    
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setBounce(0.1);
    body.setSize(30, 50);

    // Input setup
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Shooting input
    this.input.keyboard!.on('keydown-SPACE', () => this.shoot());
  }

  private createEnemies() {
    this.enemies = this.physics.add.group();

    // Spawn initial enemies
    const enemyPositions = [
      { x: 500, y: 500 },
      { x: 800, y: 500 },
      { x: 1100, y: 500 },      { x: 1500, y: 500 },
      { x: 1800, y: 500 },
      { x: 2100, y: 500 },
    ];

    enemyPositions.forEach((pos, index) => {
      this.spawnEnemy(pos.x, pos.y, index < 2); // First 2 are drones
    });
  }

  private spawnEnemy(x: number, y: number, isDrone: boolean = false) {
    const color = isDrone ? 0xFF4444 : 0x8B4513;
    const enemy = this.add.rectangle(x, y, isDrone ? 40 : 30, isDrone ? 25 : 50, color);
    this.physics.add.existing(enemy);
    
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(isDrone ? 40 : 30, isDrone ? 25 : 50);
    
    enemy.setData('isDrone', isDrone);
    enemy.setData('health', isDrone ? 2 : 1);
    enemy.setData('speed', isDrone ? 100 : 50);
    
    this.enemies.add(enemy);
  }

  private createExtractionZone() {
    this.extractionZone = this.add.zone(2300, 500, 100, 100);
    this.physics.add.existing(this.extractionZone, true);
    
    // Visual indicator
    const zoneGraphics = this.add.graphics();
    zoneGraphics.lineStyle(3, 0x00FF00, 0.5);
    zoneGraphics.strokeRect(2250, 450, 100, 100);
    zoneGraphics.fillStyle(0x00FF00, 0.1);
    zoneGraphics.fillRect(2250, 450, 100, 100);

    this.extractionText = this.add.text(2250, 420, 'EXTRACTION\nLOCKED', {
      fontSize: '16px',
      color: '#FF0000',
      align: 'center'
    }).setOrigin(0.5);
  }

  private createUI() {
    const uiStyle = {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#FFFFFF'
    };
    // Health
    this.healthText = this.add.text(20, 20, `HEALTH: ${this.health}`, uiStyle);
    
    // Ammo
    this.ammoText = this.add.text(20, 50, `AMMO: ${this.ammo}`, uiStyle);
    
    // Kills
    this.killsText = this.add.text(20, 80, `KILLS: ${this.kills}/${this.killTarget}`, uiStyle);
    
    // Timer
    this.timerText = this.add.text(20, 110, `TIME: ${this.formatTime(this.gameTime)}`, uiStyle);

    // Instructions
    this.add.text(20, 160, 'WASD/Arrows: Move\nSPACE: Shoot', {
      fontSize: '14px',
      color: '#AAAAAA'
    });
  }

  private setupCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.hitPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.extractionZone, this.tryExtract, undefined, this);
    
    if (this.miniTank) {
      this.physics.add.overlap(this.bullets, this.miniTank, this.hitMiniTank, undefined, this);
    }
  }

  private shoot() {
    const now = Date.now();
    if (now - this.lastFired < this.fireRate || this.ammo <= 0) return;

    this.lastFired = now;
    this.ammo--;
    this.ammoText.setText(`AMMO: ${this.ammo}`);

    const bullet = this.add.rectangle(
      this.player.x + 20,
      this.player.y,
      10,
      4,
      0xFFFF00
    );
    
    this.physics.add.existing(bullet);    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(600);
    body.setSize(10, 4);
    
    this.bullets.add(bullet);

    // Auto-remove bullet after 2 seconds
    this.time.delayedCall(2000, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  }

  private hitEnemy(bullet: any, enemy: any) {
    bullet.destroy();
    
    const health = enemy.getData('health') - 1;
    enemy.setData('health', health);

    if (health <= 0) {
      enemy.destroy();
      this.kills++;
      this.killsText.setText(`KILLS: ${this.kills}/${this.killTarget}`);
      this.score += 100;

      // Check if extraction should be unlocked
      if (this.kills >= this.killTarget && !this.isExtractionUnlocked) {
        this.unlockExtraction();
      }
    }
  }

  private hitPlayer(player: any, bullet: any) {
    bullet.destroy();
    this.health -= 10;
    this.healthText.setText(`HEALTH: ${this.health}`);

    if (this.health <= 0) {
      this.gameOver(false);
    }
  }

  private spawnMiniTank() {
    if (this.miniTankActive) return;
    
    this.miniTankActive = true;
    this.miniTank = this.add.rectangle(2200, 500, 80, 60, 0x4a4a4a);
    this.physics.add.existing(this.miniTank);
        const body = this.miniTank.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(80, 60);
    body.setImmovable(true);

    // Tank health bar
    this.add.text(2200, 450, 'MINI TANK', {
      fontSize: '16px',
      color: '#FF0000',
      align: 'center'
    }).setOrigin(0.5);

    // Start tank shooting
    this.time.addEvent({
      delay: 2000,
      callback: this.tankShoot,
      callbackScope: this,
      loop: true
    });

    console.log('[GameScene] Mini Tank Spawned!');
  }

  private tankShoot() {
    if (!this.miniTank || !this.miniTank.active) return;

    const bullet = this.add.rectangle(
      this.miniTank.x - 40,
      this.miniTank.y,
      15,
      6,
      0xFF0000
    );
    
    this.physics.add.existing(bullet);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-300);
    body.setSize(15, 6);
    
    this.enemyBullets.add(bullet);
  }

  private hitMiniTank(bullet: any, tank: any) {
    bullet.destroy();
    this.miniTankHealth -= 10;

    if (this.miniTankHealth <= 0) {
      tank.destroy();
      this.score += 1000;
      this.unlockExtraction();    }
  }

  private unlockExtraction() {
    this.isExtractionUnlocked = true;
    this.extractionText.setText('EXTRACTION\nREADY!');
    this.extractionText.setColor('#00FF00');
    
    // Flash effect
    this.tweens.add({
      targets: this.extractionText,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: 3
    });
  }

  private tryExtract(player: any, zone: any) {
    if (!this.isExtractionUnlocked) {
      this.extractionText.setText('KILL ALL ENEMIES\nFIRST!');
      this.time.delayedCall(2000, () => {
        this.extractionText.setText('EXTRACTION\nLOCKED');
      });
      return;
    }

    this.gameOver(true);
  }

  private startTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.gameTime--;
        this.timerText.setText(`TIME: ${this.formatTime(this.gameTime)}`);

        if (this.gameTime <= 0) {
          this.gameOver(false);
        }
      },
      loop: true
    });
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  private gameOver(victory: boolean) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.timerEvent.remove();

    const message = victory ? 'MISSION COMPLETE!' : 'MISSION FAILED';
    const color = victory ? '#00FF00' : '#FF0000';

    const gameOverText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `${message}\nScore: ${this.score}\nKills: ${this.kills}`,
      {
        fontSize: '48px',
        color: color,
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 20, y: 20 }
      }
    ).setOrigin(0.5);

    // Clear session and return to menu after 3 seconds
    this.time.delayedCall(3000, () => {
      sessionStorage.removeItem('currentRun');
      // Navigate back - you'll need to implement this callback
      console.log('[GameScene] Game over, returning to menu');
    });
  }

  update() {
    if (this.isGameOver) return;

    // Player movement
    const speed = 200;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      body.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      body.setVelocityX(speed);
    } else {
      body.setVelocityX(0);
    }

    if ((this.cursors.up.isDown || this.wasd.up.isDown) && body.blocked.down) {
      body.setVelocityY(-400);
    }
    // Camera follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Enemy AI
    this.enemies.getChildren().forEach((enemy: any) => {
      if (!enemy.active) return;

      const isDrone = enemy.getData('isDrone');
      const distance = Phaser.Math.Distance.Between(
        enemy.x, enemy.y, this.player.x, this.player.y
      );

      if (distance < 400) {
        const body = enemy.body as Phaser.Physics.Arcade.Body;
        const angle = Phaser.Math.Angle.Between(
          enemy.x, enemy.y, this.player.x, this.player.y
        );

        if (isDrone) {
          // Drone flies toward player
          body.setVelocity(
            Math.cos(angle) * 100,
            Math.sin(angle) * 100
          );

          // Drone shoots
          if (Phaser.Math.Between(0, 100) < 2) {
            this.enemyShoot(enemy, angle);
          }
        } else {
          // Ground enemy walks toward player
          body.setVelocityX(Math.cos(angle) * 50);
        }
      }
    });

    // Mini tank AI
    if (this.miniTank && this.miniTank.active) {
      const distance = Phaser.Math.Distance.Between(
        this.miniTank.x, this.miniTank.y, this.player.x, this.player.y
      );

      if (distance > 300) {
        const body = this.miniTank.body as Phaser.Physics.Arcade.Body;
        const angle = Phaser.Math.Angle.Between(
          this.miniTank.x, this.miniTank.y, this.player.x, this.player.y
        );
        body.setVelocityX(Math.cos(angle) * 30);
      }
    }
    // Cleanup off-screen bullets
    this.bullets.getChildren().forEach((bullet: any) => {
      if (bullet.x > this.cameras.main.scrollX + 1000 || bullet.x < this.cameras.main.scrollX - 100) {
        bullet.destroy();
      }
    });
  }

  private enemyShoot(enemy: any, angle: number) {
    const bullet = this.add.rectangle(
      enemy.x,
      enemy.y,
      8,
      4,
      0xFF4444
    );
    
    this.physics.add.existing(bullet);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      Math.cos(angle) * 300,
      Math.sin(angle) * 300
    );
    body.setSize(8, 4);
    
    this.enemyBullets.add(bullet);
  }
  }
