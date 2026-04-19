import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding WAR PIGS database...');

  const characters = [
    {
      characterId: 'grunt_bacon',
      name: 'Grunt Bacon',
      description:
        'The standard infantry of the Swine Corps. Balanced, reliable, and always hungry for combat.',
      classType: 'ASSAULT',
      pricePigs: 0,
      unlockLevel: 1
    },
    {
      characterId: 'iron_tusk',
      name: 'Iron Tusk',
      description:
        'Heavy armor, slow but devastating. The wall that protects the sty.',
      classType: 'TANK',
      pricePigs: 500,
      unlockLevel: 2
    },
    {
      characterId: 'swift_hoof',
      name: 'Swift Hoof',
      description:
        'Fast-moving recon specialist built for rapid flanking and survival.',
      classType: 'SCOUT',
      pricePigs: 900,
      unlockLevel: 3
    },
    {
      characterId: 'precision_squeal',
      name: 'Precision Squeal',
      description:
        'Long-range specialist with a deadly eye and steady nerves.',
      classType: 'SNIPER',
      pricePigs: 1200,
      unlockLevel: 4
    },
    {
      characterId: 'blast_ham',
      name: 'Blast Ham',
      description:
        'Explosives expert who clears groups and softens heavy targets.',
      classType: 'DEMOLITION',
      pricePigs: 1600,
      unlockLevel: 5
    },
    {
      characterId: 'general_goldsnout',
      name: 'General Goldsnout',
      description:
        'Veteran commander with elite battlefield discipline and firepower.',
      classType: 'ELITE',
      pricePigs: 2500,
      unlockLevel: 7
    }
  ];

  for (const character of characters) {
    await prisma.character.upsert({
      where: { characterId: character.characterId },
      update: character,
      create: character
    });
  }

  const weapons = [
    {
      weaponId: 'oink_pistol',
      name: 'Oink Pistol',
      type: 'SIDEARM',
      damage: 15,
      description: 'Standard issue sidearm. Never jams, always squeals.',
      pricePigs: 0,
      unlockLevel: 1
    },
    {
      weaponId: 'sow_machinegun',
      name: 'S.O.W. Machinegun',
      type: 'SMG',
      damage: 22,
      description: 'High fire rate, low accuracy. Spray and pray.',
      pricePigs: 800,
      unlockLevel: 2
    },
    {
      weaponId: 'boar_rifle',
      name: 'Boar AR-15',
      type: 'RIFLE',
      damage: 32,
      description: 'Reliable assault platform with balanced control and power.',
      pricePigs: 1100,
      unlockLevel: 3
    },
    {
      weaponId: 'tusk_shotgun',
      name: 'Double Tusk Shotgun',
      type: 'SHOTGUN',
      damage: 55,
      description: 'High close-range stopping power.',
      pricePigs: 1400,
      unlockLevel: 4
    },
    {
      weaponId: 'sniper_swine',
      name: 'Longbore Sniper',
      type: 'SNIPER',
      damage: 95,
      description: 'Extreme-range precision weapon for disciplined shooters.',
      pricePigs: 1900,
      unlockLevel: 5
    },
    {
      weaponId: 'belcha_minigun',
      name: 'Belcha Minigun',
      type: 'HEAVY',
      damage: 18,
      description: 'Sustained heavy fire with brutal area denial.',
      pricePigs: 2400,
      unlockLevel: 6
    },
    {
      weaponId: 'plasma_porker',
      name: 'Plasma Porker X',
      type: 'ENERGY',
      damage: 75,
      description: 'Experimental plasma weapon with advanced stopping force.',
      pricePigs: 3200,
      unlockLevel: 7
    },
    {
      weaponId: 'bacon_blaster',
      name: 'Bacon Blaster 9000',
      type: 'LEGENDARY',
      damage: 120,
      description: 'Prototype endgame cannon reserved for top operatives.',
      pricePigs: 4500,
      unlockLevel: 8
    }
  ];

  for (const weapon of weapons) {
    await prisma.weapon.upsert({
      where: { weaponId: weapon.weaponId },
      update: weapon,
      create: weapon
    });
  }

  const levels = [
    {
      levelNumber: 1,
      name: 'The Farmyard',
      description: 'The initial invasion. Defend the troughs.',
      difficulty: 1,
      enemyTypes: ['wolf_grunt'],
      waves: 3,
      bossId: null,
      baseReward: 100,
      xpReward: 50,
      unlockRequirement: 0,
      isBossLevel: false
    },
    {
      levelNumber: 2,
      name: 'Broken Fences',
      description: 'Secure the perimeter and push back advancing raiders.',
      difficulty: 2,
      enemyTypes: ['wolf_grunt', 'wolf_soldier'],
      waves: 4,
      bossId: null,
      baseReward: 180,
      xpReward: 90,
      unlockRequirement: 1,
      isBossLevel: false
    },
    {
      levelNumber: 3,
      name: 'Night Raid',
      description: 'Hostile scouts move under cover of darkness.',
      difficulty: 3,
      enemyTypes: ['wolf_soldier', 'cyber_fox'],
      waves: 4,
      bossId: null,
      baseReward: 260,
      xpReward: 130,
      unlockRequirement: 2,
      isBossLevel: false
    },
    {
      levelNumber: 4,
      name: 'Wolfpack Alpha',
      description: 'Command unit identified. Eliminate the pack leader.',
      difficulty: 4,
      enemyTypes: ['wolf_grunt', 'wolf_soldier', 'wolf_heavy'],
      waves: 5,
      bossId: 'alpha_wolfgang',
      baseReward: 420,
      xpReward: 220,
      unlockRequirement: 3,
      isBossLevel: true
    }
  ];

  for (const level of levels) {
    await prisma.level.upsert({
      where: { levelNumber: level.levelNumber },
      update: level,
      create: level
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
