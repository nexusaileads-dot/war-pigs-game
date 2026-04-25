import Phaser from 'phaser';
import { PigPlayer } from '../entities/PigPlayer';
import { apiClient } from '../../api/client';

type CurrentRunPayload = {
  run: {
    id: string;
    characterId: string;
    weaponId: string;
    levelId: string;
    characterUpgradeLevel?: number;
    weaponUpgradeLevel?: number;
  };
  sessionToken: string;
};

type WeaponConfig = {
  projectileKey: string;
  fireRate: number;
  bulletSpeed: number;
  bulletSize: number;
  damage: number;
  projectileLifetime: number;
  spread?: number;
  burst?: number;
  pierce?: number;
  weaponScale?: { width: number; height: number };
};

type CharacterStats = {
  speed: number;
  maxHealth: number;
  scale: number;
};

type EnemyStats = {
  hp: number;
  speed: number;
  size: number;
  contactDamage: number;
};

type BossConfig = {
  key: string;
  name: string;
  hp: number;
  speed: number;
  size: number;
  contactDamage: number;
};

const WORLD_WIDTH = 3600;
const WORLD_HEIGHT = 2100;
const KILL_TARGET = 10;

const MOVE_STICK_MARGIN = 74;
const MOVE_STICK_BASE_RADIUS = 36;
const MOVE_STICK_THUMB_RADIUS = 10;
const MOVE_STICK_MAX_DISTANCE = 22;

const FIRE_STICK_MARGIN_X = 82;
const FIRE_STICK_MARGIN_Y = 82;
const FIRE_STICK_BASE_RADIUS = 36;
const FIRE_STICK_THUMB_RADIUS = 10;
const FIRE_STICK_MAX_DISTANCE = 22;
const FIRE_DEADZONE = 0.35;

const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  oink_pistol: {
    projectileKey: 'bullet',
    fireRate: 320,
    bulletSpeed: 760,
    bulletSize: 20,
    damage: 1,
    projectileLifetime: 1200,
    weaponScale: { width: 34, height: 18 }
  },
  sow_machinegun: {
    projectileKey: 'bullet',
    fireRate: 120,
    bulletSpeed: 820,
    bulletSize: 16,
    damage: 1,
    projectileLifetime: 1000,
    spread: 0.08,
    weaponScale: { width: 42, height: 20 }
  },
  boar_rifle: {
    projectileKey: 'bullet',
    fireRate: 180,
    bulletSpeed: 900,
    bulletSize: 18,
    damage: 1,
    projectileLifetime: 1100,
    spread: 0.03,
    weaponScale: { width: 46, height: 18 }
  },
  tusk_shotgun: {
    projectileKey: 'bullet',
    fireRate: 500,
    bulletSpeed: 700,
    bulletSize: 16,
    damage: 1,
    projectileLifetime: 650,
    burst: 5,
    spread: 0.28,
    weaponScale: { width: 42, height: 20 }
  },
  sniper_swine: {
    projectileKey: 'sniper_bullet',
    fireRate: 900,
    bulletSpeed: 1200,
    bulletSize: 24,
    damage: 2,
    projectileLifetime: 1400,
    pierce: 1,
    weaponScale: { width: 56, height: 16 }
  },
  belcha_minigun: {
    projectileKey: 'bullet',
    fireRate: 90,
    bulletSpeed: 860,
    bulletSize: 14,
    damage: 1,
    projectileLifetime: 950,
    spread: 0.12,
    weaponScale: { width: 44, height: 24 }
  },
  plasma_porker: {
    projectileKey: 'plasma_globule',
    fireRate: 420,
    bulletSpeed: 640,
    bulletSize: 28,
    damage: 2,
    projectileLifetime: 1300,
    weaponScale: { width: 44, height: 22 }
  },
  bacon_blaster: {
    projectileKey: 'rocket',
    fireRate: 700,
    bulletSpeed: 620,
    bulletSize: 30,
    damage: 3,
    projectileLifetime: 1200,
    weaponScale: { width: 52, height: 24 }
  }
};

const CHARACTER_STATS: Record<string, CharacterStats> = {
  grunt_bacon: { speed: 240, maxHealth: 100, scale: 72 },
  iron_tusk: { speed: 180, maxHealth: 160, scale: 84 },
  swift_hoof: { speed: 300, maxHealth: 85, scale: 68 },
  precision_squeal: { speed: 220, maxHealth: 90, scale: 70 },
  blast_ham: { speed: 210, maxHealth: 115, scale: 74 },
  general_goldsnout: { speed: 255, maxHealth: 125, scale: 78 }
};

const ENEMY_POOL = ['wolf_grunt', 'wolf_soldier', 'wolf_heavy', 'cyber_fox'];

const BOSS_BY_LEVEL: Record<string, BossConfig> = {
  '4': {
    key: 'alpha_wolfgang',
    name: 'WOLFGANG THE RAVAGER',
    hp: 18,
    speed: 90,
    size: 132,
    contactDamage: 20
  }
};

export class GameScene extends Phaser.Scene {
  player!: PigPlayer;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  abilityKey?: Phaser.Input.Keyboard.Key;
  projectiles!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;

  lastShotTime = 0;
  kills = 0;
  health = 100;
  maxHealth = 100;
  playerSpeed = 200;
  killTarget = KILL_TARGET;
  spawnTimer?: Phaser.Time.TimerEvent;
  isFinishing = false;
  runData!: CurrentRunPayload;
  weaponConfig!: WeaponConfig;

  private hudText?: Phaser.GameObjects.Text;
  private missionText?: Phaser.GameObjects.Text;
  private debugText?: Phaser.GameObjects.Text;
  private progressBarFill?: Phaser.GameObjects.Rectangle;

  private currentCharacterId = 'grunt_bacon';
  private characterUpgradeLevel = 0;
  private weaponUpgradeLevel = 0;

  private abilityCooldownMs = 6000;
  private lastAbilityUseTime = -99999;
  private abilityLabel = 'MUD SLOW';
  private abilityActiveUntil = 0;
  private bossSpawned = false;
  private bossDefeated = false;

  private isTouchDevice = false;

