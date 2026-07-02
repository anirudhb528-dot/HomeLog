'use strict';

const app = require('./app');
const env = require('./src/config/env');

// Supabase is accessed over HTTPS (no persistent DB connection to open), so we
// bind the port immediately.
const server = app.listen(env.port, () => {
  console.log(`[server] HomeLog API listening on port ${env.port}`);
  console.log(`[server] API docs at /api/docs`);
});

if (!env.supabaseConfigured) {
  console.warn(
    '[server] WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — ' +
      'data endpoints will fail until configured.'
  );
}

// Graceful shutdown.
const shutdown = (signal) => {
  console.log(`\n[server] ${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
