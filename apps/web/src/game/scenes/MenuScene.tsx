import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0a0a0a');

    this.add
      .text(width / 2, height / 2 - 40, 'WAR PIGS', {
        fontSize: '48px',
        color: '#ff6b35',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 10, 'Fallback Phaser Menu', {
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 40, 'React UI should render above this scene.', {
        fontSize: '14px',
        color: '#aaaaaa'
      })
      .setOrigin(0.5);
  }
        }