  private movePointerId: number | null = null;
  private aimPointerId: number | null = null;

  private moveVector = new Phaser.Math.Vector2(0, 0);
  private fireVector = new Phaser.Math.Vector2(1, 0);

  private aimWorldPoint = new Phaser.Math.Vector2(0, 0);
  private wantsToShoot = false;

  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;

  private fireButtonBase?: Phaser.GameObjects.Arc;
  private fireButtonRing?: Phaser.GameObjects.Arc;
  private fireButtonThumb?: Phaser.GameObjects.Arc;

  private weaponObject?: Phaser.GameObjects.Image | Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a1a');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.createHud();

    const storedRun = sessionStorage.getItem('currentRun');
    if (!storedRun) {
      console.error('[GameScene] Missing currentRun in sessionStorage');
      this.showFatalMessage('RUN DATA MISSING');
      this.forceDefeat();
      return;
    }

    try {
      this.runData = JSON.parse(storedRun) as CurrentRunPayload;
    } catch (error) {
      console.error('[GameScene] Failed to parse currentRun:', error);
      this.showFatalMessage('RUN DATA INVALID');
      this.forceDefeat();
      return;
    }

    if (!this.runData?.run?.id || !this.runData?.sessionToken) {
      console.error('[GameScene] Incomplete runData:', this.runData);
      this.showFatalMessage('RUN SESSION INVALID');
      this.forceDefeat();
      return;
    }

    this.currentCharacterId = this.runData.run.characterId;
    this.characterUpgradeLevel = Math.max(0, Number(this.runData.run.characterUpgradeLevel ?? 0));
    this.weaponUpgradeLevel = Math.max(0, Number(this.runData.run.weaponUpgradeLevel ?? 0));

    this.configureCharacterAbility();

    const baseCharacterStats =
      CHARACTER_STATS[this.runData.run.characterId] ?? CHARACTER_STATS.grunt_bacon;

    const upgradedCharacterStats = this.applyCharacterUpgrades(baseCharacterStats);

    this.maxHealth = upgradedCharacterStats.maxHealth;
    this.health = upgradedCharacterStats.maxHealth;
    this.playerSpeed = upgradedCharacterStats.speed;

    const baseWeaponConfig = WEAPON_CONFIGS[this.runData.run.weaponId] ?? WEAPON_CONFIGS.oink_pistol;
    this.weaponConfig = this.applyWeaponUpgrades(baseWeaponConfig);

    this.createBackground();

    if (!this.createPlayer(upgradedCharacterStats.scale)) return;
    if (!this.createInput()) return;
    if (!this.createGroups()) return;

    this.createWeaponSprite();
    this.registerCollisions();
    this.setupPointerControls();
    this.createTouchControls();
    this.handleResize(this.scale.gameSize);

    this.spawnTimer = this.time.addEvent({
      delay: 1400,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.aimWorldPoint.set(this.player.x + 200, this.player.y);
    this.updateHud();
    this.emitKillsUpdate();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update() {
    if (!this.player || !this.player.active || this.isFinishing) return;

    if (this.abilityKey && Phaser.Input.Keyboard.JustDown(this.abilityKey)) {
      this.useCharacterAbility();
    }

    this.updateAbilityState();

    if (this.isTouchDevice) {
      this.updateTouchMovement();
      this.updateTouchAim();

      if (this.wantsToShoot) {
        void this.shoot();
      }
    } else {
      this.player.updateMovement(this.cursors, this.wasd, this.playerSpeed);
      this.aimWorldPoint.set(this.input.activePointer.worldX, this.input.activePointer.worldY);
    }

    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      this.aimWorldPoint.x,
      this.aimWorldPoint.y
    );

    this.player.setData('aimAngle', angle);
    this.player.setFlipX(this.aimWorldPoint.x < this.player.x);

    this.updateWeaponSprite(angle);
    this.applyMovementLean();

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const speed = enemy.getData('moveSpeed') ?? 100;
      this.physics.moveToObject(enemy, this.player, speed);

      const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
      if (body) {
        enemy.setFlipX(body.velocity.x < 0);
      }
    });

    if (this.debugText) {
      const remainingCd = Math.max(
        0,
        Math.ceil((this.abilityCooldownMs - (this.time.now - this.lastAbilityUseTime)) / 1000)
      );
      this.debugText.setText(`CD ${remainingCd}s`);
    }

