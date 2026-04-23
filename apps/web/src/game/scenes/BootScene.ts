import Phaser from 'phaser';

type AssetDef = {
  key: string;
  path: string;
};

const IMAGE_ASSETS: AssetDef[] = [
  { key: 'grunt_bacon', path: 'assets/sprites/Grunt-Bacon.png' },
  { key: 'iron_tusk', path: 'assets/sprites/Iron-Tusk.png' },
  { key: 'swift_hoof', path: 'assets/sprites/Swift-Hoof.png' },
  { key: 'precision_squeal', path: 'assets/sprites/Precision-Squeal.png' },
  { key: 'blast_ham', path: 'assets/sprites/Blast-Ham.png' },
  { key: 'general_goldsnout', path: 'assets/sprites/General-Goldsnout.png' },

  { key: 'wolf_grunt', path: 'assets/sprites/Wolf-Conscript.png' },
  { key: 'wolf_soldier', path: 'assets/sprites/Wolf-Regular.png' },
  { key: 'wolf_heavy', path: 'assets/sprites/Wolf-Heavy-Gunner.png' },
  { key: 'cyber_fox', path: 'assets/sprites/Cyber-Fox-Assassin.png' },
  { key: 'drone_bomber', path: 'assets/sprites/Kamikaze-Crow.png' },
  { key: 'bear_commando', path: 'assets/sprites/Ursine-Commando.png' },

  { key: 'alpha_wolfgang', path: 'assets/sprites/Wolfgang-the-Ravager.png' },
  { key: 'mecha_bruin', path: 'assets/sprites/Bruin-Mech-7.png' },
  { key: 'shadow_fox_prime', path: 'assets/sprites/Vixen-Prime.png' },

  { key: 'oink_pistol', path: 'assets/sprites/Oink-9-Pistol.png' },
  { key: 'sow_machinegun', path: 'assets/sprites/Sow-MP5.png' },
  { key: 'boar_rifle', path: 'assets/sprites/Boar-AR15.png' },
  { key: 'tusk_shotgun', path: 'assets/sprites/Double-Tusk-Shotgun.png' },
  { key: 'sniper_swine', path: 'assets/sprites/Longbore-Sniper.png' },
  { key: 'belcha_minigun', path: 'assets/sprites/Belcha-Minigun.png' },
  { key: 'plasma_porker', path: 'assets/sprites/Plasma-Porker-X.png' },
  { key: 'bacon_blaster', path: 'assets/sprites/Bacon-Blaster-9000.png' },

  { key: 'bullet', path: 'assets/sprites/Standard-Bullet.png' },
  { key: 'sniper_bullet', path: 'assets/sprites/Sniper-Caliber-Bullet.png' },
  { key: 'plasma_globule', path: 'assets/sprites/Plasma-Globule.png' },
  { key: 'rocket', path: 'assets/sprites/Explosive-Projectile.png' },
  { key: 'explosion', path: 'assets/sprites/Explosion-Effect.png' },

  { key: 'background', path: 'assets/sprites/map.png' },
  { key: 'pig_token', path: 'assets/sprites/pig-token.png' },
  { key: 'shop_ui', path: 'assets/sprites/shop.png' },

  { key: 'class_assault', path: 'assets/sprites/assault.png' },
  { key: 'class_tank', path: 'assets/sprites/tank.png' },
  { key: 'class_scout', path: 'assets/sprites/scout.png' },
  { key: 'class_sniper', path: 'assets/sprites/sniper.png' },

  { key: 'player', path: 'assets/sprites/Grunt-Bacon.png' },
  { key: 'enemy', path: 'assets/sprites/Wolf-Conscript.png' },
  { key: 'boss', path: 'assets/sprites/Wolfgang-the-Ravager.png' }
];

export class BootScene extends Phaser.Scene {
  private failedAssets: string[] = [];

  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.cameras.main.setBackgroundColor('#101010');

    const { width, height } = this.scale;

    const title = this.add
      .text(width / 2, height / 2 - 70, 'WAR PIGS', {
        fontSize: '32px',
        color: '#ff6b35',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(width / 2, height / 2 - 25, 'Loading assets...', {
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    const progressBox = this.add
      .rectangle(width / 2, height / 2 + 20, 404, 24, 0x222222)
      .setStrokeStyle(2, 0xff6b35);

    const progressBar = this.add
      .rectangle(width / 2 - 198, height / 2 + 20, 0, 18, 0xff6b35)
      .setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.width = 396 * value;
      statusText.setText(`Loading assets... ${Math.round(value * 100)}%`);
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      statusText.setText(`Loading: ${file.key}`);
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.failedAssets.push(`${file.key} -> ${file.src}`);
      console.error('[BootScene] Asset failed to load:', file.key, file.src);
    });

    this.load.on('complete', () => {
      if (this.failedAssets.length > 0) {
        console.error('[BootScene] Failed assets:', this.failedAssets);
        statusText.setText(
          `Missing assets: ${this.failedAssets.length}. Check /public/assets/sprites.`
        );
        statusText.setColor('#ff4d4f');
      } else {
        statusText.setText('Load complete');
      }

      this.time.delayedCall(250, () => {
        title.destroy();
        progressBox.destroy();
        progressBar.destroy();
        statusText.destroy();
      });
    });

    for (const asset of IMAGE_ASSETS) {
      this.load.image(asset.key, asset.path);
    }
  }

  create() {
    this.createFallbackTextures();

    if (this.failedAssets.length > 0) {
      console.warn('[BootScene] Starting GameScene with fallback textures enabled.');
    }

    this.scene.start('GameScene');
  }

  private createFallbackTextures() {
    this.ensureFallbackTexture('player', 40, 40, 0xff6b35);
    this.ensureFallbackTexture('enemy', 34, 34, 0xcc3333);
    this.ensureFallbackTexture('boss', 72, 72, 0x8b0000);
    this.ensureFallbackTexture('bullet', 8, 8, 0xffff66);
    this.ensureFallbackTexture('sniper_bullet', 12, 12, 0xffffff);
    this.ensureFallbackTexture('plasma_globule', 14, 14, 0x66e0ff);
    this.ensureFallbackTexture('rocket', 14, 6, 0xffaa00);
    this.ensureFallbackTexture('explosion', 48, 48, 0xff8844);
    this.ensureFallbackTexture('pig_token', 18, 18, 0xffd700);
    this.ensureFallbackTexture('background', 64, 64, 0x1f1f1f);
    this.ensureFallbackTexture('class_assault', 32, 32, 0x999999);
    this.ensureFallbackTexture('class_tank', 32, 32, 0x777777);
    this.ensureFallbackTexture('class_scout', 32, 32, 0x55aa55);
    this.ensureFallbackTexture('class_sniper', 32, 32, 0x5555aa);
    this.ensureFallbackTexture('shop_ui', 64, 24, 0x444444);
  }

  private ensureFallbackTexture(
    key: string,
    width: number,
    height: number,
    color: number
  ) {
    if (this.textures.exists(key)) return;

    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, width, height);
    g.generateTexture(key, width, height);
    g.destroy();
  }
  }
