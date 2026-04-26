import { LEVEL_1 } from './Level1';
import { LevelDefinition } from './types';

export const LEVELS: LevelDefinition[] = [LEVEL_1];

export const getLevelDefinition = (_levelId?: string): LevelDefinition => {
  return LEVEL_1;
};

export { LEVEL_1 };
export type { LevelDefinition, LevelEnemyKind, LevelEnemySpawn, LevelPlatform } from './types';
