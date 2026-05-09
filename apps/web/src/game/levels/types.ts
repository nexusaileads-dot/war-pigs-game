/**
 * Valid enemy categories recognized by the game engine and backend.
 */
export type LevelEnemyKind = 'soldier' | 'heavy' | 'drone' | 'helicopter' | 'tank';

export type LevelPlatform = {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: number; // Hex color for runtime generation
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
  color?: number; // Hex color for background decoration
};

export type LevelEnemySpawn = {
  x: number;
  y: number;
  kind: LevelEnemyKind;
};

/**
 * Master definition for a game level.
 * 
 * NOTE: All fields marked as 'Required by...' must be present for backend 
 * validation and reward calculation to function correctly.
 */
export type LevelDefinition = {
  // --- Core Identity ---
  id: string;
  title: string;
  subtitle: string;
  missionBrief: string;

  // --- Backend & Economy Sync (Required for RewardCalculator) ---
  levelNumber: number;       // 1-based index for UI display and sorting
  difficulty: number;        // Multiplier for enemy stats and reward scaling (e.g., 1.0, 1.2)
  waves: number;             // Number of waves for backend validation (approximation of spawn count)
  baseReward: number;        // Base currency awarded for completion
  xpReward: number;          // Base XP awarded for completion

  // --- Gameplay Logic (Required by GameScene) ---
  allowDynamicSpawns: boolean; // Enable continuous enemy spawning during the level
  dynamicSpawnLimit: number;   // Max enemies to spawn dynamically

  // --- World Geometry & Physics ---
  worldWidth: number;        // Total level width in pixels
  worldHeight: number;       // Total level height in pixels
  groundY: number;           // Y-coordinate of the primary floor surface
  extractionX: number;       // X-coordinate where extraction zone begins
  killTarget: number;        // Number of kills required to unlock extraction
  gravity: number;           // Arcade physics gravity (pixels/s^2)
  backgroundColor: number;   // Hex color for canvas background
  sunColor: number;          // Hex color for background decorative sun

  // --- Entities ---
  platforms?: LevelPlatform[];
  crates?: LevelCrate[];
  buildings?: LevelBuilding[];
  initialEnemies?: LevelEnemySpawn[];
  
  boss: {
    triggerX: number;        // Player X position that triggers boss spawn
    kind: LevelEnemyKind;
    x: number;               // Spawn X coordinate
    y: number;               // Spawn Y coordinate
    title: string;           // Boss intro text
  };
};
