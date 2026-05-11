import Phaser from 'phaser';
import { socket } from '../../api/socket';

const WORLD_WIDTH = 1600; // Smaller arena for 1v1
const WORLD_HEIGHT = 720;
const GROUND_Y = 640;

export class PvPScene extends Phaser.Scene {
  private roomData!: any;
  private isPlayer1!: boolean;
  
  private localPlayer!: Phaser.Physics.Arcade.Sprite;
  private opponentPlayer!: Phaser.Physics.Arcade.Sprite;
  
  private localBullets!: Phaser.Physics.Arcade.Group;
  private opponentBullets!: Phaser.Physics.Arcade.Group;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  private localHealth = 100;
  private opponentHealth = 100;
  private localHealthBar!: Phaser.GameObjects.Rectangle;
  private opponentHealthBar!: Phaser.GameObjects.Rectangle;
  private overlayText!: Phaser.GameObjects.Text;

  private facing: 1 | -1 = 1;
  private isGameOver = false;
  private lastFired = 0;

  constructor() { super({ key: 'PvPScene' }); }

  init(data: { roomData: any }) {
    this.roomData = data.roomData;
    // P1 is the first player in the array
    this.isPlayer1 = this.roomData.players[0].socketId === socket.id;
  }

  preload() {
    const asset = (path: string) => {
      const base = import.meta.env.BASE_URL || '/';
      return `${base.endsWith('/') ? base : base + '/'}${path}`;
    };

    // Load necessary assets directly in this scene so it's standalone
    this.load.image('level1_bg_middle', asset('assets/backgrounds/level1-middle.png'));
    this.load.image('bullet', asset('assets/sprites/Standard-Bullet.png'));
    
    // Load characters based on room data
    this.roomData.players.forEach((p: any) => {
      const charName = p.characterId.split('_').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('-') + '.png';
      this.load.image(p.characterId, asset(`assets/sprites/${charName}`));
    });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Background & Floor
    this.add.rectangle(WORLD_WIDTH/2, WORLD_HEIGHT/2, WORLD_WIDTH, WORLD_HEIGHT, 0x87CEEB).setDepth(-60);
    this.add.image(0, 0, 'level1_bg_middle').setOrigin(0,0).setDepth(-55).setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
    this.platforms = this.physics.add.staticGroup();
    const floor = this.add.rectangle(WORLD_WIDTH/2, WORLD_HEIGHT - 50, WORLD_WIDTH, 100, 0x3c2b21, 1);
    this.physics.add.existing(floor, true);
    this.platforms.add(floor);

    this.localBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 30 });
    this.opponentBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 30 });

    // Spawn Players (P1 left, P2 right)
    const localData = this.isPlayer1 ? this.roomData.players[0] : this.roomData.players[1];
    const opponentData = this.isPlayer1 ? this.roomData.players[1] : this.roomData.players[0];

    const localSpawnX = this.isPlayer1 ? 200 : WORLD_WIDTH - 200;
    const oppSpawnX = this.isPlayer1 ? WORLD_WIDTH - 200 : 200;
    
    this.facing = this.isPlayer1 ? 1 : -1;

    this.localPlayer = this.physics.add.sprite(localSpawnX, 300, localData.characterId).setDisplaySize(72, 72).setCollideWorldBounds(true);
    this.opponentPlayer = this.physics.add.sprite(oppSpawnX, 300, opponentData.characterId).setDisplaySize(72, 72).setCollideWorldBounds(true);
    
    this.opponentPlayer.setFlipX(!this.isPlayer1);
    this.localPlayer.setFlipX(this.isPlayer1 ? false : true);

    this.physics.add.collider(this.localPlayer, this.platforms);
    this.physics.add.collider(this.opponentPlayer, this.platforms);

    this.setupUI();
    this.setupInput();
    this.setupCollisions();
    this.setupSocketListeners();

    // Broadcast our position 20 times a second
    this.time.addEvent({
      delay: 50,
      callback: () => {
        if (!this.isGameOver) {
          socket.emit('player_action', {
            roomId: this.roomData.roomId,
            x: this.localPlayer.x,
            y: this.localPlayer.y,
            flipX: this.localPlayer.flipX
          });
        }
      },
      loop: true
    });
  }

  update() {
    if (this.isGameOver) return;
    
    let h = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) h -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) h += 1;

    this.localPlayer.setVelocityX(h * 350);
    if (h !== 0) {
      this.facing = h > 0 ? 1 : -1;
      this.localPlayer.setFlipX(this.facing === -1);
    }
  }

  private shoot() {
    if (this.isGameOver || this.time.now - this.lastFired < 300) return;
    this.lastFired = this.time.now;

    const b = this.localBullets.get(this.localPlayer.x, this.localPlayer.y, 'bullet') as Phaser.Physics.Arcade.Image;
    if (!b) return;

    b.setActive(true).setVisible(true).setPosition(this.localPlayer.x + (this.facing * 30), this.localPlayer.y + 10).setRotation(this.facing === 1 ? 0 : Math.PI);
    b.setScale(0.5);
    (b.body as Phaser.Physics.Arcade.Body).enable = true;
    (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (b.body as Phaser.Physics.Arcade.Body).setVelocityX(this.facing * 1200);

    // Tell opponent we shot
    socket.emit('player_shoot', {
      roomId: this.roomData.roomId,
      x: b.x,
      y: b.y,
      facing: this.facing
    });

    this.time.delayedCall(1500, () => { if(b.active) b.destroy(); });
  }

  private setupSocketListeners() {
    socket.on('opponent_action', (data: any) => {
      if (this.isGameOver) return;
      // Smooth interpolation would go here, but absolute positioning works for MVP
      this.opponentPlayer.setPosition(data.x, data.y);
      this.opponentPlayer.setFlipX(data.flipX);
    });

    socket.on('opponent_shoot', (data: any) => {
      if (this.isGameOver) return;
      const b = this.opponentBullets.get(data.x, data.y, 'bullet') as Phaser.Physics.Arcade.Image;
      if (!b) return;
      b.setActive(true).setVisible(true).setRotation(data.facing === 1 ? 0 : Math.PI).setScale(0.5);
      (b.body as Phaser.Physics.Arcade.Body).enable = true;
      (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      (b.body as Phaser.Physics.Arcade.Body).setVelocityX(data.facing * 1200);
      this.time.delayedCall(1500, () => { if(b.active) b.destroy(); });
    });

    socket.on('opponent_disconnected', () => {
      if (!this.isGameOver) this.endGame('OPPONENT DISCONNECTED. YOU WIN!');
    });
  }

  private setupInput() {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D, up: Phaser.Input.Keyboard.KeyCodes.W }) as any;
    
    this.input.keyboard.on('keydown-SPACE', () => this.shoot());
    this.input.keyboard.on('keydown-W', () => { if ((this.localPlayer.body as Phaser.Physics.Arcade.Body).blocked.down) this.localPlayer.setVelocityY(-700); });
    this.input.keyboard.on('keydown-UP', () => { if ((this.localPlayer.body as Phaser.Physics.Arcade.Body).blocked.down) this.localPlayer.setVelocityY(-700); });
  }

  private setupCollisions() {
    // When opponent's bullet hits me
    this.physics.add.overlap(this.opponentBullets, this.localPlayer, (player, bullet) => {
      bullet.destroy();
      this.localHealth -= 10;
      this.localHealthBar.width = 200 * (Math.max(0, this.localHealth) / 100);
      this.localPlayer.setTint(0xff0000);
      this.time.delayedCall(100, () => this.localPlayer.clearTint());

      if (this.localHealth <= 0) {
        // I died! Send a message (can be handled via health sync later)
        this.endGame('YOU DIED. DEFEAT!');
      }
    });

    // When my bullet hits the opponent
    this.physics.add.overlap(this.localBullets, this.opponentPlayer, (opp, bullet) => {
      bullet.destroy();
      this.opponentHealth -= 10;
      this.opponentHealthBar.width = 200 * (Math.max(0, this.opponentHealth) / 100);
      this.opponentPlayer.setTint(0xff0000);
      this.time.delayedCall(100, () => this.opponentPlayer.clearTint());

      if (this.opponentHealth <= 0) {
        this.endGame('OPPONENT ELIMINATED. VICTORY!');
      }
    });
  }

  private setupUI() {
    const camW = this.cameras.main.width;
    
    this.add.text(20, 20, 'YOU', { fontSize: '18px', color: '#fff', fontWeight: 'bold' }).setScrollFactor(0);
    this.add.rectangle(20, 50, 200, 16, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
    this.localHealthBar = this.add.rectangle(20, 50, 200, 16, 0x4caf50).setOrigin(0, 0.5).setScrollFactor(0);

    this.add.text(camW - 20, 20, 'ENEMY', { fontSize: '18px', color: '#ff4d4f', fontWeight: 'bold' }).setOrigin(1, 0).setScrollFactor(0);
    this.add.rectangle(camW - 220, 50, 200, 16, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
    this.opponentHealthBar = this.add.rectangle(camW - 220, 50, 200, 16, 0xff4d4f).setOrigin(0, 0.5).setScrollFactor(0);
    
    this.overlayText = this.add.text(camW/2, 200, '', { fontSize: '48px', color: '#ffd700', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setVisible(false);
  }

  private endGame(message: string) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.physics.pause();
    this.overlayText.setText(message).setVisible(true);

    this.time.delayedCall(3000, () => {
      window.dispatchEvent(new CustomEvent('WAR_PIGS_PVP_EVENT', { detail: { type: 'PVP_EXIT' } }));
    });
  }
  }
      
