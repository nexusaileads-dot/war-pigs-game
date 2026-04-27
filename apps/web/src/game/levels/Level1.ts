import { LevelDefinition } from './types';

export const LEVEL_1: LevelDefinition = {
  id: 'level-1',
  title: 'Outskirts Breach',
  subtitle: 'Break through the wolf outpost.',
  missionBrief:
    'Push through the desert outpost, clear enemy patrols, destroy the mini tank, and reach extraction.',
  worldWidth: 5400,
  worldHeight: 760,
  groundY: 650,
  extractionX: 5100,
  killTarget: 14,
  gravity: 1850,
  backgroundColor: 0xf0b66d,
  sunColor: 0xfff6d7,

  platforms: [
    { x: 2700, y: 694, width: 5400, height: 90, color: 0x3c2b21 },
    { x: 2700, y: 650, width: 5400, height: 28, color: 0xb8a07d },

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
    { x: 620, y: 530, kind: 'soldier' },
    { x: 960, y: 415, kind: 'soldier' },
    { x: 1320, y: 310, kind: 'drone' },
    { x: 1720, y: 530, kind: 'soldier' },
    { x: 2180, y: 360, kind: 'drone' },
    { x: 2580, y: 530, kind: 'heavy' },
    { x: 3120, y: 430, kind: 'soldier' },
    { x: 3420, y: 300, kind: 'drone' },
    { x: 3820, y: 530, kind: 'soldier' },
    { x: 4240, y: 340, kind: 'heavy' }
  ],

  boss: {
    triggerX: 4200,
    kind: 'tank',
    x: 4680,
    y: 520,
    title: 'MINI TANK INCOMING'
  }
};
