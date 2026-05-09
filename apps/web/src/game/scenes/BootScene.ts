import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    console.log('[BootScene] Loading assets...');

    // Add a loading indicator so the screen isn't purely black during load
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const loadingText = this.add.text(width / 2, height / 2, 'LOADING ASSETS...', {
      font: '24px monospace',
      color: '#ff6b35' // Matching your UI theme
    });
    loadingText.setOrigin(0.5, 0.5);

    // Helper to handle Vercel/Vite base paths correctly
    const asset = (path: string) => {
      const base = import.meta.env.BASE_URL || '/';
      return `${base.endsWith('/') ? base : base + '/'}${path}`;
    };

    // CRITICAL FIX: Prevent silent failures if an asset path is wrong/missing
    this.load.on('loaderror', (fileObj: Phaser.Loader.File) => {
      console.error(`[BootScene] FATAL: Failed to load asset key: "${fileObj.key}" at URL: "${fileObj.src}"`);
    });

    this.load.on('complete', () => {
      loadingText.destroy();
    });

    // --- BACKGROUNDS ---
    this.load.image('level1_bg_left', asset('assets/backgrounds/level1-left.png'));
    this.load.image('level1_bg_middle', asset('assets/backgrounds/level1-middle.png'));
    this.load.image('level1_bg_right', asset('assets/backgrounds/level1-right.png'));

    // --- LEVEL 1 ENEMIES ---
    this.load.image('level1_soldier', asset('assets/sprites/enemies/level1-soldier.png'));
    this.load.image('level1_drone', asset('assets/sprites/enemies/level1-drone.png'));
    this.load.image('level1_mini_tank', asset('assets/sprites/enemies/level1-mini-tank.png'));

    // --- PLAYABLE CHARACTERS ---
    this.load.image('grunt_bacon', asset('assets/sprites/Grunt-Bacon.png'));
    this.load.image('iron_tusk', asset('assets/sprites/Iron-Tusk.png'));
    this.load.image('swift_hoof', asset('assets/sprites/Swift-Hoof.png'));
    this.load.image('precision_squeal', asset('assets/sprites/Precision-Squeal.png'));
    this.load.image('blast_ham', asset('assets/sprites/Blast-Ham.png'));
    this.load.image('general_goldsnout', asset('assets/sprites/General-Goldsnout.png'));

    // --- WEAPONS ---
    this.load.image('oink_pistol', asset('assets/sprites/Oink-9-Pistol.png'));
    this.load.image('sow_machinegun', asset('assets/sprites/Sow-MP5.png'));
    this.load.image('boar_rifle', asset('assets/sprites/Boar-AR15.png'));
    this.load.image('tusk_shotgun', asset('assets/sprites/Double-Tusk-Shotgun.png'));
    this.load.image('sniper_swine', asset('assets/sprites/Longbore-Sniper.png'));
    this.load.image('belcha_minigun', asset('assets/sprites/Belcha-Minigun.png'));
    this.load.image('plasma_porker', asset('assets/sprites/Plasma-Porker-X.png'));
    this.load.image('bacon_blaster', asset('assets/sprites/Bacon-Blaster-9000.png'));

    // --- PROJECTILES ---
    this.load.image('bullet', asset('assets/sprites/Standard-Bullet.png'));
    this.load.image('sniper_bullet', asset('assets/sprites/Sniper-Caliber-Bullet.png'));
    this.load.image('plasma_globule', asset('assets/sprites/Plasma-Globule.png'));
    this.load.image('rocket', asset('assets/sprites/Explosive-Projectile.png'));
    
    // --- EFFECTS ---
    this.load.image('explosion', asset('assets/sprites/Explosion-Effect.png'));
  }

  create() {
    console.log('[BootScene] Assets loaded. Starting GameScene.');
    this.scene.start('GameScene');
  }
}
