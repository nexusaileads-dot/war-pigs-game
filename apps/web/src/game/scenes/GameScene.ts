import Phaser from 'phaser';
import { apiClient } from '../../api/client';

type CurrentRunPayload = {
  run: { id: string; characterId: string; weaponId: string; levelId: string; };
  sessionToken: string;
};

// --- WEAPON CONFIGURATIONS ---
const WEAPONS: Record<string, { fireRate: number; damage: number; speed: number; scale: number; sprite: string }> = {
  'oink_pistol': { fireRate: 350, damage: 1, speed: 1000, scale: 0.3, sprite: 'bullet' },
  'sow_machinegun': { fireRate: 120, damage: 0.7, speed: 1200, scale: 0.35, sprite: 'bullet' },
  'boar_rifle': { fireRate: 200, damage: 1.5, speed: 1400, scale: 0.4, sprite: 'bullet' },
  'tusk_shotgun': { fireRate: 800, damage: 3, speed: 900, scale: 0.4, sprite: 'bullet' }, // Spread handled in code
  'sniper_swine': { fireRate: 1200, damage: 6, speed: 2000, scale: 0.5, sprite: 'sniper_bullet' },
  'belcha_minigun': { fireRate: 70, damage: 0.5, speed: 1100, scale: 0.5, sprite: 'bullet' },
  'plasma_porker': { fireRate: 300, damage: 2, speed: 800, scale: 0.4, sprite: 'plasma_globule' },
  'bacon_blaster': { fireRate: 600, damage: 4, speed: 900, scale: 0.5, sprite: 'rocket' },
  'default': { fireRate: 350, damage: 1, speed: 1000, scale: 0.3, sprite: 'bullet' }
};

type EnemyKind = 'soldier' | 'drone' | 'tank';
const ENEMIES: Record<EnemyKind, any> = {
  soldier: { kind: 'soldier', keys: ['level1_soldier'], hp: 3, damage: 10, speed: 90, w: 64, h: 64, flying: false },
  drone: { kind: 'drone', keys: ['level1_drone'], hp: 2, damage: 15, speed: 130, w: 64, h: 48, flying: true },
  tank: { kind: 'tank', keys: ['level1_mini_tank'], hp: 40, damage: 25, speed: 50, w: 140, h: 100, flying: false }
};

