import { LevelDefinition } from './types';

export const LEVEL_1: LevelDefinition = {
  id: 'level-1',
  // Backend sync fields (Required for RewardCalculator & EconomyService)
  levelNumber: 1,
  difficulty: 1,
  waves: 3, // Approximation: 10 initial + dynamic spawns
  baseReward: 500,
  xpReward: 200,

  // Gameplay flags (Required by GameScene logic)
  allowDynamicSpawns: true,
  dynamicSpawnLimit: 12,

  title: 'Outskirts Breach',
  subtitle: 'Break through the wolf outpost.',
  missionBrief: 'Push through the desert outpost, clear enemy patrols, destroy the mini tank, and reach extraction.',
  worldWidth: 5400,
  worldHeight: 760,
  
  // Note: groundY is the logical "floor" level for player positioning.
  // Platform geometry Y coordinates should align such that top surfaces match this value.
  groundY: 650, 
  extractionX: 5100,
  killTarget: 14,
  gravity: 1850,
  backgroundColor: 0xf0b66d,
  sunColor: 0xfff6d7,

  platforms: [
    // Base floor: Center Y=650, Height=28 -> Top surface at 636.
    // To match groundY=650 strictly, Y should be 664 (664 - 14 = 650).
    // Keeping as-is but noting the offset.
    { x: 2700, y: 664, width: 5400, height: 28, color: 0xb8a07d }, 
    // Sub-floor/deep ground
    { x: 2700, y: 694, width: 5400, height: 90, color: 0x3c2b21 },

    // Elevated platforms
    { x: 650, y: 520, width: 360, height: 34, color: 0x7b704c },
    { x: 1050, y: 455, width: 240, height: 34, color: 0x9a7c5a },
    { x: 1380, y: 390, width: 420, height: 34, color: 0x6c744a },

    { x: 1900, y: 530, width: 360, height: 34, color: 0x9a7c5a },
    { x: 2350, y: 440, width: 460, height: 34, color: 0x7b704c },

    { x: 2920, y: 520, width: 360, height: 34, color: 0x9a7c5a },
    { x: 3380, y: 390, width: 440, height: 34, color: 0x6c744a },

    { x: 3970, y: 520, width: 480, height: 34, color: 0x7b704c },
    { x: 4550, y: 420, width: 440, height: 34, color: 0x9a7c5a }
  ],

  crates: [
    { x: 430, y: 610 },
    { x: 790, y: 480 },
    { x: 1170, y: 415 },
    { x: 1540, y: 350 },
    { x: 2140, y: 490 },
    { x: 2520, y: 400 },
    { x: 3140, y: 480 },
    { x: 3650, y: 350 },
    { x: 4300, y: 380 },
    { x: 4860, y: 610 }
  ],

  buildings: [
    { x: 360, y: 512, width: 420, height: 260, color: 0xd0c8b8 },
    { x: 1480, y: 486, width: 520, height: 310, color: 0xcfc5ad },
    { x: 2600, y: 505, width: 480, height: 270, color: 0xd6d0c1 },
    { x: 3900, y: 470, width: 540, height: 340, color: 0xd4ccc0 },
    { x: 5000, y: 505, width: 400, height: 270, color: 0xc9c1af }
  ],

  initialEnemies: [
    // Ground enemies (y ~636 platform top)
    { x: 620, y: 620, kind: 'soldier' },
    { x: 960, y: 620, kind: 'soldier' },
    { x: 1320, y: 310, kind: 'drone' }, // Flying
    { x: 1720, y: 620, kind: 'soldier' },
    { x: 2180, y: 360, kind: 'drone' },  // Flying
    { x: 2580, y: 620, kind: 'heavy' },
    { x: 3120, y: 620, kind: 'soldier' },
    { x: 3420, y: 300, kind: 'drone' },  // Flying
    { x: 3820, y: 620, kind: 'soldier' },
    { x: 4240, y: 620, kind: 'heavy' }
  ],

  boss: {
    triggerX: 4200,
    kind: 'tank',
    x: 4680,
    y: 520, // Boss spawns on elevated platform or ground? Adjust to 620 if ground.
    title: 'MINI TANK INCOMING'
  }
};
