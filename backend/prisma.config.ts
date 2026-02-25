import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        // Direct connection for migrate/generate CLI commands
        // Runtime PrismaClient uses DATABASE_URL (Accelerate) from src/db/prisma.ts
        url: env('DIRECT_DATABASE_URL'),
    },
});