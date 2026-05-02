import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.setPath('');

    this.load.image('level1_bg_left', '/assets/backgrounds/level1-left.png');
    this.load.image('level1_bg_middle', '/assets/backgrounds/level1-middle.png');
    this.load.image('level1_bg_right', '/assets/backgrounds/level1-right.png');

    this.load.image('level1_soldier', '/assets/sprites/enemies/level1-soldier.png');
    this.load.image('level1_drone', '/assets/sprites/enemies/level1-drone.png');
    this.load.image('level1_mini_tank', '/assets/sprites/enemies/level1-mini-tank.png');

    this.load.image('grunt_bacon', '/assets/sprites/Grunt-Bacon.png');
    this.load.image('iron_tusk', '/assets/sprites/Iron-Tusk.png');
    this.load.image('swift_hoof', '/assets/sprites/Swift-Hoof.png');
    this.load.image('precision_squeal', '/assets/sprites/Precision-Squeal.png');
    this.load.image('blast_ham', '/assets/sprites/Blast-Ham.png');
    this.load.image('general_goldsnout', '/assets/sprites/General-Goldsnout.png');

    this.load.image('player', '/assets/sprites/Grunt-Bacon.png');

    this.load.image('oink_pistol', '/assets/sprites/Oink-9-Pistol.png');
    this.load.image('sow_machinegun', '/assets/sprites/Sow-MP5.png');
    this.load.image('boar_rifle', '/assets/sprites/Boar-AR15.png');
    this.load.image('tusk_shotgun', '/assets/sprites/Double-Tusk-Shotgun.png');
    this.load.image('sniper_swine', '/assets/sprites/Longbore-Sniper.png');
    this.load.image('belcha_minigun', '/assets/sprites/Belcha-Minigun.png');
    this.load.image('plasma_porker', '/assets/sprites/Plasma-Porker-X.png');
    this.load.image('bacon_blaster', '/assets/sprites/Bacon-Blaster-9000.png');

    this.load.image('bullet', '/assets/sprites/Standard-Bullet.png');
    this.load.image('sniper_bullet', '/assets/sprites/Sniper-Round.png');
    this.load.image('plasma_globule', '/assets/sprites/Plasma-Globule.png');
    this.load.image('rocket', '/assets/sprites/Rocket.png');
    this.load.image('explosion', '/assets/sprites/Explosion.png');

    this.load.image('wolf_grunt', '/assets/sprites/enemies/level1-soldier.png');
    this.load.image('wolf_soldier', '/assets/sprites/enemies/level1-soldier.png');
    this.load.image('wolf_heavy', '/assets/sprites/enemies/level1-soldier.png');
    this.load.image('cyber_fox', '/assets/sprites/enemies/level1-drone.png');
    this.load.image('helicopter', '/assets/sprites/enemies/level1-drone.png');
    this.load.image('alpha_wolfgang', '/assets/sprites/enemies/level1-mini-tank.png');
  }

  create() {
    this.scene.start('GameScene');
  }
                    }
