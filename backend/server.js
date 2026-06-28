'use strict';

const app = require('./app');
const env = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');
const { seedDatabase } = require('./src/utils/seed');

async function start() {
  // Bind the HTTP port FIRST so the hosting platform (Render) immediately
  // detects an open port, even if the database is slow to connect. The DB is
  // then connected in the background; /api/health reports its status.
  const server = app.listen(env.port, () => {
    console.log(`[server] HomeLog API listening on port ${env.port}`);
    console.log(`[server] API docs at /api/docs`);
  });

  try {
    // In production, surface missing secrets clearly (but the port is already up).
    env.assertRuntimeConfig();

    const { usingMemoryServer } = await connectDB();

    // The in-memory DB starts empty and resets each run, so seed it automatically
    // to make the app immediately usable with the demo account.
    if (usingMemoryServer) {
      await seedDatabase();
    }
  } catch (err) {
    // Don't take the whole service down if the DB isn't reachable — the API
    // stays up (health check passes) and DB-backed routes return errors until
    // the connection/config is fixed and the service is redeployed.
    console.error('[server] Database setup failed — API is up but DB calls will fail:', err.message);
  }

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

start();