const WORLD_WIDTH = 4800; const WORLD_HEIGHT = 720; const GROUND_Y = 640;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private weapon!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;

  private extractionZone!: Phaser.GameObjects.Zone;
  private extractionText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private shieldBar!: Phaser.GameObjects.Rectangle;
  private missionText!: Phaser.GameObjects.Text;
  private skillBtnText!: Phaser.GameObjects.Text;

  private runData!: CurrentRunPayload;
  private score = 0; private kills = 0; 
  private health = 100; private maxHealth = 100; private overshield = 0;
  private facing: 1 | -1 = 1;
  private lastFired = 0; private jumpsLeft = 0;
  private remainingSeconds = 180;
  private isGameOver = false; private extractionUnlocked = false; private tankSpawned = false;
  
  // Joystick & Skills
  private joystickForceX = 0; private joystickPointer: Phaser.Input.Pointer | null = null;
  private joystickBase!: Phaser.GameObjects.Arcade; private joystickThumb!: Phaser.GameObjects.Arcade;
  
  private skillCooldown = 0;
  private isInvulnerable = false;
  private weaponBuffActive = false;

  constructor() { super({ key: 'GameScene' }); }

  create() {
    this.createFallbackTextures();
    const storedRun = sessionStorage.getItem('currentRun');
    if (!storedRun) { this.failMission('NO SESSION'); return; }
    try { this.runData = JSON.parse(storedRun); } catch (e) { this.failMission('BAD DATA'); return; }

    this.physics.world.gravity.y = 1400;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createBackground();
    this.createPlatforms();
    this.createGroups();
    this.createPlayer();
    this.createEnemies();
    this.createExtractionZone();
    this.createHud();
    this.createMobileControls();
    this.setupInput();
    this.setupCollisions();
    this.startTimers();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.1);
    this.showMissionText('LEVEL 1: OUTSKIRTS BREACH');
  }

  update() {
    if (this.isGameOver || !this.player?.active) return;
    
    this.updateJoystick();
    this.updatePlayerMovement();
    this.updateWeaponPosition();
    this.updateEnemies();
    
    if (this.kills >= 5 && !this.tankSpawned) this.spawnTank();
    
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) this.jumpsLeft = 2;

    this.bullets.getChildren().forEach((b: any) => { if(b.x < 0 || b.x > WORLD_WIDTH) b.destroy(); });
    if (this.player.y > WORLD_HEIGHT + 80) this.damagePlayer(999);
    this.updateHud();
  }

  private createBackground() {
    this.add.rectangle(WORLD_WIDTH/2, WORLD_HEIGHT/2, WORLD_WIDTH, WORLD_HEIGHT, 0x87CEEB).setDepth(-60);
    const bgW = 1600; 
    if (this.textures.exists('level1_bg_left')) this.add.image(0, 0, 'level1_bg_left').setOrigin(0,0).setDepth(-55).setDisplaySize(bgW, WORLD_HEIGHT);
    if (this.textures.exists('level1_bg_middle')) this.add.image(bgW, 0, 'level1_bg_middle').setOrigin(0,0).setDepth(-55).setDisplaySize(bgW, WORLD_HEIGHT);
    if (this.textures.exists('level1_bg_right')) this.add.image(bgW*2, 0, 'level1_bg_right').setOrigin(0,0).setDepth(-55).setDisplaySize(bgW, WORLD_HEIGHT);
  }

  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    const floor = this.add.rectangle(WORLD_WIDTH/2, WORLD_HEIGHT - 50, WORLD_WIDTH, 100, 0x000000, 0);
    this.physics.add.existing(floor, true);
    this.platforms.add(floor);
    [{x:600,y:GROUND_Y-150}, {x:1200,y:GROUND_Y-250}, {x:1800,y:GROUND_Y-150}, {x:2400,y:GROUND_Y-200}].forEach(p => {
      const plat = this.add.rectangle(p.x, p.y, 200, 30, 0x7b704c, 1).setDepth(1);
      this.physics.add.existing(plat, true);
      this.platforms.add(plat);
    });
  }

  private createGroups() {
    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 100 });
    this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 80 });
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 20 });
  }

  private createPlayer() {
    const charKey = this.resolveTexture([this.runData.run.characterId], 'fallback_player');
    const wCfg = WEAPONS[this.runData.run.weaponId] || WEAPONS['default'];
    
    // FIX: Spawn high in the air to prevent clipping into the floor
    this.player = this.physics.add.sprite(140, 200, charKey);
    this.player.setDisplaySize(72, 72).setCollideWorldBounds(true).setDepth(20);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(34, 54).setOffset(19, 16).setDragX(1100);

    const wKey = this.resolveTexture([this.runData.run.weaponId], 'fallback_weapon');
    this.weapon = this.add.sprite(this.player.x, this.player.y, wKey).setDepth(21).setScale(wCfg.scale);
  }

  private updateWeaponPosition() {
    if (!this.weapon || !this.player) return;
    const offX = this.facing === 1 ? 25 : -25;
    this.weapon.setPosition(this.player.x + offX, this.player.y + 10).setFlipX(this.facing === -1);
  }

  private shoot() {
    const wCfg = WEAPONS[this.runData.run.weaponId] || WEAPONS['default'];
    const activeFireRate = this.weaponBuffActive ? wCfg.fireRate * 0.5 : wCfg.fireRate;
    
    if (this.isGameOver || this.time.now - this.lastFired < activeFireRate) return;
    this.lastFired = this.time.now;
    
    const dmg = this.weaponBuffActive ? wCfg.damage * 1.4 : wCfg.damage;
    const isShotgun = this.runData.run.weaponId === 'tusk_shotgun';
    const shots = isShotgun ? 3 : 1;

    for (let i = 0; i < shots; i++) {
        const b = this.bullets.get(this.player.x, this.player.y, wCfg.sprite) as Phaser.Physics.Arcade.Image;
        if (!b) continue;
        
        let angleOffset = 0;
        if (isShotgun) angleOffset = (i - 1) * 0.15; // Spread

        b.setActive(true).setVisible(true).setPosition(this.player.x + (this.facing * 30), this.player.y + 10).setDepth(30).setRotation((this.facing === 1 ? 0 : Math.PI) + angleOffset);
        b.setData('damage', dmg);
        
        const bdy = b.body as Phaser.Physics.Arcade.Body;
        bdy.enable = true; bdy.setAllowGravity(false);
        
        const velocityX = Math.cos(angleOffset) * (this.facing * wCfg.speed);
        const velocityY = Math.sin(angleOffset) * wCfg.speed;
        bdy.setVelocity(velocityX, velocityY);
        
        this.time.delayedCall(1500, () => { if(b.active) { b.setActive(false).setVisible(false); b.destroy(); } });
    }
  }

  private activateSkill() {
    if (this.skillCooldown > 0 || this.isGameOver) return;
    this.skillCooldown = 15; // 15s cooldown
    const charId = this.runData.run.characterId;
    this.showMissionText('SKILL ACTIVATED!');

    if (charId === 'grunt_bacon') {
      // Temporal Squeal (Slow Enemies)
      this.enemies.getChildren().forEach(e => {
        const en = e as Phaser.Physics.Arcade.Sprite;
        en.setData('speed', en.getData('speed') * 0.5);
      });
      this.time.delayedCall(5000, () => {
        this.enemies.getChildren().forEach(e => {
          const en = e as Phaser.Physics.Arcade.Sprite;
          en.setData('speed', en.getData('speed') * 2);
        });
      });
    } else if (charId === 'iron_tusk') {
      // Kinetic Plating (Overshield)
      this.overshield = 200;
    } else if (charId === 'swift_hoof') {
      // Trotter Dash (Invincible Dash)
      this.isInvulnerable = true;
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocityX(this.facing * 2000);
      this.time.delayedCall(500, () => this.isInvulnerable = false);
    } else if (charId === 'blast_ham') {
      // Swine Ordinance (AoE Explosion)
      if (this.textures.exists('explosion')) {
          const exp = this.add.sprite(this.player.x, this.player.y, 'explosion').setDisplaySize(400, 400).setDepth(25);
          this.time.delayedCall(300, () => exp.destroy());
      }
      this.enemies.getChildren().forEach(e => {
          const en = e as Phaser.Physics.Arcade.Sprite;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, en.x, en.y) < 250) {
              en.setData('hp', en.getData('hp') - 15);
          }
      });
    } else if (charId === 'precision_squeal') {
      // Overclocked Optics (Buff Weapon)
      this.weaponBuffActive = true;
      this.time.delayedCall(6000, () => this.weaponBuffActive = false);
    } else if (charId === 'general_goldsnout') {
      // Command Bombardment (Airstrike)
      const targets = this.enemies.getChildren().slice(0, 3);
      targets.forEach(t => {
          const tx = (t as any).x; const ty = (t as any).y;
          this.time.delayedCall(1000, () => {
              if (this.textures.exists('explosion')) {
                  const exp = this.add.sprite(tx, ty, 'explosion').setDisplaySize(200, 200).setDepth(25);
                  this.time.delayedCall(300, () => exp.destroy());
              }
              if (t.active) (t as any).setData('hp', (t as any).getData('hp') - 30);
          });
      });
    }
  }

  // --- STANDARD BOILERPLATE & FIXES BELOW ---
  private jump() { if (this.isGameOver) return; const body = this.player.body as Phaser.Physics.Arcade.Body; if (this.jumpsLeft > 0) { body.setVelocityY(-680); this.jumpsLeft--; } }

  private createEnemies() {
    this.spawnEnemy('soldier', 800, GROUND_Y - 50);
    this.spawnEnemy('soldier', 1400, GROUND_Y - 50);
    this.spawnEnemy('drone', 1800, GROUND_Y - 200);
    this.spawnEnemy('soldier', 2500, GROUND_Y - 50);
    this.spawnEnemy('soldier', 3200, GROUND_Y - 50);
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number) {
    const cfg = ENEMIES[kind];
    const key = this.resolveTexture(cfg.keys, 'fallback_soldier');
    const en = this.enemies.get(x, y, key) as Phaser.Physics.Arcade.Sprite;
    if (!en) return en;
    en.setActive(true).setVisible(true).setDisplaySize(cfg.w, cfg.h).setDepth(17);
    en.setData('kind', cfg.kind); en.setData('hp', cfg.hp); en.setData('speed', cfg.speed); en.setData('flying', cfg.flying); en.setData('dmg', cfg.damage);
    const b = en.body as Phaser.Physics.Arcade.Body;
    b.enable = true; b.setAllowGravity(!cfg.flying); b.setCollideWorldBounds(true);
    return en;
  }

  private spawnTank() { 
    if(this.tankSpawned) return; this.tankSpawned = true; 
    const spawnX = Math.min(this.player.x + 800, WORLD_WIDTH - 200);
    const t = this.spawnEnemy('tank', spawnX, GROUND_Y - 200); 
    if(t) { t.setTint(0xffe0a3); this.cameras.main.shake(500, 0.02); this.showMissionText('WARNING: HEAVY ARMOR DETECTED'); } 
  }

  private createExtractionZone() {
    const x = WORLD_WIDTH - 200;
    this.extractionZone = this.add.zone(x, GROUND_Y - 50, 100, 100);
    this.physics.add.existing(this.extractionZone, true);
    this.add.rectangle(x, GROUND_Y - 50, 100, 100, 0x00ff00, 0.2).setStrokeStyle(3, 0x00ff00, 0.45).setDepth(4);
    this.extractionText = this.add.text(x, GROUND_Y - 120, 'LOCKED', { fontSize: '16px', color: '#ff4d4f', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5);
  }

  private updatePlayerMovement() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let h = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) h -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) h += 1;
    if (this.joystickForceX !== 0) h = this.joystickForceX;
    body.setVelocityX(h * 320);
    if (h !== 0) { this.facing = h > 0 ? 1 : -1; this.player.setFlipX(this.facing === -1); }
  }

  private updateJoystick() {
    if (!this.joystickPointer) { this.joystickForceX = 0; if (this.joystickThumb) this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y); return; }
    const dx = this.joystickPointer.x - this.joystickBase.x;
    const dist = Math.min(50, Math.abs(dx));
    this.joystickForceX = dx > 10 ? 1 : dx < -10 ? -1 : 0;
    this.joystickThumb.setPosition(this.joystickBase.x + (dx > 0 ? dist : -dist), this.joystickBase.y);
  }

  private updateEnemies() {
    this.enemies.getChildren().forEach((c) => {
      const e = c as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const b = e.body as Phaser.Physics.Arcade.Body;
      const sp = e.getData('speed'); const fly = e.getData('flying');
      const dir = this.player.x > e.x ? 1 : -1;
      
      e.setFlipX(dir === 1); // Native face left, flip if player is to the right
      
      const dist = Math.abs(this.player.x - e.x);
      if (fly) { 
        b.setVelocityX(dist > 100 ? dir * sp : 0); 
        const ty = this.player.y - 120; 
        if (e.y > ty) b.setVelocityY(-sp * 0.5); else b.setVelocityY(sp * 0.5); 
      } else { 
        b.setVelocityX(dist > 150 ? dir * sp : 0); 
      }
    });
  }

  private setupInput() {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D, up: Phaser.Input.Keyboard.KeyCodes.W }) as any;
    this.input.keyboard.on('keydown-SPACE', () => this.shoot());
    this.input.keyboard.on('keydown-W', () => this.jump());
    this.input.keyboard.on('keydown-UP', () => this.jump());
    this.input.keyboard.on('keydown-E', () => this.activateSkill()); // PC Binding
  }

  private setupCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      const bullet = b as Phaser.Physics.Arcade.Image;
      const dmg = bullet.getData('damage') || 1;
      bullet.destroy(); // FIX: Destroy instantly to prevent multi-frame hit overlaps
      
      const en = e as Phaser.Physics.Arcade.Sprite;
      const hp = en.getData('hp') - dmg;
      if (hp <= 0) { 
        if (this.textures.exists('explosion')) {
            const exp = this.add.sprite(en.x, en.y, 'explosion').setDisplaySize(60, 60).setDepth(25);
            this.time.delayedCall(200, () => exp.destroy());
        }
        this.kills++; this.score += 100; en.destroy(); 
        if (this.kills >= 10) this.unlockExtraction(); 
      } else en.setData('hp', hp);
    }, undefined, this);
    
    this.physics.add.overlap(this.enemyBullets, this.player, (p, b) => { 
      const bullet = b as Phaser.Physics.Arcade.Image;
      const dmg = bullet.getData('damage') || 10;
      bullet.destroy(); // FIX
      this.damagePlayer(dmg); 
    }, undefined, this);
    
    this.physics.add.overlap(this.player, this.extractionZone, () => { if (this.extractionUnlocked) this.completeMission(); }, undefined, this);
  }

  private createMobileControls() {
    const y = WORLD_HEIGHT - 80; const camW = this.cameras.main.width;
    
    this.joystickBase = this.add.circle(150, y, 50, 0x000000, 0.3).setDepth(150).setScrollFactor(0);
    this.joystickThumb = this.add.circle(150, y, 25, 0xffffff, 0.5).setDepth(151).setScrollFactor(0);

    const shootBtn = this.add.circle(camW - 100, y, 40, 0xff6b35, 0.5).setDepth(150).setScrollFactor(0).setInteractive();
    const jumpBtn = this.add.circle(camW - 30, y - 50, 40, 0x4dabf7, 0.5).setDepth(150).setScrollFactor(0).setInteractive();
    const skillBtn = this.add.circle(camW - 170, y - 50, 40, 0x8a2be2, 0.5).setDepth(150).setScrollFactor(0).setInteractive();

    this.add.text(camW - 100, y, 'FIRE', { fontSize: '14px', color: '#fff' }).setOrigin(0.5).setDepth(151).setScrollFactor(0);
    this.add.text(camW - 30, y - 50, 'JUMP', { fontSize: '14px', color: '#fff' }).setOrigin(0.5).setDepth(151).setScrollFactor(0);
    this.skillBtnText = this.add.text(camW - 170, y - 50, 'SKILL', { fontSize: '14px', color: '#fff' }).setOrigin(0.5).setDepth(151).setScrollFactor(0);

    shootBtn.on('pointerdown', () => this.shoot());
    jumpBtn.on('pointerdown', () => this.jump());
    skillBtn.on('pointerdown', () => this.activateSkill());

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.x < camW / 2) this.joystickPointer = p; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {});
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => { if (this.joystickPointer === p) this.joystickPointer = null; });
  }

  private createHud() {
    this.hudText = this.add.text(20, 20, '', { fontSize: '18px', fontFamily: 'monospace', color: '#fff', backgroundColor: '#000000aa', padding: { x: 10, y: 5 } }).setScrollFactor(0).setDepth(100);
    this.healthBar = this.add.rectangle(20, 60, 200, 16, 0xff4d4f).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
    this.shieldBar = this.add.rectangle(20, 80, 0, 8, 0x4dabf7).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
    this.add.rectangle(20, 60, 200, 16, 0x333333).setOrigin(0, 0.5).setScrollFactor(0).setDepth(99);
    this.missionText = this.add.text(this.cameras.main.width / 2, 100, '', { fontSize: '32px', color: '#ffdd57', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
  }

  private startTimers() {
    this.time.addEvent({ delay: 1500, callback: () => {
      if(this.isGameOver) return;
      this.enemies.getChildren().forEach((e: any) => {
        if(Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 800 && Math.random() < 0.4) this.enemyShoot(e);
      });
    }, loop: true });
    
    this.time.addEvent({ delay: 1000, callback: () => { 
      this.remainingSeconds--; 
      if(this.skillCooldown > 0) this.skillCooldown--;
      if(this.remainingSeconds<=0) this.failMission('TIME UP'); 
    }, loop: true });
  }

  private enemyShoot(e: Phaser.Physics.Arcade.Sprite) {
    const bulletKey = this.resolveTexture(['rocket', 'plasma_globule'], 'fallback_enemy_bullet');
    const b = this.enemyBullets.get(e.x, e.y, bulletKey) as Phaser.Physics.Arcade.Image;
    if(!b) return;
    
    const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    b.setActive(true).setVisible(true).setRotation(ang).setDepth(29); // FIX: Removed + Math.PI so standard bullets face player
    b.setData('damage', e.getData('dmg') || 10);
    
    const bdy = b.body as Phaser.Physics.Arcade.Body;
    bdy.enable = true; bdy.setAllowGravity(false);
    this.physics.velocityFromRotation(ang, 600, bdy.velocity); 
    this.time.delayedCall(2000, () => { if(b.active) { b.setActive(false).setVisible(false); b.destroy(); } });
  }

  private damagePlayer(a: number) { 
    if(this.isGameOver || this.isInvulnerable) return; 
    
    if (this.overshield > 0) {
        this.overshield -= a;
        if (this.overshield < 0) {
            this.health += this.overshield; // subtract remainder from health
            this.overshield = 0;
        }
    } else {
        this.health -= a; 
    }
    
    this.cameras.main.shake(150, 0.015); 
    this.player.setTint(0xff0000);
    this.time.delayedCall(100, () => this.player.clearTint());
    if(this.health <= 0) this.failMission('KIA - KILLED IN ACTION'); 
  }
  
  private unlockExtraction() { this.extractionUnlocked = true; this.extractionText.setText('EXTRACTION\nREADY').setColor('#00ff00'); this.showMissionText('EXTRACTION UNLOCKED'); }
  
  private async completeMission() {
    if(this.isGameOver) return; this.isGameOver = true; this.showMissionText('MISSION COMPLETE');
    try { await apiClient.post('/api/game/complete', { runId: this.runData.run.id, sessionToken: this.runData.sessionToken, clientHash: 'lvl1-done', stats: { kills: this.kills, damageDealt: this.score, damageTaken: 0, accuracy: 1, timeElapsed: 0, wavesCleared: 1, bossKilled: this.tankSpawned } }); } catch (e) {}
    window.dispatchEvent(new CustomEvent('WAR_PIGS_EVENT', { detail: { type: 'STATE_CHANGE', state: 'victory' } }));
  }
  
  private failMission(r: string) { 
    if(this.isGameOver) return; 
    this.isGameOver = true; 
    this.physics.pause();
    this.player.setTint(0xff0000);

    // FIX: Cinematic Game Over Screen instead of instantly booting to menu
    const camW = this.cameras.main.width; const camH = this.cameras.main.height;
    this.add.rectangle(camW/2, camH/2, WORLD_WIDTH, WORLD_HEIGHT, 0x000000, 0.7).setScrollFactor(0).setDepth(400);
    this.add.text(camW/2, camH/2 - 40, 'MISSION FAILED', { fontSize: '64px', color: '#ff4d4f', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(401);
    this.add.text(camW/2, camH/2 + 30, r, { fontSize: '24px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(401);

    this.time.delayedCall(3500, () => {
        window.dispatchEvent(new CustomEvent('WAR_PIGS_EVENT', { detail: { type: 'STATE_CHANGE', state: 'defeat' } }));
    });
  }

  private showMissionText(t: string) { if(!this.missionText) return; this.missionText.setText(t).setVisible(true); this.time.delayedCall(2000, () => this.missionText.setVisible(false)); }
  
  private updateHud() { 
    this.hudText.setText(`KILLS: ${this.kills}/10 | TIME: ${this.remainingSeconds}`); 
    this.healthBar.width = 200 * (Math.max(0, this.health) / this.maxHealth); 
    this.shieldBar.width = Math.min(200, this.overshield);
    if (this.skillBtnText) this.skillBtnText.setText(this.skillCooldown > 0 ? `${this.skillCooldown}s` : 'SKILL');
  }

  private createFallbackTextures() { this.makeRectTexture('fallback_player', 64, 64, 0xb46a34, 0x3b1d0d); this.makeRectTexture('fallback_soldier', 64, 64, 0x6f7d49, 0x202811); this.makeCircleTexture('fallback_drone', 30, 0xba2e2e, 0x2b0505); this.makeRectTexture('fallback_tank', 140, 100, 0x676b42, 0x25250f); this.makeRectTexture('fallback_weapon', 40, 20, 0x555555, 0x333333); this.makeCircleTexture('fallback_enemy_bullet', 8, 0xff0000, 0x660000); }
  private makeRectTexture(k: string, w: number, h: number, f: number, s: number) { if(this.textures.exists(k)) return; const g = this.add.graphics(); g.fillStyle(f,1).fillRoundedRect(0,0,w,h,8); g.lineStyle(3,s,1).strokeRoundedRect(1.5,1.5,w-3,h-3,8); g.generateTexture(k,w,h); g.destroy(); }
  private makeCircleTexture(k: string, r: number, f: number, s: number) { if(this.textures.exists(k)) return; const g = this.add.graphics(); g.fillStyle(f,1).fillCircle(r,r,r); g.lineStyle(3,s,1).strokeCircle(r,r,r-2); g.generateTexture(k,r*2,r*2); g.destroy(); }
  private resolveTexture(k: string[], f: string) { for (const i of k) if (i && this.textures.exists(i)) return i; return f; }
  private cleanup() {}
}
