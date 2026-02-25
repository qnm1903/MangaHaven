import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Use DIRECT connection for CLI commands (migrations, generate, studio)
    // Runtime PrismaClient will use DATABASE_URL (Accelerate) from prisma.ts
    url: env('DIRECT_DATABASE_URL'),
  },
});