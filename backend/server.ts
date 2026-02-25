import app from './src/app';
import prisma from './src/db/prisma';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { initSocketServer } from './src/services/socket_service';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const BACKEND_PORT = process.env.BACKEND_PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');

    // Create HTTP server from Express app
    const server = http.createServer(app);

    // Initialize Socket.io
    initSocketServer(server);

    // Start server
    server.listen(BACKEND_PORT, () => {
      console.log(`Server running on port ${BACKEND_PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Link check: http://localhost:${BACKEND_PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
