import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useGameStore } from '../store/gameStore';

// --- Types ---
type CharacterDetails = {
  characterId: string;
  name: string;
  classType: string;
  description?: string | null;
  upgradeLevel?: number | null;
};

type InventoryItem = {
  id: string;
  type: 'CHARACTER' | 'WEAPON';
  acquiredAt?: string;
  timesUsed?: number;
  details: CharacterDetails;
};

type CharacterMeta = {
  icon: string;
  classIcon: string;
  powerName: string;
  baseCooldown: number;
  effect: string;
  upgradeFocus: string;
  health: number;
  speedLabel: string;
  speedValue: number;
  maxLevel: number;
};

// --- Constants ---
const MAX_CHARACTER_LEVEL = 5;

const CHARACTER_META: Record<string, CharacterMeta> = {
  grunt_bacon: {
    icon: 'Grunt-Bacon.png',
    classIcon: 'assault.png',
    powerName: 'Mud Slow',
    baseCooldown: 6,
    effect: 'Slows nearby enemies for a short duration.',
    upgradeFocus: 'Slow strength, radius, and duration',
    health: 100,
    speedLabel: 'Balanced',
    speedValue: 245,
    maxLevel: MAX_CHARACTER_LEVEL
  },  iron_tusk: {
    icon: 'Iron-Tusk.png',
    classIcon: 'tank.png',
    powerName: 'Iron Slam',
    baseCooldown: 7,
    effect: 'Shockwave push that damages enemies around the unit.',
    upgradeFocus: 'Shockwave damage, knockback, and radius',
    health: 160,
    speedLabel: 'Slow',
    speedValue: 205,
    maxLevel: MAX_CHARACTER_LEVEL
  },
  swift_hoof: {
    icon: 'Swift-Hoof.png',
    classIcon: 'scout.png',
    powerName: 'Scout Dash',
    baseCooldown: 4.5,
    effect: 'Fast mobility burst for repositioning.',
    upgradeFocus: 'Dash distance, speed, and cooldown',
    health: 85,
    speedLabel: 'Very Fast',
    speedValue: 315,
    maxLevel: MAX_CHARACTER_LEVEL
  },
  precision_squeal: {
    icon: 'Precision-Squeal.png',
    classIcon: 'sniper.png',
    powerName: 'Focus Mode',
    baseCooldown: 7,
    effect: 'Boosts precision, projectile speed, damage, and pierce.',
    upgradeFocus: 'Damage bonus, pierce, duration, and cooldown',
    health: 90,
    speedLabel: 'Balanced',
    speedValue: 235,
    maxLevel: MAX_CHARACTER_LEVEL
  },
  blast_ham: {
    icon: 'Blast-Ham.png',
    classIcon: 'Demolition.png',
    powerName: 'Demolition Burst',
    baseCooldown: 6.5,
    effect: 'Fires explosive burst rockets toward enemies.',
    upgradeFocus: 'Rocket count, blast damage, radius, and cooldown',
    health: 115,
    speedLabel: 'Medium',
    speedValue: 225,
    maxLevel: MAX_CHARACTER_LEVEL
  },
  general_goldsnout: {
    icon: 'General-Goldsnout.png',    classIcon: 'Elite.png',
    powerName: 'Rally Order',
    baseCooldown: 8,
    effect: 'Temporary combat efficiency boost.',
    upgradeFocus: 'Buff strength, duration, and cooldown',
    health: 125,
    speedLabel: 'Fast',
    speedValue: 270,
    maxLevel: MAX_CHARACTER_LEVEL
  }
};

const DEFAULT_META: CharacterMeta = {
  icon: 'Grunt-Bacon.png',
  classIcon: 'assault.png',
  powerName: 'Mud Slow',
  baseCooldown: 6,
  effect: 'Slows nearby enemies for a short duration.',
  upgradeFocus: 'Cooldown, radius, duration, and effect strength',
  health: 100,
  speedLabel: 'Balanced',
  speedValue: 245,
  maxLevel: MAX_CHARACTER_LEVEL
};

const getUpgradeCost = (level: number) => 200 + level * 150;

// --- Component ---
export const CharacterSelect: React.FC<{ onBack: () => void; onStart: () => void }> = ({ onBack, onStart }) => {
  const [inventory, setInventory] = useState<
