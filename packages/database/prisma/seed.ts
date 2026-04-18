import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding WAR PIGS database...');

  // 1. Seed Characters
  const characters = [
    {
      id: "grunt_bacon",
      name: "Grunt Bacon",
      description: "The standard infantry of the Swine Corps. Balanced, reliable, and always hungry for combat.",
      classType: "ASSAULT",
      pricePigs: 0,
    },
    {
      id: "iron_tusk",
      name: "Iron Tusk",
      description: "Heavy armor, slow but devastating. The wall that protects the sty.",
      classType: "TANK",
      pricePigs: 500,
    }
  ];

  for (const char of characters) {
    await prisma.character.upsert({
      where: { id: char.id },
      update: char,
      create: char,
    });
  }

  // 2. Seed Weapons
  const weapons = [
    {
      id: "oink_pistol",
      name: "Oink Pistol",
      type: "SIDEARM",
      damage: 15,
      description: "Standard issue sidearm. Never jams, always squeals.",
      pricePigs: 0,
    },
    {
      id: "sow_machinegun",
      name: "S.O.W. Machinegun",
      type: "ASSAULT_RIFLE",
      damage: 35,
      description: "High fire rate, low accuracy. Spray and pray.",
      pricePigs: 800,
    }
  ];

  for (const weapon of weapons) {
    await prisma.weapon.upsert({
      where: { id: weapon.id },
      update: weapon,
      create: weapon,
    });
  }

  // 3. Seed Levels
  const levels = [
    {
      levelNumber: 1,
      name: "The Farmyard",
      description: "The initial invasion. Defend the troughs.",
      difficulty: 1,
      enemyTypes: ["wolf_pup"],
      waves: 3,
      baseReward: 100,
      xpReward: 50,
      unlockRequirement: 0,
      isBossLevel: false,
    }
  ];

  for (const level of levels) {
    await prisma.level.upsert({
      where: { levelNumber: level.levelNumber },
      update: level,
      create: level,
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });