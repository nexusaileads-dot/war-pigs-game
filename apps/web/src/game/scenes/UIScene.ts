import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: true });
  }

  create() {
    // The UI elements (Health bar, $PIGS counter) are handled 
    // by the React overlay (HUD.tsx) instead of Phaser text.
    // This scene runs in parallel to keep the architecture clean.
  }
}