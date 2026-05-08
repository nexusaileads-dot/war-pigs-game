import Phaser from 'phaser';
import { apiClient } from '../../api/client';

// ... (Types and Configs remain the same) ...

export class GameScene extends Phaser.Scene {
  // ... (Existing properties) ...
  
  // Skill System
  private skillCooldown: number = 0;
  private skillCooldownTime: number = 15000; // 15s default
  private skillActive: boolean = false;
  private skillButton!: Phaser.GameObjects.Container;

  constructor() { super({ key: 'GameScene' }); }

  // ... (create, preload, createFallbackTextures, createBackground, createPlatforms same as before) ...

  private createTouchControls() {
    const y = WORLD_HEIGHT - 80;
    this.addButton(80, y, 'LEFT', () => this.leftHeld = true, () => this.leftHeld = false);
    this.addButton(180, y, 'RIGHT', () => this.rightHeld = true, () => this.rightHeld = false);
    
    // Fire Button
    this.addButton(WORLD_WIDTH - 80, y, 'FIRE', () => this.fireHeld = true, () => this.fireHeld = false);
    
    // Jump Button
    this.addButton(WORLD_WIDTH - 180, y, 'JUMP', () => this.jump(), () => {});
    
    // SKILL BUTTON (New)
    this.addButton(WORLD_WIDTH - 280, y, 'SKILL', () => this.useSkill(), () => {});
  }
