import Phaser from 'phaser';

type ImageAsset = {
  key: string;
  path: string;
};

const SPRITES = '/assets/sprites';
const SIDE = '/assets/game/sidescroller';

const IMAGE_ASSETS: ImageAsset[] = [
  // Side-scroller backgrounds
  { key: 'side_level_1_bg', path: `${SIDE}/backgrounds/level-1-bg.png` },
  { key: 'side_level_2_bg', path: `${SIDE}/backgrounds/level-2-bg.png` },

  // Side-scroller tiles / props
  { key: 'side_ground', path: `${SIDE}/tiles/ground.png` },
  { key: 'side_platform', path: `${SIDE}/tiles/platform.png` },
  { key: 'side_crate', path: `${SIDE}/tiles/crate.png` },
  { key: 'side_building_broken', path: `${SIDE}/props/building-broken.png` },
  { key: 'side_barrel', path: `${SIDE}/props/barrel.png` },
  { key: 'side_barricade', path: `${SIDE}/props/barricade.png` },

  // Current/fallback game background
  { key: 'background', path: `${SPRITES}/background.png` },

  // Characters
  { key: 'grunt_bacon', path: `${SPRITES}/Grunt-Bacon.png` },
  { key: 'iron_tusk', path: `${SPRITES}/Iron-Tusk.png` },
  { key: 'swift_hoof', path: `${SPRITES}/Swift-Hoof.png` },
  { key: 'precision_squeal', path: `${SPRITES}/Precision-Squeal.png` },
  { key: 'blast_ham', path: `${SPRITES}/Blast-Ham.png` },
  { key: 'general_goldsnout', path: `${SPRITES}/General-Goldsnout.png` },
  { key: 'player', path: `${SPRITES}/Grunt-Bacon.png` },

  // Weapons
  { key: 'oink_pistol', path: `${SPRITES}/Oink-9-Pistol.png` },
  { key: 'sow_machinegun', path: `${SPRITES}/Sow-MP5.png` },
  { key: 'boar_rifle', path: `${SPRITES}/Boar-AR15.png` },
  { key: 'tusk_shotgun', path: `${SPRITES}/Double-Tusk-Shotgun.png` },
  { key: 'sniper_swine', path: `${SPRITES}/Longbore-Sniper.png` },
  { key: 'belcha_minigun', path: `${SPRITES}/Belcha-Minigun.png` },
  { key: 'plasma_porker', path: `${SPRITES}/Plasma-Porker-X.png` },
  { key: 'bacon_blaster', path: `${SPRITES}/Bacon-Blaster-9000.png` },

  // Projectiles / effects
  { key: 'bullet', path: `${SPRITES}/Standard-Bullet.png` },
  { key: 'sniper_bullet', path: `${SPRITES}/Sniper-Bullet.png` },
  { key: 'plasma_globule', path: `${SPRITES}/Plasma-Globule.png` },
  { key: 'rocket', path: `${SPRITES}/Rocket.png` },
  { key: 'explosion', path: `${SPRITES}/explosion.png` },
  { key: 'muzzle_flash', path: `${SPRITES}/muzzle-flash.png` },

  // Current enemies
  { key: 'wolf_grunt', path: `${SPRITES}/wolf-grunt.png` },
  { key: 'wolf_soldier', path: `${SPRITES}/wolf-soldier.png` },
  { key: 'wolf_heavy', path: `${SPRITES}/wolf-heavy.png` },
  { key: 'cyber_fox', path: `${SPRITES}/cyber-fox.png` },
  { key: 'alpha_wolfgang', path: `${SPRITES}/alpha-wolfgang.png` },

  // Future side-scroller enemies
  { key: 'enemy_soldier', path: `${SIDE}/enemies/enemy-soldier.png` },
  { key: 'enemy_heavy', path: `${SIDE}/enemies/enemy-heavy.png` },
  { key: 'drone', path: `${SIDE}/enemies/drone.png` },
  { key: 'helicopter', path: `${SIDE}/enemies/helicopter.png` },
  { key: 'tank', path: `${SIDE}/enemies/tank.png` }
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.cameras.main.setBackgroundColor('#050505');

    const width = this.scale.width || 1600;
    const height = this.scale.height || 900;

    const loadingText = this.add
      .text(width / 2, height / 2 - 28, 'LOADING WAR PIGS...', {
        fontSize: '28px',
        color: '#ff6b35',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const progressBorder = this.add
      .rectangle(width / 2, height / 2 + 18, 320, 18, 0x111111, 1)
      .setStrokeStyle(2, 0xff6b35, 1);

    const progressFill = this.add
      .rectangle(width / 2 - 158, height / 2 + 18, 0, 12, 0xff6b35, 1)
      .setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      progressFill.width = 316 * value;
    });

    this.load.on('complete', () => {
      loadingText.destroy();
      progressBorder.destroy();
      progressFill.destroy();
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn('[BootScene] Asset failed to load:', file.key, file.src);
    });

    IMAGE_ASSETS.forEach((asset) => {
      if (!this.textures.exists(asset.key)) {
        this.load.image(asset.key, asset.path);
      }
    });
  }

  create() {
    this.scene.start('GameScene');
  }
}
