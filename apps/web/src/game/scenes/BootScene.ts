import Phaser from 'phaser';

// Typed asset keys to prevent runtime typos
export const ASSET_KEYS = {
  // Backgrounds
  BG_LEVEL1_LEFT: 'level1_bg_left',
  BG_LEVEL1_MIDDLE: 'level1_bg_middle',
  BG_LEVEL1_RIGHT: 'level1_bg_right',
  
  // Enemies
  ENEMY_SOLDIER_L1: 'level1_soldier',
  ENEMY_DRONE_L1: 'level1_drone',
  ENEMY_MINI_TANK_L1: 'level1_mini_tank',
  
  // Characters
  CHAR_GRUNT_BACON: 'grunt_bacon',
  CHAR_IRON_TUSK: 'iron_tusk',
  CHAR_SWIFT_HOOF: 'swift_hoof',
  CHAR_PRECISION_SQUEAL: 'precision_squeal',
  CHAR_BLAST_HAM: 'blast_ham',
  CHAR_GENERAL_GOLDSNOUT: 'general_goldsnout',
  
  // Weapons
  WPN_OINK_PISTOL: 'oink_pistol',
  WPN_SOW_MACHINEGUN: 'sow_machinegun',
  WPN_BOAR_RIFLE: 'boar_rifle',
  WPN_TUSK_SHOTGUN: 'tusk_shotgun',
  WPN_SNIPER_SWINE: 'sniper_swine',
  WPN_BELCHA_MINIGUN: 'belcha_minigun',
  WPN_PLASMA_PORKER: 'plasma_porker',
  WPN_BACON_BLASTER: 'bacon_blaster',
  
  // Projectiles & VFX
  PROJ_BULLET: 'bullet',
  PROJ_SNIPER: 'sniper_bullet',
  PROJ_PLASMA: 'plasma_globule',
  PROJ_ROCKET: 'rocket',
  VFX_EXPLOSION: 'explosion'
} as const;

export class BootScene extends Phaser.Scene {
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Dynamic base URL for subpath deployments
    const baseUrl = import.meta.env.BASE_URL || '/';
    this.load.setBaseURL(baseUrl);
    this.load.setPath('assets');

    // Progress feedback
    this.progressText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Loading assets: 0%',
      { font: '24px monospace', color: '#ff6b35', backgroundColor: '#1a1a1a', padding: { x: 12, y: 6 } }
    ).setOrigin(0.5);

    // Track load progress
    this.load.on('progress', (value: number) => {
      this.progressText.setText(`Loading assets: ${Math.round(value * 100)}%`);
    });

    // Handle individual asset load errors (dev-only halt)
    this.load.on('fileloaderror', (file: Phaser.Loader.File) => {
      console.error(`[BootScene] Failed to load asset: ${file.key} from ${file.url}`);
      if (import.meta.env.DEV) {
        this.progressText.setColor('#ff0000').setText(`MISSING: ${file.key}`);
      }
    });

    // Backgrounds
    this.load.image(ASSET_KEYS.BG_LEVEL1_LEFT, 'backgrounds/level1-left.png');
    this.load.image(ASSET_KEYS.BG_LEVEL1_MIDDLE, 'backgrounds/level1-middle.png');
    this.load.image(ASSET_KEYS.BG_LEVEL1_RIGHT, 'backgrounds/level1-right.png');

    // Enemies
    this.load.image(ASSET_KEYS.ENEMY_SOLDIER_L1, 'sprites/enemies/level1-soldier.png');
    this.load.image(ASSET_KEYS.ENEMY_DRONE_L1, 'sprites/enemies/level1-drone.png');
    this.load.image(ASSET_KEYS.ENEMY_MINI_TANK_L1, 'sprites/enemies/level1-mini-tank.png');

    // Characters
    this.load.image(ASSET_KEYS.CHAR_GRUNT_BACON, 'sprites/Grunt-Bacon.png');
    this.load.image(ASSET_KEYS.CHAR_IRON_TUSK, 'sprites/Iron-Tusk.png');
    this.load.image(ASSET_KEYS.CHAR_SWIFT_HOOF, 'sprites/Swift-Hoof.png');
    this.load.image(ASSET_KEYS.CHAR_PRECISION_SQUEAL, 'sprites/Precision-Squeal.png');
    this.load.image(ASSET_KEYS.CHAR_BLAST_HAM, 'sprites/Blast-Ham.png');
    this.load.image(ASSET_KEYS.CHAR_GENERAL_GOLDSNOUT, 'sprites/General-Goldsnout.png');

    // Weapons
    this.load.image(ASSET_KEYS.WPN_OINK_PISTOL, 'sprites/Oink-9-Pistol.png');
    this.load.image(ASSET_KEYS.WPN_SOW_MACHINEGUN, 'sprites/Sow-MP5.png');
    this.load.image(ASSET_KEYS.WPN_BOAR_RIFLE, 'sprites/Boar-AR15.png');
    this.load.image(ASSET_KEYS.WPN_TUSK_SHOTGUN, 'sprites/Double-Tusk-Shotgun.png');
    this.load.image(ASSET_KEYS.WPN_SNIPER_SWINE, 'sprites/Longbore-Sniper.png');
    this.load.image(ASSET_KEYS.WPN_BELCHA_MINIGUN, 'sprites/Belcha-Minigun.png');
    this.load.image(ASSET_KEYS.WPN_PLASMA_PORKER, 'sprites/Plasma-Porker-X.png');
    this.load.image(ASSET_KEYS.WPN_BACON_BLASTER, 'sprites/Bacon-Blaster-9000.png');

    // Projectiles & VFX
    this.load.image(ASSET_KEYS.PROJ_BULLET, 'sprites/Standard-Bullet.png');
    this.load.image(ASSET_KEYS.PROJ_SNIPER, 'sprites/Sniper-Round.png');
    this.load.image(ASSET_KEYS.PROJ_PLASMA, 'sprites/Plasma-Globule.png');
    this.load.image(ASSET_KEYS.PROJ_ROCKET, 'sprites/Rocket.png');
    this.load.image(ASSET_KEYS.VFX_EXPLOSION, 'sprites/Explosion.png');

    // NOTE: Audio assets to be added in future pass:
    // this.load.audio('sfx_shot', 'audio/shot.mp3');
    // this.load.audio('music_level1', 'audio/level1-loop.ogg');
  }

  create() {
    // Ensure all assets are fully loaded before proceeding
    if (this.load.progress < 1) {
      this.load.once('complete', () => {
        this.progressText.destroy();
        this.scene.start('GameScene');
      });
    } else {
      this.progressText.destroy();
      this.scene.start('GameScene');
    }
  }
}
