export type LevelEnemyKind = 'soldier' | 'heavy' | 'drone' | 'helicopter' | 'tank';

export type LevelEnemySpawn = {
  kind: LevelEnemyKind;
  x: number;
  y: number;
};

export type LevelPlatform = {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: number;
};

export type LevelCrate = {
  x: number;
  y: number;
};

export type LevelBuilding = {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: number;
};

export type LevelBoss = {
  kind: LevelEnemyKind;
  x: number;
  y: number;
  triggerX: number;
  title: string;
};

export type LevelDefinition = {
  id: string;
  levelNumber: number;
  title: string;
  subtitle: string;
  worldWidth: number;
  worldHeight: number;
  groundY: number;
  extractionX: number;
  killTarget: number;
  gravity: number;
  backgroundColor: number;
  sunColor: number;
  allowDynamicSpawns: boolean;
  dynamicSpawnLimit: number;
  platforms: LevelPlatform[];
  crates: LevelCrate[];
  buildings: LevelBuilding[];
  initialEnemies: LevelEnemySpawn[];
  boss: LevelBoss;
};

const LEVEL_1_GROUND_Y = 650;

export const LEVEL_1: LevelDefinition = {
  id: 'level_1',
  levelNumber: 1,
  title: 'Level 1: Outskirts Breach',
  subtitle: 'Clear the checkpoint and reach extraction.',
  worldWidth: 4600,
  worldHeight: 760,
  groundY: LEVEL_1_GROUND_Y,
  extractionX: 4300,
  killTarget: 6,
  gravity: 1850,
  backgroundColor: 0xf0b66d,
  sunColor: 0xfff6d7,

  // Level 1 must stay controlled and beginner-friendly.
  // No endless swarm. No random waves.
  allowDynamicSpawns: false,
  dynamicSpawnLimit: 0,

  platforms: [
    {
      x: 2300,
      y: LEVEL_1_GROUND_Y + 44,
      width: 4600,
      height: 90,
      color: 0x3c2b21
    },
    {
      x: 2300,
      y: LEVEL_1_GROUND_Y,
      width: 4600,
      height: 28,
      color: 0xb8a07d
    },
    {
      x: 680,
      y: 510,
      width: 380,
      height: 34,
      color: 0x7b704c
    },
    {
      x: 1240,
      y: 420,
      width: 390,
      height: 34,
      color: 0x6c744a
    },
    {
      x: 1840,
      y: 535,
      width: 360,
      height: 34,
      color: 0x9a7c5a
    },
    {
      x: 2450,
      y: 440,
      width: 420,
      height: 34,
      color: 0x7b704c
    },
    {
      x: 3180,
      y: 525,
      width: 420,
      height: 34,
      color: 0x9a7c5a
    },
    {
      x: 3820,
      y: 435,
      width: 420,
      height: 34,
      color: 0x6c744a
    }
  ],

  crates: [
    {
      x: 900,
      y: 470
    },
    {
      x: 1500,
      y: 380
    },
    {
      x: 2700,
      y: 400
    },
    {
      x: 3520,
      y: 485
    }
  ],

  buildings: [
    {
      x: 340,
      y: LEVEL_1_GROUND_Y - 138,
      width: 420,
      height: 260,
      color: 0xd0c8b8
    },
    {
      x: 1420,
      y: LEVEL_1_GROUND_Y - 164,
      width: 520,
      height: 310,
      color: 0xcfc5ad
    },
    {
      x: 2580,
      y: LEVEL_1_GROUND_Y - 145,
      width: 480,
      height: 270,
      color: 0xd6d0c1
    },
    {
      x: 3920,
      y: LEVEL_1_GROUND_Y - 175,
      width: 520,
      height: 330,
      color: 0xd4ccc0
    }
  ],

  // 5 starting enemies.
  // The mini tank is spawned separately as the level boss.
  initialEnemies: [
    {
      kind: 'soldier',
      x: 720,
      y: LEVEL_1_GROUND_Y - 120
    },
    {
      kind: 'soldier',
      x: 1180,
      y: 350
    },
    {
      kind: 'drone',
      x: 1880,
      y: 340
    },
    {
      kind: 'soldier',
      x: 2500,
      y: LEVEL_1_GROUND_Y - 120
    },
    {
      kind: 'soldier',
      x: 3220,
      y: LEVEL_1_GROUND_Y - 120
    }
  ],

  // 6th enemy. This is the mini tank.
  boss: {
    kind: 'tank',
    x: 3920,
    y: LEVEL_1_GROUND_Y - 130,
    triggerX: 3450,
    title: 'MINI TANK INCOMING'
  }
};

const LEVELS: Record<string, LevelDefinition> = {
  level_1: LEVEL_1
};

export function getLevelDefinition(levelId?: string | null): LevelDefinition {
  if (!levelId) return LEVEL_1;

  return LEVELS[levelId] || LEVEL_1;
      }
