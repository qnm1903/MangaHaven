import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

const createPrismaClient = () => {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const isAccelerate = dbUrl.includes('accelerate.prisma');
  const logLevel = process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] as const : ['error'] as const;

  if (isAccelerate) {
    // Prisma v7: Accelerate requires accelerateUrl in constructor
    const client = new PrismaClient({
      accelerateUrl: dbUrl,
      log: [...logLevel],
    });
    return client.$extends(withAccelerate());
  }

  // Direct connection: use @prisma/adapter-pg
  const directUrl = process.env.DIRECT_DATABASE_URL ?? dbUrl;
  const adapter = new PrismaPg(directUrl);
  const client = new PrismaClient({
    adapter,
    log: [...logLevel],
  });
  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
export default prisma;