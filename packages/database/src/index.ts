import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __warPigsPrisma: PrismaClient | undefined;
}

const prismaClient =
  globalThis.__warPigsPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__warPigsPrisma = prismaClient;
}

export const prisma = prismaClient;

export * from '@prisma/client';