    this.updateHud();
  }

  async shoot() {
    if (this.isFinishing || !this.player?.active) return;

    const effectiveFireRate = this.getEffectiveFireRate();
    const now = this.time.now;
    if (now - this.lastShotTime < effectiveFireRate) return;
    this.lastShotTime = now;

    const burst = this.weaponConfig.burst ?? 1;
    const spread = this.getEffectiveSpread();
    const damageBoost = this.getDamageBonus();
    const speedBoost = this.getProjectileSpeedBonus();
    const extraPierce = this.getExtraPierce();

    const baseAngle = this.player.getData('aimAngle') || 0;
    const muzzle = this.getMuzzlePosition(baseAngle);

    for (let i = 0; i < burst; i += 1) {
      const projectileKey = this.textures.exists(this.weaponConfig.projectileKey)
        ? this.weaponConfig.projectileKey
        : 'bullet';

      const bullet = this.projectiles.get(
        muzzle.x,
        muzzle.y,
        projectileKey
      ) as Phaser.Physics.Arcade.Image | Phaser.Physics.Arcade.Sprite | null;

      if (!bullet) continue;

      bullet.setTexture(projectileKey);
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setAlpha(1);
      bullet.setPosition(muzzle.x, muzzle.y);
      bullet.setDepth(50);
      bullet.clearTint();
      bullet.setDisplaySize(
        this.weaponConfig.bulletSize,
        projectileKey === 'rocket'
          ? Math.max(14, this.weaponConfig.bulletSize * 0.6)
          : this.weaponConfig.bulletSize
      );

      const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) continue;

      body.enable = true;
      body.reset(muzzle.x, muzzle.y);
      body.setAllowGravity(false);

      const randomSpread = spread > 0 ? Phaser.Math.FloatBetween(-spread, spread) : 0;
      const shotAngle =
        burst > 1
          ? baseAngle + randomSpread + (i - (burst - 1) / 2) * 0.04
          : baseAngle + randomSpread;

      this.physics.velocityFromRotation(
        shotAngle,
        this.weaponConfig.bulletSpeed + speedBoost,
        body.velocity
      );

      bullet.setRotation(shotAngle);
      bullet.setData('damage', this.weaponConfig.damage + damageBoost);
      bullet.setData('projectileKey', projectileKey);
      bullet.setData('pierceLeft', (this.weaponConfig.pierce ?? 0) + extraPierce);

      if (projectileKey === 'plasma_globule') {
        bullet.setTint(0x66e0ff);
      } else if (projectileKey === 'rocket') {
        bullet.setTint(0xffaa33);
      } else if (projectileKey === 'sniper_bullet') {
        bullet.setTint(0xffffff);
      } else {
        bullet.setTint(0xffe066);
      }

      this.time.delayedCall(this.weaponConfig.projectileLifetime, () => {
        if (!bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        body.stop();
      });
    }
  }

  spawnEnemy() {
    if (this.isFinishing || !this.player?.active) return;

    const shouldSpawnBoss =
      !this.bossSpawned &&
      !this.bossDefeated &&
      Boolean(BOSS_BY_LEVEL[this.runData.run.levelId]) &&
      this.kills >= Math.max(4, this.killTarget - 4);

    if (shouldSpawnBoss) {
      this.spawnBoss();
      return;
    }

    const enemyKey = this.pickEnemyKey();
    if (!enemyKey || !this.textures.exists(enemyKey)) {
      console.error('[GameScene] Missing enemy texture:', enemyKey);
      this.showFatalMessage('ENEMY ASSET MISSING');
      this.forceDefeat();
      return;
    }

    const edges = [
      { x: Phaser.Math.Between(0, WORLD_WIDTH), y: -40 },
      { x: Phaser.Math.Between(0, WORLD_WIDTH), y: WORLD_HEIGHT + 40 },
      { x: -40, y: Phaser.Math.Between(0, WORLD_HEIGHT) },
      { x: WORLD_WIDTH + 40, y: Phaser.Math.Between(0, WORLD_HEIGHT) }
    ];

    const spawn = Phaser.Utils.Array.GetRandom(edges);
    const enemy = this.enemies.create(spawn.x, spawn.y, enemyKey) as Phaser.Physics.Arcade.Sprite;

    if (!enemy) return;

    const stats = this.getEnemyStats(enemyKey);

    enemy.setDisplaySize(stats.size, stats.size);
    enemy.setDepth(5);
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setCollideWorldBounds(false);
    enemy.setData('hp', stats.hp);
    enemy.setData('moveSpeed', stats.speed);
    enemy.setData('baseMoveSpeed', stats.speed);
    enemy.setData('contactDamage', stats.contactDamage);
    enemy.setData('enemyKey', enemyKey);
    enemy.setData('isBoss', false);
    enemy.setData('rewardKills', 1);

    const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setAllowGravity(false);
      body.setImmovable(false);
    }
  }

  private spawnBoss() {
    const boss = BOSS_BY_LEVEL[this.runData.run.levelId];
    if (!boss) return;

    if (!this.textures.exists(boss.key)) {
      console.error('[GameScene] Missing boss texture:', boss.key);
      this.showFatalMessage('BOSS ASSET MISSING');
      this.forceDefeat();
      return;
    }

    this.bossSpawned = true;

    const spawn = { x: WORLD_WIDTH / 2, y: -120 };
    const enemy = this.enemies.create(spawn.x, spawn.y, boss.key) as Phaser.Physics.Arcade.Sprite;

    if (!enemy) return;

    enemy.setDisplaySize(boss.size, boss.size);
    enemy.setDepth(7);
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setTint(0xffe0a3);
    enemy.setData('hp', boss.hp);
    enemy.setData('moveSpeed', boss.speed);
    enemy.setData('baseMoveSpeed', boss.speed);
    enemy.setData('contactDamage', boss.contactDamage);
    enemy.setData('enemyKey', boss.key);
    enemy.setData('isBoss', true);
    enemy.setData('rewardKills', 4);
    enemy.setData('bossName', boss.name);

    const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setAllowGravity(false);
    }

    if (this.missionText) {
      this.missionText.setText(boss.name);
      this.missionText.setVisible(true);
      this.time.delayedCall(1800, () => {
        if (!this.isFinishing && this.missionText) {
          this.missionText.setVisible(false);
        }
      });
    }
  }

  handleHit(
    bulletObject: Phaser.GameObjects.GameObject,
    enemyObject: Phaser.GameObjects.GameObject
  ) {
    const bullet = bulletObject as Phaser.Physics.Arcade.Image | Phaser.Physics.Arcade.Sprite;
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;

    if (!bullet.active || !enemy.active || this.isFinishing) return;

    const hitX = enemy.x;
    const hitY = enemy.y;
    const projectileKey = bullet.getData('projectileKey') ?? 'bullet';

    const damage = bullet.getData('damage') ?? 1;
    const currentHp = enemy.getData('hp') ?? 1;
    const nextHp = currentHp - damage;

    const pierceLeft = bullet.getData('pierceLeft') ?? 0;
    if (pierceLeft > 0 && projectileKey !== 'rocket') {
      bullet.setData('pierceLeft', pierceLeft - 1);
    } else {
      bullet.setActive(false);
      bullet.setVisible(false);
      const bulletBody = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      bulletBody?.stop();
    }

    this.createHitEffect(hitX, hitY, projectileKey);

    if (projectileKey === 'rocket') {
      this.applySplashDamage(hitX, hitY, 85 + this.weaponUpgradeLevel * 8, damage);
    }

    if (!enemy.active) return;

    if (nextHp > 0) {
      enemy.setData('hp', nextHp);
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(70, () => {
        if (enemy.active) enemy.clearTint();
      });
      this.showFloatingText(hitX, hitY - 20, `-${damage}`, '#ff8a65');
      return;
    }

    const rewardKills = enemy.getData('rewardKills') ?? 1;
    const isBoss = enemy.getData('isBoss') === true;

    enemy.destroy();

    this.kills += rewardKills;
    if (isBoss) this.bossDefeated = true;

    this.updateHud();
    this.emitKillsUpdate();
    this.showFloatingText(
      hitX,
      hitY - 20,
      isBoss ? '+BOSS' : `+${rewardKills}`,
      isBoss ? '#ffe082' : '#ffd166'
    );

    if (this.kills >= this.killTarget) {
      void this.finishGame();
    }
  }

  handlePlayerDamage(
    _playerObject: Phaser.GameObjects.GameObject,
    enemyObject: Phaser.GameObjects.GameObject
  ) {
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active || this.isFinishing) return;

    const damage = enemy.getData('contactDamage') ?? 10;
    enemy.destroy();

    this.health = Math.max(0, this.health - damage);
    this.updateHud();
    this.cameras.main.shake(120, 0.01);

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'PLAYER_HIT',
          damage
        }
      })
    );

    if (this.health <= 0) {
      this.failMission();
    }
  }

  async finishGame() {
    if (this.isFinishing) return;
    this.isFinishing = true;

    this.spawnTimer?.remove(false);
    this.enemies.clear(true, true);

    if (this.missionText) {
      this.missionText.setText('MISSION COMPLETE');
      this.missionText.setVisible(true);
    }

    try {
      await apiClient.post('/api/game/complete', {
        runId: this.runData.run.id,
        sessionToken: this.runData.sessionToken,
        clientHash: 'validated',
        stats: {
          kills: this.kills,
          damageDealt: this.kills * 40,
          damageTaken: this.maxHealth - this.health,
          accuracy: 0.8,
          timeElapsed: 120,
          wavesCleared: 1,
          bossKilled: this.bossDefeated
        }
      });

      window.dispatchEvent(
        new CustomEvent('WAR_PIGS_EVENT', {
          detail: {
            type: 'STATE_CHANGE',
            state: 'victory'
          }
        })
      );
    } catch (error) {
      console.error('[GameScene] Failed to complete run:', error);
      this.forceDefeat();
    }
  }

  failMission() {
    if (this.isFinishing) return;

    this.isFinishing = true;
    this.spawnTimer?.remove(false);
    this.enemies?.clear(true, true);

    if (this.missionText) {
      this.missionText.setText('MISSION FAILED');
      this.missionText.setVisible(true);
    }

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'STATE_CHANGE',
          state: 'defeat'
        }
      })
    );
  }

  private forceDefeat() {
    this.spawnTimer?.remove(false);
    this.enemies?.clear(true, true);

    if (this.missionText) {
      this.missionText.setText('MISSION FAILED');
      this.missionText.setVisible(true);
    }

    this.isFinishing = true;

    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'STATE_CHANGE',
          state: 'defeat'
        }
      })
    );
  }

  private createBackground() {
    if (this.textures.exists('background')) {
      const background = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'background');
      background.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
      background.setScrollFactor(1);
      background.setDepth(0);
      return;
    }

    console.error('[GameScene] Missing background texture');
    this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x1a1a1a)
      .setOrigin(0.5)
      .setDepth(0);
  }

  private createPlayer(scale: number): boolean {
    const characterKey = this.textures.exists(this.runData.run.characterId)
      ? this.runData.run.characterId
      : this.textures.exists('player')
        ? 'player'
        : null;

    if (!characterKey) {
      console.error('[GameScene] Missing player texture');
      this.showFatalMessage('PLAYER ASSET MISSING');
      this.forceDefeat();
      return false;
    }

    this.player = new PigPlayer(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, characterKey);
    this.player.setDisplaySize(scale, scale);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.setMoveSpeed(this.playerSpeed);

    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setRoundPixels(false);
    this.updateCameraZoom();

    return true;
  }

  private createInput(): boolean {
    if (!this.input.keyboard) {
      console.error('[GameScene] Keyboard input unavailable');
      this.showFatalMessage('KEYBOARD INPUT UNAVAILABLE');
      this.forceDefeat();
      return false;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as typeof this.wasd;

    this.abilityKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    return true;
  }

  private createGroups(): boolean {
    const projectileKey = this.textures.exists(this.weaponConfig.projectileKey)
      ? this.weaponConfig.projectileKey
      : this.textures.exists('bullet')
        ? 'bullet'
        : '__DEFAULT';

    if (projectileKey === '__DEFAULT') {
      console.error('[GameScene] Missing bullet texture');
      this.showFatalMessage('BULLET ASSET MISSING');
      this.forceDefeat();
      return false;
    }

    this.projectiles = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: projectileKey,
      maxSize: 120,
      runChildUpdate: false
    });

    this.enemies = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 60
    });

    return true;
  }

  private createWeaponSprite() {
    const weaponKey = this.textures.exists(this.runData.run.weaponId) ? this.runData.run.weaponId : null;
    const size = this.weaponConfig.weaponScale ?? { width: 40, height: 18 };

    if (weaponKey) {
      const image = this.add.image(this.player.x, this.player.y, weaponKey);
      image.setDepth(12);
      image.setOrigin(0.25, 0.5);
      image.setDisplaySize(size.width, size.height);
      this.weaponObject = image;
      return;
    }

    const barrel = this.add.rectangle(size.width * 0.35, 0, size.width, size.height, 0x3a3a3a, 1);
    barrel.setStrokeStyle(2, 0x111111, 1);

    const muzzle = this.add.rectangle(size.width * 0.92, 0, 10, size.height * 0.55, 0x171717, 1);
    const grip = this.add.rectangle(-4, 8, 8, 16, 0x6b3a1e, 1);
    grip.setRotation(0.45);

    const highlight = this.add.rectangle(size.width * 0.36, -4, size.width * 0.72, 3, 0x8a8a8a, 0.85);

    const container = this.add.container(this.player.x, this.player.y, [
      grip,
      barrel,
      muzzle,
      highlight
    ]);
    container.setDepth(12);
    this.weaponObject = container;
  }

  private updateWeaponSprite(angle: number) {
    if (!this.weaponObject || !this.player?.active) return;

    const handDistance = 14;
    const x = this.player.x + Math.cos(angle) * handDistance;
    const y = this.player.y + Math.sin(angle) * handDistance;

    this.weaponObject.setPosition(x, y);
    this.weaponObject.setRotation(angle);

    const facingLeft = Math.cos(angle) < 0;
    this.weaponObject.setDepth(facingLeft ? 9 : 12);

    if (this.weaponObject instanceof Phaser.GameObjects.Image) {
      this.weaponObject.setFlipY(facingLeft);
    } else {
      this.weaponObject.setScale(1, facingLeft ? -1 : 1);
    }
  }

  private applyMovementLean() {
    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed < 8) {
      this.player.setRotation(0);
      this.player.setScale(1);
      return;
    }

    const lean = Phaser.Math.Clamp(vx / this.playerSpeed, -1, 1) * 0.08;
    const pulse = 1 + Math.sin(this.time.now * 0.018) * 0.025;

    this.player.setRotation(lean);
    this.player.setScale(pulse, 1 / pulse);
  }

  private registerCollisions() {
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerDamage as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  private setupPointerControls() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isTouchDevice =
        this.input.pointer1.isDown || this.input.pointer2.isDown || pointer.wasTouch;

      const moveZone = pointer.x < this.scale.width * 0.45;
      const fireZone = pointer.x > this.scale.width * 0.55;

      if (pointer.wasTouch && moveZone && this.movePointerId === null) {
        this.movePointerId = pointer.id;
        this.updateMoveVectorFromPointer(pointer);
        this.updateJoystickVisual(pointer.x, pointer.y);
      }

      if (pointer.wasTouch && fireZone && this.aimPointerId === null) {
        this.aimPointerId = pointer.id;
        this.updateFireVectorFromPointer(pointer);
        this.updateFireJoystickVisual(pointer.x, pointer.y);
      }

      if (!pointer.wasTouch) {
        void this.shoot();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.movePointerId === pointer.id) {
        this.updateMoveVectorFromPointer(pointer);
        this.updateJoystickVisual(pointer.x, pointer.y);
      }

      if (this.aimPointerId === pointer.id) {
        this.updateFireVectorFromPointer(pointer);
        this.updateFireJoystickVisual(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.movePointerId === pointer.id) {
        this.movePointerId = null;
        this.moveVector.set(0, 0);
        this.player.setVelocity(0, 0);
        this.resetJoystickVisual();
      }

      if (this.aimPointerId === pointer.id) {
        this.aimPointerId = null;
        this.fireVector.set(0, 0);
        this.wantsToShoot = false;
        this.resetFireJoystickVisual();
      }
    });
  }

  private createTouchControls() {
    const joyX = MOVE_STICK_MARGIN;
    const joyY = this.scale.height - MOVE_STICK_MARGIN;
    const fireX = this.scale.width - FIRE_STICK_MARGIN_X;
    const fireY = this.scale.height - FIRE_STICK_MARGIN_Y;

    this.joystickBase = this.add
      .circle(joyX, joyY, MOVE_STICK_BASE_RADIUS, 0x000000, 0.34)
      .setStrokeStyle(2, 0xffffff, 0.28)
      .setScrollFactor(0)
      .setDepth(1200)
      .setVisible(true);

    this.joystickThumb = this.add
      .circle(joyX, joyY, MOVE_STICK_THUMB_RADIUS, 0xffffff, 0.58)
      .setScrollFactor(0)
      .setDepth(1201)
      .setVisible(true);

    this.fireButtonBase = this.add
      .circle(fireX, fireY, FIRE_STICK_BASE_RADIUS, 0x4a0000, 0.78)
      .setStrokeStyle(3, 0xffb347, 0.95)
      .setScrollFactor(0)
      .setDepth(1200)
      .setVisible(true);

    this.fireButtonRing = this.add
      .circle(fireX, fireY, FIRE_STICK_BASE_RADIUS - 8, 0x000000, 0)
      .setStrokeStyle(2, 0xff6b35, 0.9)
      .setScrollFactor(0)
      .setDepth(1201)
      .setVisible(true);

    this.fireButtonThumb = this.add
      .circle(fireX, fireY, FIRE_STICK_THUMB_RADIUS, 0xff6b35, 1)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setScrollFactor(0)
      .setDepth(1202)
      .setVisible(true);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    if (this.missionText) {
      this.missionText.setPosition(width / 2, 54);
    }

    if (this.joystickBase) {
      this.joystickBase.setPosition(MOVE_STICK_MARGIN, height - MOVE_STICK_MARGIN);
    }

    if (this.joystickThumb) {
      this.joystickThumb.setPosition(MOVE_STICK_MARGIN, height - MOVE_STICK_MARGIN);
    }

    const fireX = width - FIRE_STICK_MARGIN_X;
    const fireY = height - FIRE_STICK_MARGIN_Y;

    if (this.fireButtonBase) {
      this.fireButtonBase.setPosition(fireX, fireY);
    }

    if (this.fireButtonRing) {
      this.fireButtonRing.setPosition(fireX, fireY);
    }

    if (this.fireButtonThumb) {
      this.fireButtonThumb.setPosition(fireX, fireY);
    }

    this.updateCameraZoom();
  }

  private updateCameraZoom() {
    const width = this.scale.width || 1600;
    const height = this.scale.height || 900;
    const isSmallScreen = width < 900 || height < 600;
    this.cameras.main.setZoom(isSmallScreen ? 0.86 : 0.92);
  }

  private updateTouchMovement() {
    let vx = this.moveVector.x * this.playerSpeed;
    let vy = this.moveVector.y * this.playerSpeed;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.player.setVelocity(vx, vy);
  }

  private updateTouchAim() {
    const magnitude = this.fireVector.length();

    if (magnitude < FIRE_DEADZONE) {
      this.wantsToShoot = false;
      return;
    }

    this.wantsToShoot = true;

    const normalized = this.fireVector.clone().normalize();
    this.aimWorldPoint.set(this.player.x + normalized.x * 300, this.player.y + normalized.y * 300);
  }

  private updateMoveVectorFromPointer(pointer: Phaser.Input.Pointer) {
    const baseX = MOVE_STICK_MARGIN;
    const baseY = this.scale.height - MOVE_STICK_MARGIN;
    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 0.0001) {
      this.moveVector.set(0, 0);
      this.player.setVelocity(0, 0);
      return;
    }

    const clampedDistance = Math.min(distance, MOVE_STICK_MAX_DISTANCE);
    this.moveVector.set(
      (dx / distance) * (clampedDistance / MOVE_STICK_MAX_DISTANCE),
      (dy / distance) * (clampedDistance / MOVE_STICK_MAX_DISTANCE)
    );
  }

  private updateFireVectorFromPointer(pointer: Phaser.Input.Pointer) {
    const baseX = this.scale.width - FIRE_STICK_MARGIN_X;
    const baseY = this.scale.height - FIRE_STICK_MARGIN_Y;
    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 0.0001) {
      this.fireVector.set(0, 0);
      this.wantsToShoot = false;
      return;
    }

    const clampedDistance = Math.min(distance, FIRE_STICK_MAX_DISTANCE);
    this.fireVector.set(
      (dx / distance) * (clampedDistance / FIRE_STICK_MAX_DISTANCE),
      (dy / distance) * (clampedDistance / FIRE_STICK_MAX_DISTANCE)
    );
  }

  private updateJoystickVisual(pointerX: number, pointerY: number) {
    if (!this.joystickThumb) return;

    const baseX = MOVE_STICK_MARGIN;
    const baseY = this.scale.height - MOVE_STICK_MARGIN;
    const dx = pointerX - baseX;
    const dy = pointerY - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let thumbX = baseX;
    let thumbY = baseY;

    if (distance > 0) {
      const clamped = Math.min(distance, MOVE_STICK_MAX_DISTANCE);
      thumbX = baseX + (dx / distance) * clamped;
      thumbY = baseY + (dy / distance) * clamped;
    }

    this.joystickThumb.setPosition(thumbX, thumbY);
  }

  private updateFireJoystickVisual(pointerX: number, pointerY: number) {
    if (!this.fireButtonThumb) return;

    const baseX = this.scale.width - FIRE_STICK_MARGIN_X;
    const baseY = this.scale.height - FIRE_STICK_MARGIN_Y;
    const dx = pointerX - baseX;
    const dy = pointerY - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let thumbX = baseX;
    let thumbY = baseY;

    if (distance > 0) {
      const clamped = Math.min(distance, FIRE_STICK_MAX_DISTANCE);
      thumbX = baseX + (dx / distance) * clamped;
      thumbY = baseY + (dy / distance) * clamped;
    }

    this.fireButtonThumb.setPosition(thumbX, thumbY);
  }

  private resetJoystickVisual() {
    if (!this.joystickThumb) return;
    this.joystickThumb.setPosition(MOVE_STICK_MARGIN, this.scale.height - MOVE_STICK_MARGIN);
  }

  private resetFireJoystickVisual() {
    if (!this.fireButtonThumb) return;
    this.fireButtonThumb.setPosition(
      this.scale.width - FIRE_STICK_MARGIN_X,
      this.scale.height - FIRE_STICK_MARGIN_Y
    );
  }

  private getMuzzlePosition(angle: number) {
    const muzzleDistance = 40;

    return {
      x: this.player.x + Math.cos(angle) * muzzleDistance,
      y: this.player.y + Math.sin(angle) * muzzleDistance
    };
  }

  private pickEnemyKey(): string {
    const available = ENEMY_POOL.filter((key) => this.textures.exists(key));
    if (available.length === 0) return 'enemy';

    if (this.kills >= 8 && available.includes('wolf_heavy')) return 'wolf_heavy';
    if (this.kills >= 5 && available.includes('cyber_fox') && Math.random() < 0.35) {
      return 'cyber_fox';
    }
    if (this.kills >= 3 && available.includes('wolf_soldier') && Math.random() < 0.5) {
      return 'wolf_soldier';
    }

    return available.includes('wolf_grunt') ? 'wolf_grunt' : available[0];
  }

  private getEnemyStats(enemyKey: string): EnemyStats {
    switch (enemyKey) {
      case 'wolf_heavy':
        return { hp: 3, speed: 70, size: 78, contactDamage: 15 };
      case 'cyber_fox':
        return { hp: 1, speed: 150, size: 58, contactDamage: 12 };
      case 'wolf_soldier':
        return { hp: 2, speed: 95, size: 66, contactDamage: 10 };
      default:
        return { hp: 1, speed: 100, size: 64, contactDamage: 10 };
    }
  }

  private createHud() {
    this.hudText = this.add
      .text(16, 16, '', {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { left: 6, right: 6, top: 4, bottom: 4 }
      })
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.72);

    this.missionText = this.add
      .text(this.scale.width / 2, 54, '', {
        fontSize: '20px',
        color: '#ffdd57',
        fontStyle: 'bold',
        backgroundColor: '#000000aa',
        padding: { left: 10, right: 10, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    this.debugText = this.add
      .text(16, 40, '', {
        fontSize: '10px',
        color: '#bbbbbb',
        backgroundColor: '#00000066',
        padding: { left: 4, right: 4, top: 2, bottom: 2 }
      })
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.55);

    this.add
      .rectangle(16, 62, 120, 8, 0x222222)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.75);

    this.progressBarFill = this.add
      .rectangle(16, 62, 0, 8, 0xff6b35)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1001);
  }

  private updateHud() {
    if (!this.hudText) return;

    const cooldownLeft = Math.max(
      0,
      Math.ceil((this.abilityCooldownMs - (this.time.now - this.lastAbilityUseTime)) / 1000)
    );
    const abilityReady = this.time.now - this.lastAbilityUseTime >= this.abilityCooldownMs;
    const abilityStatus = abilityReady ? 'READY' : `${cooldownLeft}s`;

    this.hudText.setText([
      `WPN +${this.weaponUpgradeLevel}`,
      `UNIT +${this.characterUpgradeLevel}`,
      `ABL ${abilityStatus}`
    ]);

    if (this.progressBarFill) {
      const progress = Phaser.Math.Clamp(this.kills / this.killTarget, 0, 1);
      this.progressBarFill.width = 120 * progress;
    }
  }

  private emitKillsUpdate() {
    window.dispatchEvent(
      new CustomEvent('WAR_PIGS_EVENT', {
        detail: {
          type: 'KILLS_UPDATE',
          kills: this.kills
        }
      })
    );
  }

  private showFatalMessage(message: string) {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, message, {
        fontSize: '28px',
        color: '#ff4d4f',
        backgroundColor: '#000000cc',
        padding: { left: 14, right: 14, top: 10, bottom: 10 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
  }

  private showFloatingText(x: number, y: number, value: string, color = '#ffd166') {
    const text = this.add
      .text(x, y, value, {
        fontSize: '18px',
        color,
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(900);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 500,
      onComplete: () => text.destroy()
    });
  }

  private createHitEffect(x: number, y: number, projectileKey: string) {
    const color =
      projectileKey === 'plasma_globule'
        ? 0x66e0ff
        : projectileKey === 'rocket'
          ? 0xff8844
          : projectileKey === 'sniper_bullet'
            ? 0xffffff
            : 0xffc857;

    const circle = this.add.circle(x, y, 12, color, 0.95).setDepth(800);

    this.tweens.add({
      targets: circle,
      radius: projectileKey === 'rocket' ? 36 : 22,
      alpha: 0,
      duration: projectileKey === 'rocket' ? 220 : 120,
      onComplete: () => circle.destroy()
    });

    if (projectileKey === 'rocket' && this.textures.exists('explosion')) {
      const explosion = this.add.image(x, y, 'explosion').setDepth(801);
      explosion.setDisplaySize(44, 44);
      this.tweens.add({
        targets: explosion,
        scaleX: 2.4,
        scaleY: 2.4,
        alpha: 0,
        duration: 240,
        onComplete: () => explosion.destroy()
      });
    }
  }

  private applyCharacterUpgrades(stats: CharacterStats): CharacterStats {
    return {
      ...stats,
      speed: stats.speed + this.characterUpgradeLevel * 6,
      maxHealth: stats.maxHealth + this.characterUpgradeLevel * 10
    };
  }

  private applyWeaponUpgrades(config: WeaponConfig): WeaponConfig {
    const fireRateReduction = Math.min(0.22, this.weaponUpgradeLevel * 0.04);

    return {
      ...config,
      damage: config.damage + this.weaponUpgradeLevel,
      fireRate: Math.max(60, Math.floor(config.fireRate * (1 - fireRateReduction))),
      bulletSpeed: config.bulletSpeed + this.weaponUpgradeLevel * 35,
      projectileLifetime: config.projectileLifetime + this.weaponUpgradeLevel * 70,
      pierce: (config.pierce ?? 0) + (this.weaponUpgradeLevel >= 4 ? 1 : 0)
    };
  }

  private configureCharacterAbility() {
    switch (this.currentCharacterId) {
      case 'iron_tusk':
        this.abilityLabel = 'IRON SLAM';
        this.abilityCooldownMs = 7000;
        break;
      case 'swift_hoof':
        this.abilityLabel = 'SCOUT DASH';
        this.abilityCooldownMs = 4500;
        break;
      case 'precision_squeal':
        this.abilityLabel = 'FOCUS MODE';
        this.abilityCooldownMs = 7000;
        break;
      case 'blast_ham':
        this.abilityLabel = 'DEMOLITION BURST';
        this.abilityCooldownMs = 6500;
        break;
      case 'general_goldsnout':
        this.abilityLabel = 'RALLY ORDER';
        this.abilityCooldownMs = 8000;
        break;
      default:
        this.abilityLabel = 'MUD SLOW';
        this.abilityCooldownMs = 6000;
        break;
    }

    this.abilityCooldownMs = Math.max(2200, this.abilityCooldownMs - this.characterUpgradeLevel * 350);
  }

  private useCharacterAbility() {
    if (this.time.now - this.lastAbilityUseTime < this.abilityCooldownMs) return;
    if (!this.player?.active) return;

    this.lastAbilityUseTime = this.time.now;

    switch (this.currentCharacterId) {
      case 'iron_tusk':
        this.useIronSlam();
        break;
      case 'swift_hoof':
        this.useScoutDash();
        break;
      case 'precision_squeal':
        this.useFocusMode();
        break;
      case 'blast_ham':
        this.useDemolitionBurst();
        break;
      case 'general_goldsnout':
        this.useRallyOrder();
        break;
      default:
        this.useMudSlow();
        break;
    }

    this.updateHud();
  }

  private useMudSlow() {
    const radius = 150 + this.characterUpgradeLevel * 22;
    const duration = 1600 + this.characterUpgradeLevel * 250;
    const slowFactor = Math.max(0.25, 0.55 - this.characterUpgradeLevel * 0.04);

    this.createAreaPulse(this.player.x, this.player.y, radius, 0x7b5e2f);
    this.showFloatingText(this.player.x, this.player.y - 50, 'MUD SLOW', '#d7b46a');

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance > radius) return;

      const baseSpeed = enemy.getData('baseMoveSpeed') ?? enemy.getData('moveSpeed') ?? 100;
      enemy.setData('moveSpeed', baseSpeed * slowFactor);
      enemy.setTint(0x8d6e63);

      this.time.delayedCall(duration, () => {
        if (!enemy.active) return;
        enemy.setData('moveSpeed', baseSpeed);
        enemy.clearTint();
      });
    });
  }

  private useIronSlam() {
    const radius = 150 + this.characterUpgradeLevel * 18;
    const slamDamage = 2 + Math.floor(this.characterUpgradeLevel / 2);

    this.cameras.main.shake(140, 0.012);
    this.createAreaPulse(this.player.x, this.player.y, radius, 0xb0bec5);

    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);

      if (distance <= radius) {
        const body = enemy.body as Phaser.Physics.Arcade.Body | undefined;
        if (body) {
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
          this.physics.velocityFromRotation(angle, 420 + this.characterUpgradeLevel * 30, body.velocity);
        }

        const nextHp = (enemy.getData('hp') ?? 1) - slamDamage;
        if (nextHp <= 0) {
          enemy.destroy();
          this.kills += enemy.getData('rewardKills') ?? 1;
          this.emitKillsUpdate();
        } else {
          enemy.setData('hp', nextHp);
        }
      }
    });

    this.showFloatingText(this.player.x, this.player.y - 60, 'IRON SLAM', '#cfd8dc');
  }

  private useScoutDash() {
    const aimAngle = this.player.getData('aimAngle') || 0;
    const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    this.physics.velocityFromRotation(aimAngle, 640 + this.characterUpgradeLevel * 45, body.velocity);
    this.createAreaPulse(this.player.x, this.player.y, 60 + this.characterUpgradeLevel * 8, 0x81c784);
    this.showFloatingText(this.player.x, this.player.y - 50, 'DASH', '#81c784');
  }

  private useFocusMode() {
    this.abilityActiveUntil = this.time.now + 3500 + this.characterUpgradeLevel * 300;
    this.player.setTint(0xd1c4e9);
    this.showFloatingText(this.player.x, this.player.y - 50, 'FOCUS', '#d1c4e9');
  }

  private useDemolitionBurst() {
    this.createAreaPulse(this.player.x, this.player.y, 85 + this.characterUpgradeLevel * 12, 0xffb74d);

    const shotCount = 5 + Math.min(3, this.characterUpgradeLevel);
    const center = (shotCount - 1) / 2;

    for (let i = 0; i < shotCount; i += 1) {
      const offset = (i - center) * 0.22;
      const baseAngle = this.player.getData('aimAngle') || 0;
      const shotAngle = baseAngle + offset;
      const muzzle = this.getMuzzlePosition(shotAngle);

      const bullet = this.projectiles.get(muzzle.x, muzzle.y, 'rocket') as
        | Phaser.Physics.Arcade.Image
        | Phaser.Physics.Arcade.Sprite
        | null;

      if (!bullet) continue;

      bullet.setTexture(this.textures.exists('rocket') ? 'rocket' : 'bullet');
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setAlpha(1);
      bullet.setPosition(muzzle.x, muzzle.y);
      bullet.setDepth(50);
      bullet.setDisplaySize(24, 14);
      bullet.setTint(0xffaa33);
      bullet.setData('damage', 2 + Math.floor(this.characterUpgradeLevel / 2));
      bullet.setData('projectileKey', 'rocket');
      bullet.setData('pierceLeft', 0);

      const body = bullet.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) continue;

      body.enable = true;
      body.reset(muzzle.x, muzzle.y);
      body.setAllowGravity(false);

      this.physics.velocityFromRotation(shotAngle, 520 + this.characterUpgradeLevel * 25, body.velocity);
      bullet.setRotation(shotAngle);

      this.time.delayedCall(700, () => {
        if (!bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        body.stop();
      });
    }

    this.showFloatingText(this.player.x, this.player.y - 50, 'DEMOLITION', '#ffb74d');
  }

  private useRallyOrder() {
    this.abilityActiveUntil = this.time.now + 4500 + this.characterUpgradeLevel * 300;
    this.player.setTint(0xffd54f);
    this.showFloatingText(this.player.x, this.player.y - 50, 'RALLY', '#ffeb3b');
  }

  private updateAbilityState() {
    if (this.abilityActiveUntil > 0 && this.time.now > this.abilityActiveUntil) {
      this.abilityActiveUntil = 0;
      this.player.clearTint();
    }
  }

  private getEffectiveFireRate() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return Math.max(50, Math.floor(this.weaponConfig.fireRate * 0.55));
    }

    if (this.currentCharacterId === 'general_goldsnout' && this.abilityActiveUntil > this.time.now) {
      return Math.max(50, Math.floor(this.weaponConfig.fireRate * 0.7));
    }

    return this.weaponConfig.fireRate;
  }

  private getEffectiveSpread() {
    let spread = this.weaponConfig.spread ?? 0;

    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      spread *= 0.2;
    }

    return spread;
  }

  private getDamageBonus() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return 1 + Math.floor(this.characterUpgradeLevel / 2);
    }

    if (this.currentCharacterId === 'general_goldsnout' && this.abilityActiveUntil > this.time.now) {
      return 1 + Math.floor(this.characterUpgradeLevel / 3);
    }

    return 0;
  }

  private getProjectileSpeedBonus() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return 180 + this.characterUpgradeLevel * 20;
    }

    return 0;
  }

  private getExtraPierce() {
    if (this.currentCharacterId === 'precision_squeal' && this.abilityActiveUntil > this.time.now) {
      return 1 + (this.characterUpgradeLevel >= 4 ? 1 : 0);
    }

    return 0;
  }

  private applySplashDamage(x: number, y: number, radius: number, damage: number) {
    this.enemies.getChildren().forEach((enemyObject) => {
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) return;

      const splashDamage = Math.max(1, damage - Math.floor(distance / 45));
      const nextHp = (enemy.getData('hp') ?? 1) - splashDamage;

      if (nextHp <= 0) {
        const rewardKills = enemy.getData('rewardKills') ?? 1;
        const isBoss = enemy.getData('isBoss') === true;
        enemy.destroy();
        this.kills += rewardKills;
        if (isBoss) this.bossDefeated = true;
        this.emitKillsUpdate();
      } else {
        enemy.setData('hp', nextHp);
      }
    });

    this.updateHud();
  }

  private createAreaPulse(x: number, y: number, radius: number, color: number) {
    const ring = this.add.circle(x, y, 12, color, 0.2).setDepth(790);
    ring.setStrokeStyle(3, color, 0.9);

    this.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 260,
      onComplete: () => ring.destroy()
    });
  }

  private cleanup() {
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.input.off('pointerup');
    this.spawnTimer?.remove(false);
    this.scale.off('resize', this.handleResize, this);
    this.weaponObject?.destroy();
    this.fireButtonBase?.destroy();
    this.fireButtonRing?.destroy();
    this.fireButtonThumb?.destroy();
    this.joystickBase?.destroy();
    this.joystickThumb?.destroy();
  }
}
