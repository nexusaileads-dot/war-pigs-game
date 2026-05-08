import Phaser from 'phaser';
import { apiClient } from '../../api/client';

type CurrentRunPayload = {
  run: { id: string; characterId: string; weaponId: string; levelId: string; };
  sessionToken: string;
};

type EnemyKind = 'soldier' | 'drone' | 'tank';
type EnemyConfig = {
  kind: EnemyKind; textureKeys: string[]; fallbackKey: string;
  hp: number; damage: number; speed: number; width: number; height: number;
  flying: boolean; score: number;
};

const WORLD_WIDTH = 4800;
const WORLD_HEIGHT = 720;
const GROUND_Y = 640;

const PLAYER_SPEED = 320;
const JUMP_SPEED = -680;
const GRAVITY_Y = 1400;
const KILL_TARGET = 6;

const ENEMIES: Record<EnemyKind, EnemyConfig> = {
  soldier: { kind: 'soldier', textureKeys: ['level1_soldier'], fallbackKey: 'fallback_soldier', hp: 2, damage: 8, speed: 90, width: 64, height: 64, flying: false, score: 100 },
  drone: { kind: 'drone', textureKeys: ['level1_drone'], fallbackKey: 'fallback_drone', hp: 2, damage: 10, speed: 130, width: 64, height: 48, flying: true, score: 150 },
  tank: { kind: 'tank', textureKeys: ['level1_mini_tank'], fallbackKey: 'fallback_tank', hp: 14, damage: 18, speed: 50, width: 140, height: 100, flying: false, score: 600 }
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private weapon!: Phaser.GameObjects.Sprite;
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
  private missionText!: Phaser.GameObjects.Text;

  private runData!: CurrentRunPayload;
  private score = 0; private kills = 0; private health = 100; private maxHealth = 100;
  private facing: 1 | -1 = 1;
  private lastFired = 0; private fireRate = 220;
  private isGameOver = false; private extractionUnlocked = false; private tankSpawned = false;
  
  // Joystick
  private joystickPointer: Phaser.Input.Pointer | null = null;
  private joystickBase!: Phaser.GameObjects.Arcade;
  private joystickThumb!: Phaser.GameObjects.Arcade;
  private joystickForceX: number = 0;
  
  // Abilities
  private jumpsLeft: number = 0; 
  private remainingSeconds = 180;

  constructor() { super({ key: 'GameScene' }); }

  create() {
    this.createFallbackTextures();
    
    const storedRun = sessionStorage.getItem('currentRun');
    if (!storedRun) { this.failMission('NO SESSION'); return; }
    try { this.runData = JSON.parse(storedRun); } catch (e) { this.failMission('BAD DATA'); return; }
    if (!this.runData?.run?.id) { this.failMission('INVALID SESSION'); return; }

    this.physics.world.gravity.y = GRAVITY_Y;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createBackground();
    this.createPlatforms();
    this.createGroups();
    this.createPlayer();
    this.createEnemies();
    this.createExtractionZone();
    this.createHud();
    this.createJoystick();
    this.createPauseButton();
    this.setupInput();
    this.setupCollisions();
    this.startTimers();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.showMissionText('LEVEL 1: OUTSKIRTS BREACH');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update() {
    if (this.isGameOver || !this.player?.active) return;
    
    this.updateJoystick();
    this.updatePlayerMovement();
    this.updateWeaponPosition();
    this.updateEnemies();
    
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) { this.jumpsLeft = 2; }

    this.bullets.getChildren().forEach((b: any) => { if(b.x < 0 || b.x > WORLD_WIDTH) b.destroy(); });
    if (this.player.y > WORLD_HEIGHT + 80) this.damagePlayer(999);
    this.updateHud();
  }

  private createFallbackTextures() {
    this.makeRectTexture('fallback_player', 64, 64, 0xb46a34, 0x3b1d0d);
    this.makeRectTexture('fallback_soldier', 64, 64, 0x6f7d49, 0x202811);
    this.makeCircleTexture('fallback_drone', 30, 0xba2e2e, 0x2b0505);
    this.makeRectTexture('fallback_tank', 140, 100, 0x676b42, 0x25250f);
    this.makeRectTexture('fallback_weapon', 40, 20, 0x555555, 0x333333);
  }
  
  private makeRectTexture(k: string, w: number, h: number, f: number, s: number) { 
    if(this.textures.exists(k)) return; const g = this.add.graphics(); 
    g.fillStyle(f,1).fillRoundedRect(0,0,w,h,8); 
    g.lineStyle(3,s,1).strokeRoundedRect(1.5,1.5,w-3,h-3,8); 
    g.generateTexture(k,w,h); g.destroy(); 
  }
  
  private makeCircleTexture(k: string, r: number, f: number, s: number) { 
    if(this.textures.exists(k)) return; const g = this.add.graphics(); 
    g.fillStyle(f,1).fillCircle(r,r,r); 
    g.lineStyle(3,s,1).strokeCircle(r,r,r-2); 
    g.generateTexture(k,r*2,r*2); g.destroy(); 
  }

  private createBackground() {
    this.add.rectangle(WORLD_WIDTH/2, WORLD_HEIGHT/2, WORLD_WIDTH, WORLD_HEIGHT, 0x87CEEB).setDepth(-60);
    
    const bgWidth = 1600; 
    if (this.textures.exists('level1_bg_left')) this.add.image(0, 0, 'level1_bg_left').setOrigin(0,0).setDepth(-55).setDisplaySize(bgWidth, WORLD_HEIGHT);
    if (this.textures.exists('level1_bg_middle')) this.add.image(bgWidth, 0, 'level1_bg_middle').setOrigin(0,0).setDepth(-55).setDisplaySize(bgWidth, WORLD_HEIGHT);
    if (this.textures.exists('level1_bg_right')) this.add.image(bgWidth*2, 0, 'level1_bg_right').setOrigin(0,0).setDepth(-55).setDisplaySize(bgWidth, WORLD_HEIGHT);

    this.add.rectangle(WORLD_WIDTH/2, GROUND_Y+50, WORLD_WIDTH, 100, 0x3c2b21).setDepth(-1);
    this.add.rectangle(WORLD_WIDTH/2, GROUND_Y, WORLD_WIDTH, 20, 0xb8a07d).setDepth(0);
  }

  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    
    // FIX: Add a solid floor body so enemies don't fall through
    const floorHeight = 100;
    const floor = this.add.rectangle(WORLD_WIDTH/2, WORLD_HEIGHT - (floorHeight/2), WORLD_WIDTH, floorHeight, 0x000000, 0);
    this.physics.add.existing(floor, true);
    this.platforms.add(floor);

    const pdata = [{x:600,y:GROUND_Y-150}, {x:1200,y:GROUND_Y-250}, {x:1800,y:GROUND_Y-150}, {x:2400,y:GROUND_Y-200}, {x:3000,y:GROUND_Y-150}, {x:3600,y:GROUND_Y-250}];
    pdata.forEach(p => this.createPlatform(p.x, p.y, 200, 30, 0x7b704c));
  }

  private createPlatform(x: number, y: number, w: number, h: number, c: number) {
    const p = this.add.rectangle(x, y, w, h, c, 1).setDepth(1);
    this.physics.add.existing(p, true);
    this.platforms.add(p);
  }

  private createGroups() {
    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 80 });
    this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 80 });
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 20 });
  }

  private createPlayer() {
    const charKey = this.resolveTexture([this.runData.run.characterId, 'grunt_bacon'], 'fallback_player');
    const weapKey = this.resolveTexture([this.runData.run.weaponId, 'oink_pistol'], 'fallback_weapon');

    this.player = this.physics.add.sprite(140, GROUND_Y - 50, charKey);
    this.player.setDisplaySize(72, 72).setCollideWorldBounds(true).setDepth(20);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(34, 54).setOffset(19, 16).setDragX(1100);

    this.weapon = this.add.sprite(this.player.x, this.player.y, weapKey);
    this.weapon.setDepth(21).setScale(0.7);
  }

  private updateWeaponPosition() {
    if (!this.weapon || !this.player) return;
    const offX = this.facing === 1 ? 25 : -25;
    this.weapon.setPosition(this.player.x + offX, this.player.y + 10);
    this.weapon.setFlipX(this.facing === -1);
  }

  private createEnemies() {
    this.spawnEnemy('soldier', 800, GROUND_Y - 50);
    this.spawnEnemy('soldier', 1400, GROUND_Y - 50);
    this.spawnEnemy('drone', 1800, GROUND_Y - 200);
    this.spawnEnemy('soldier', 2500, GROUND_Y - 50);
    this.spawnEnemy('soldier', 3200, GROUND_Y - 50);
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number) {
    const cfg = ENEMIES[kind];
    const key = this.resolveTexture(cfg.textureKeys, cfg.fallbackKey);
    const en = this.enemies.get(x, y, key) as Phaser.Physics.Arcade.Sprite;
    en.setActive(true).setVisible(true).setDisplaySize(cfg.width, cfg.height).setDepth(17);
    en.setData('kind', cfg.kind); en.setData('hp', cfg.hp); en.setData('speed', cfg.speed); en.setData('flying', cfg.flying);
    const b = en.body as Phaser.Physics.Arcade.Body;
    b.enable = true; b.setAllowGravity(!cfg.flying); b.setCollideWorldBounds(true); b.setBounce(0);
    return en;
  }

  private spawnTank() { if(this.tankSpawned) return; this.tankSpawned = true; const t = this.spawnEnemy('tank', 4000, GROUND_Y - 60); t.setTint(0xffe0a3); this.showMissionText('MINI TANK INCOMING'); }

  private createExtractionZone() {
    const x = WORLD_WIDTH - 200;
    this.extractionZone = this.add.zone(x, GROUND_Y - 50, 100, 100);
    this.physics.add.existing(this.extractionZone, true);
    this.add.rectangle(x, GROUND_Y - 50, 100, 100, 0x00ff00, 0.2).setStrokeStyle(3, 0x00ff00, 0.45).setDepth(4);
    this.extractionText = this.add.text(x, GROUND_Y - 120, 'EXTRACTION\nLOCKED', { fontSize: '16px', color: '#ff4d4f', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5);
  }

  private updatePlayerMovement() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let h = 0;
    
    if (this.cursors.left.isDown || this.wasd.left.isDown) h -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) h += 1;
    
    if (this.joystickForceX !== 0) h = this.joystickForceX;

    body.setVelocityX(h * PLAYER_SPEED);
    if (h !== 0) { this.facing = h > 0 ? 1 : -1; this.player.setFlipX(this.facing === -1); }
  }

  private updateJoystick() {
    if (!this.joystickPointer) {
      this.joystickForceX = 0;
      if (this.joystickThumb) this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
      return;
    }
    
    const dx = this.joystickPointer.x - this.joystickBase.x;
    const dist = Math.min(50, Math.abs(dx));
    this.joystickForceX = dx > 10 ? 1 : dx < -10 ? -1 : 0;
    this.joystickThumb.setPosition(this.joystickBase.x + (dx > 0 ? dist : -dist), this.joystickBase.y);
  }

  private shoot() {
    if (this.isGameOver || this.time.now - this.lastFired < this.fireRate) return;
    this.lastFired = this.time.now;
    
    const b = this.bullets.get(this.player.x, this.player.y, 'bullet') as Phaser.Physics.Arcade.Image;
    if (!b) return;
    b.setActive(true).setVisible(true).setPosition(this.player.x + (this.facing * 30), this.player.y + 10).setDepth(30).setRotation(this.facing === 1 ? 0 : Math.PI);
    b.setDisplaySize(12, 6); // Smaller bullet
    
    const bdy = b.body as Phaser.Physics.Arcade.Body;
    bdy.enable = true; bdy.setAllowGravity(false); bdy.setVelocityX(this.facing * 800);
    this.time.delayedCall(1000, () => { b.setActive(false).setVisible(false); });
  }

  private jump() {
    if (this.isGameOver) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.jumpsLeft > 0) {
      body.setVelocityY(JUMP_SPEED);
      this.jumpsLeft--;
    }
  }

  private updateEnemies() {
    this.enemies.getChildren().forEach((c) => {
      const e = c as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const b = e.body as Phaser.Physics.Arcade.Body;
      const sp = e.getData('speed'); const fly = e.getData('flying');
      const dir = this.player.x > e.x ? 1 : -1;
      e.setFlipX(dir === -1);
      const dist = Math.abs(this.player.x - e.x);
      if (fly) { b.setVelocityX(dir * sp); const ty = this.player.y - 80; if (e.y > ty) b.setVelocityY(-sp * 0.5); else b.setVelocityY(sp * 0.5); }
      else { b.setVelocityX(dist > 80 ? dir * sp : 0); }
    });
  }

  private setupInput() {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D, up: Phaser.Input.Keyboard.KeyCodes.W }) as any;
    this.input.keyboard.on('keydown-SPACE', () => this.shoot());
    this.input.keyboard.on('keydown-W', () => this.jump());
    this.input.keyboard.on('keydown-UP', () => this.jump());
  }

  private setupCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      (b as any).setActive(false).setVisible(false);
      const en = e as Phaser.Physics.Arcade.Sprite;
      const hp = en.getData('hp') - 1;
      if (hp <= 0) { this.kills++; this.score += 100; en.destroy(); if (this.kills >= KILL_TARGET) this.unlockExtraction(); }
      else en.setData('hp', hp);
    }, undefined, this);
    this.physics.add.overlap(this.enemyBullets, this.player, (p, b) => { (b as any).setActive(false).setVisible(false); this.damagePlayer(10); }, undefined, this);
    this.physics.add.overlap(this.player, this.extractionZone, () => { if (this.extractionUnlocked) this.completeMission(); }, undefined, this);
  }

  private createJoystick() {
    const y = WORLD_HEIGHT - 80;
    const x = 150;
    this.joystickBase = this.add.circle(x, y, 50, 0x000000, 0.3).setDepth(150).setScrollFactor(0);
    this.joystickThumb = this.add.circle(x, y, 25, 0xffffff, 0.5).setDepth(151).setScrollFactor(0);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < this.cameras.main.width / 2) { this.joystickPointer = pointer; }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { if (this.joystickPointer === pointer) { } });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => { if (this.joystickPointer === pointer) { this.joystickPointer = null; } });
  }

  private createHud() {
    this.hudText = this.add.text(20, 20, '', { fontSize: '18px', fontFamily: 'monospace', color: '#fff', backgroundColor: '#000000aa', padding: { x: 10, y: 5 } }).setScrollFactor(0).setDepth(100);
    this.healthBar = this.add.rectangle(20, 60, 200, 16, 0xff4d4f).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
    this.add.rectangle(20, 60, 200, 16, 0x333333).setOrigin(0, 0.5).setScrollFactor(0).setDepth(99);
    this.missionText = this.add.text(this.cameras.main.width / 2, 100, '', { fontSize: '32px', color: '#ffdd57', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
  }

  private createPauseButton() {
    const btn = this.add.text(WORLD_WIDTH - 20, 20, '❚❚', { fontSize: '24px', color: '#fff', backgroundColor: '#333', padding: {x:10, y:5} })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(100).setInteractive();
    
    btn.on('pointerdown', () => {
      this.scene.pause();
      const overlay = this.add.rectangle(WORLD_WIDTH/2, WORLD_HEIGHT/2, WORLD_WIDTH, WORLD_HEIGHT, 0x000000, 0.8).setDepth(300);
      const txt = this.add.text(WORLD_WIDTH/2, WORLD_HEIGHT/2, 'PAUSED\n\nTAP TO RESUME', { color:'#fff', fontSize:'32px', align:'center' }).setOrigin(0.5).setDepth(301);
      overlay.setInteractive();
      overlay.on('pointerdown', () => { overlay.destroy(); txt.destroy(); this.scene.resume(); });
    });
  }

  private startTimers() {
    this.time.addEvent({ delay: 2000, callback: () => {
      if(this.isGameOver) return;
      this.enemies.getChildren().forEach((e: any) => {
        if(Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 600 && Math.random() < 0.3) this.enemyShoot(e);
      });
    }, loop: true });
    this.time.addEvent({ delay: 1000, callback: () => { this.remainingSeconds--; if(this.remainingSeconds<=0) this.failMission('TIME UP'); }, loop: true });
  }

  private enemyShoot(e: Phaser.Physics.Arcade.Sprite) {
    const b = this.enemyBullets.get(e.x, e.y, 'enemy_bullet') as Phaser.Physics.Arcade.Image;
    if(!b) return;
    const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    b.setActive(true).setVisible(true).setRotation(ang).setDepth(29);
    const bdy = b.body as Phaser.Physics.Arcade.Body;
    bdy.enable = true; bdy.setAllowGravity(false);
    this.physics.velocityFromRotation(ang, 400, bdy.velocity);
    this.time.delayedCall(2000, () => { b.setActive(false).setVisible(false); });
  }

  private damagePlayer(a: number) { if(this.isGameOver) return; this.health -= a; this.cameras.main.shake(100, 0.01); if(this.health <= 0) this.failMission('DIED'); }
  private unlockExtraction() { this.extractionUnlocked = true; this.extractionText.setText('EXTRACTION\nREADY').setColor('#00ff00'); this.showMissionText('EXTRACTION UNLOCKED'); }
  private async completeMission() {
    if(this.isGameOver) return; this.isGameOver = true; this.showMissionText('MISSION COMPLETE');
    try { await apiClient.post('/api/game/complete', { runId: this.runData.run.id, sessionToken: this.runData.sessionToken, clientHash: 'lvl1-done', stats: { kills: this.kills, damageDealt: this.score, damageTaken: 0, accuracy: 1, timeElapsed: 0, wavesCleared: 1, bossKilled: false } }); } catch (e) {}
    window.dispatchEvent(new CustomEvent('WAR_PIGS_EVENT', { detail: { type: 'STATE_CHANGE', state: 'victory' } }));
  }
  private failMission(r: string) { if(this.isGameOver) return; this.isGameOver = true; this.showMissionText(r); window.dispatchEvent(new CustomEvent('WAR_PIGS_EVENT', { detail: { type: 'STATE_CHANGE', state: 'defeat' } })); }
  private showMissionText(t: string) { if(!this.missionText) return; this.missionText.setText(t).setVisible(true); this.time.delayedCall(2000, () => this.missionText.setVisible(false)); }
  private updateHud() { this.hudText.setText(`KILLS: ${this.kills}/${KILL_TARGET} | TIME: ${this.remainingSeconds}`); this.healthBar.width = 200 * (this.health / this.maxHealth); }
  private resolveTexture(k: string[], f: string) { for (const i of k) if (i && this.textures.exists(i)) return i; return f; }
  private cleanup() {}
}
