'use strict';

const app = require('./app');
const env = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');
const { seedDatabase } = require('./src/utils/seed');

async function start() {
  // Fail fast with a clear message if required secrets are missing (prod only).
  env.assertRuntimeConfig();

  const { usingMemoryServer } = await connectDB();

  // The in-memory DB starts empty and resets each run, so seed it automatically
  // to make the app immediately usable with the demo account.
  if (usingMemoryServer) {
    await seedDatabase();
  }

  const server = app.listen(env.port, () => {
    console.log(`[server] HomeLog API listening on http://localhost:${env.port}`);
    console.log(`[server] API docs at http://localhost:${env.port}/api/docs`);
  });

  // Graceful shutdown so MongoDB connections close cleanly.
  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
