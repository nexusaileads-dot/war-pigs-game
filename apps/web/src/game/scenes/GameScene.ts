import Phaser from 'phaser';
import { PigPlayer } from '../entities/PigPlayer';
import { apiClient } from '../../api/client';

export class GameScene extends Phaser.Scene {
  player!: PigPlayer;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: any;
  projectiles!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  lastShotTime: number = 0;
  kills: number = 0;
  spawnTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.physics.world.setBounds(0, 0, 1600, 1200);
    
    this.add.image(800, 600, 'background').setDisplaySize(1600, 1200);
    
    const runData = JSON.parse(sessionStorage.getItem('currentRun') || '{}');
    const characterKey = runData.run?.characterId || 'player';

    this.player = new PigPlayer(this, 800, 600, characterKey);
    this.cameras.main.startFollow(this.player);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.projectiles = this.physics.add.group({ defaultKey: 'bullet', maxSize: 50 });
    this.enemies = this.physics.add.group();

    this.input.on('pointerdown', () => this.shoot());

    this.spawnTimer = this.time.addEvent({
      delay: 2000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.physics.add.overlap(this.projectiles, this.enemies, this.handleHit, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerDamage, undefined, this);
  }

  update(time: number) {
    this.player.updateMovement(this.cursors, this.wasd, 200);
    
    const pointerX = this.input.activePointer.worldX;
    const pointerY = this.input.activePointer.worldY;

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointerX, pointerY);
    this.player.setData('aimAngle', angle);

    if (pointerX < this.player.x) {
      this.player.setFlipX(true);
    } else {
      this.player.setFlipX(false);
    }

    this.enemies.getChildren().forEach((enemy: any) => {
      if (enemy.active) {
        this.physics.moveToObject(enemy, this.player, 100);
        enemy.setFlipX(enemy.body.velocity.x < 0);
      }
    });
  }

  shoot() {
    const now = this.time.now;
    if (now - this.lastShotTime < 250) return;
    this.lastShotTime = now;

    const bullet = this.projectiles.get(this.player.x, this.player.y);
    if (bullet) {
      bullet.setActive(true).setVisible(true);
      bullet.setDisplaySize(12, 12); 
      
      const aimAngle = this.player.getData('aimAngle') || 0;
      
      this.physics.velocityFromRotation(aimAngle, 600, bullet.body.velocity);
      
      this.time.delayedCall(1000, () => { 
        if (bullet.active) {
          bullet.setActive(false).setVisible(false).body.stop(); 
        }
      });
    }
  }

  spawnEnemy() {
    const x = Phaser.Math.Between(0, 1600);
    const y = Phaser.Math.Between(0, 1200);
    const enemy = this.enemies.create(x, y, 'enemy');
    if (enemy) {
      enemy.setDisplaySize(64, 64);
      enemy.setActive(true).setVisible(true);
    }
  }

  handleHit(bullet: any, enemy: any) {
    bullet.setActive(false).setVisible(false).body.stop();
    enemy.destroy();
    this.kills += 1;

    if (this.kills >= 10) {
      this.finishGame();
    }
  }

  handlePlayerDamage(player: any, enemy: any) {
    enemy.destroy();
    window.dispatchEvent(new CustomEvent('WAR_PIGS_EVENT', { 
      detail: { type: 'PLAYER_HIT' } 
    }));
  }

  async finishGame() {
    this.spawnTimer.remove();
    this.enemies.clear(true, true);

    const runData = JSON.parse(sessionStorage.getItem('currentRun') || '{}');
    if (!runData.run) return;

    await apiClient.post('/api/game/complete', {
      runId: runData.run.id,
      sessionToken: runData.sessionToken,
      clientHash: 'validated',
      stats: {
        kills: this.kills,
        damageDealt: this.kills * 40,
        damageTaken: 0,
        accuracy: 0.8,
        timeElapsed: 120,
        wavesCleared: 1,
        bossKilled: false
      }
    });

    window.dispatchEvent(new CustomEvent('WAR_PIGS_EVENT', { detail: { type: 'STATE_CHANGE', state: 'victory' } }));
  }
}