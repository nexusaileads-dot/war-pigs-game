export type LevelEnemyKind = 'soldier' | 'heavy' | 'drone' | 'helicopter' | 'tank';

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

export type LevelEnemySpawn = {
  x: number;
  y: number;
  kind: LevelEnemyKind;
};

export type LevelDefinition = {
  id: string;
  title: string;
  subtitle: string;
  missionBrief: string;
  worldWidth: number;
  worldHeight: number;
  groundY: number;
  extractionX: number;
  killTarget: number;
  gravity: number;
  backgroundColor: number;
  sunColor: number;
  platforms: LevelPlatform[];
  crates: LevelCrate[];
  buildings: LevelBuilding[];
  initialEnemies: LevelEnemySpawn[];
  boss: {
    triggerX: number;
    kind: LevelEnemyKind;
    x: number;
    y: number;
    title: string;
  };
};
