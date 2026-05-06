import Phaser from 'phaser';

// Helper to handle base URL for assets (critical for Vercel/Production)
const getAssetUrl = (path: string) => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return `${normalizedBase}assets/${path}`;
};

export class BootScene extends Phaser.Scene {
  private progressText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    console.log('[BootScene] Preloading assets...');

    this.createLoadingText();

    this.load.on('progress', (value: number) => {
      if (this.progressText) {
        this.progressText.setText(`LOADING ASSETS ${Math.round(value * 100)}%`);
      }
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[BootScene] Failed to load asset: ${file.key}`, file.src);
    });

    this.load.on('complete', () => {
      console.log('[BootScene] Asset preload complete.');
    });

    this.loadBackgrounds();
    this.loadEnemies();
    this.loadCharacters();
    this.loadWeapons();
    this.loadProjectiles();
    this.loadVfx();
  }

  create() {
    this.progressText?.destroy();
    this.scene.start('GameScene');
  }

  private createLoadingText() {    this.progressText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'LOADING ASSETS 0%', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#ff6b35',
        fontStyle: 'bold',
        backgroundColor: '#000000cc',
        padding: {
          left: 14,
          right: 14,
          top: 10,
          bottom: 10
        }
      })
      .setOrigin(0.5);
  }

  private loadBackgrounds() {
    // Load with keys that match GameScene resolver logic
    this.load.image('level1_bg_left', getAssetUrl('backgrounds/level1-left.png'));
    this.load.image('level1_bg_middle', getAssetUrl('backgrounds/level1-middle.png'));
    this.load.image('level1_bg_right', getAssetUrl('backgrounds/level1-right.png'));

    // Load aliases just in case
    this.load.image('level1-left', getAssetUrl('backgrounds/level1-left.png'));
    this.load.image('level1-middle', getAssetUrl('backgrounds/level1-middle.png'));
    this.load.image('level1-right', getAssetUrl('backgrounds/level1-right.png'));
  }

  private loadEnemies() {
    // Load with keys that match GameScene resolver logic
    this.load.image('level1_soldier', getAssetUrl('sprites/enemies/level1-soldier.png'));
    this.load.image('level1_drone', getAssetUrl('sprites/enemies/level1-drone.png'));
    this.load.image('level1_mini_tank', getAssetUrl('sprites/enemies/level1-mini-tank.png'));

    // Load aliases
    this.load.image('enemy_soldier', getAssetUrl('sprites/enemies/level1-soldier.png'));
    this.load.image('enemy_drone', getAssetUrl('sprites/enemies/level1-drone.png'));
    this.load.image('enemy_mini_tank', getAssetUrl('sprites/enemies/level1-mini-tank.png'));
  }

  private loadCharacters() {
    this.load.image('grunt_bacon', getAssetUrl('sprites/Grunt-Bacon.png'));
    this.load.image('iron_tusk', getAssetUrl('sprites/Iron-Tusk.png'));
    this.load.image('swift_hoof', getAssetUrl('sprites/Swift-Hoof.png'));
    this.load.image('precision_squeal', getAssetUrl('sprites/Precision-Squeal.png'));
    this.load.image('blast_ham', getAssetUrl('sprites/Blast-Ham.png'));
    this.load.image('general_goldsnout', getAssetUrl('sprites/General-Goldsnout.png'));

    // Fallback player    this.load.image('player', getAssetUrl('sprites/Grunt-Bacon.png'));
  }

  private loadWeapons() {
    this.load.image('oink_pistol', getAssetUrl('sprites/Oink-9-Pistol.png'));
    this.load.image('sow_machinegun', getAssetUrl('sprites/Sow-MP5.png'));
    this.load.image('boar_rifle', getAssetUrl('sprites/Boar-AR15.png'));
    this.load.image('tusk_shotgun', getAssetUrl('sprites/Double-Tusk-Shotgun.png'));
    this.load.image('sniper_swine', getAssetUrl('sprites/Longbore-Sniper.png'));
    this.load.image('belcha_minigun', getAssetUrl('sprites/Belcha-Minigun.png'));
    this.load.image('plasma_porker', getAssetUrl('sprites/Plasma-Porker-X.png'));
    this.load.image('bacon_blaster', getAssetUrl('sprites/Bacon-Blaster-9000.png'));
  }

  private loadProjectiles() {
    this.load.image('bullet', getAssetUrl('sprites/Standard-Bullet.png'));
    this.load.image('sniper_bullet', getAssetUrl('sprites/Sniper-Round.png'));
    this.load.image('plasma_globule', getAssetUrl('sprites/Plasma-Globule.png'));
    this.load.image('rocket', getAssetUrl('sprites/Rocket.png'));

    this.load.image('player_bullet', getAssetUrl('sprites/Standard-Bullet.png'));
    this.load.image('enemy_bullet', getAssetUrl('sprites/Standard-Bullet.png'));
  }

  private loadVfx() {
    this.load.image('explosion', getAssetUrl('sprites/Explosion.png'));
  }
}
