import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.image('grunt_bacon', '/assets/sprites/Grunt-Bacon.png');
    this.load.image('iron_tusk', '/assets/sprites/Iron-Tusk.png');
    this.load.image('swift_hoof', '/assets/sprites/Swift-Hoof.png');
    this.load.image('precision_squeal', '/assets/sprites/Precision-Squeal.png');
    this.load.image('blast_ham', '/assets/sprites/Blast-Ham.png');
    this.load.image('general_goldsnout', '/assets/sprites/General-Goldsnout.png');

    this.load.image('wolf_grunt', '/assets/sprites/Wolf-Conscript.png');
    this.load.image('wolf_soldier', '/assets/sprites/Wolf-Regular.png');
    this.load.image('wolf_heavy', '/assets/sprites/Wolf-Heavy-Gunner.png');
    this.load.image('cyber_fox', '/assets/sprites/Cyber-Fox-Assassin.png');
    this.load.image('drone_bomber', '/assets/sprites/Kamikaze-Crow.png');
    this.load.image('bear_commando', '/assets/sprites/Ursine-Commando.png');

    this.load.image('alpha_wolfgang', '/assets/sprites/Wolfgang-the-Ravager.png');
    this.load.image('mecha_bruin', '/assets/sprites/Bruin-Mech-7.png');
    this.load.image('shadow_fox_prime', '/assets/sprites/Vixen-Prime.png');

    this.load.image('oink_pistol', '/assets/sprites/Oink-9-Pistol.png');
    this.load.image('sow_machinegun', '/assets/sprites/Sow-MP5.png');
    this.load.image('boar_rifle', '/assets/sprites/Boar-AR15.png');
    this.load.image('tusk_shotgun', '/assets/sprites/Double-Tusk-Shotgun.png');
    this.load.image('sniper_swine', '/assets/sprites/Longbore-Sniper.png');
    this.load.image('belcha_minigun', '/assets/sprites/Belcha-Minigun.png');
    this.load.image('plasma_porker', '/assets/sprites/Plasma-Porker-X.png');
    this.load.image('bacon_blaster', '/assets/sprites/Bacon-Blaster-9000.png');

    this.load.image('bullet', '/assets/sprites/Standard-Bullet.png');
    this.load.image('sniper_bullet', '/assets/sprites/Sniper-Caliber-Bullet.png');
    this.load.image('plasma_globule', '/assets/sprites/Plasma-Globule.png');
    this.load.image('rocket', '/assets/sprites/Explosive-Projectile.png');
    this.load.image('explosion', '/assets/sprites/Explosion-Effect.png');

    this.load.image('background', '/assets/sprites/map.png');
    this.load.image('pig_token', '/assets/sprites/pig-token.png');

    this.load.image('player', '/assets/sprites/Grunt-Bacon.png');
    this.load.image('enemy', '/assets/sprites/Wolf-Conscript.png');
    this.load.image('boss', '/assets/sprites/Wolfgang-the-Ravager.png');
  }

  create() {
    this.scene.start('GameScene');
  }
  }
