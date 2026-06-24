'use strict';

// Load environment variables from .env (no-op if the file is absent, e.g. in CI).
require('dotenv').config();

/**
 * Central, validated view of process configuration.
 *
 * Secrets (MONGO_URI, JWT_SECRET) are required to *run* the server, but we don't
 * throw on import — the test suite loads `app.js` without a database, and CI runs
 * without secrets. `assertRuntimeConfig()` is called by `server.js` before boot so
 * a real start-up fails loudly with a helpful message.
 */
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  // CORS_ORIGIN is a comma-separated list, or "*" for any origin.
  corsOrigin: (process.env.CORS_ORIGIN || '*').trim(),

  // Supabase Storage (optional) — used for image uploads. When unset, upload
  // endpoints return 503 and the rest of the app runs normally.
  supabaseUrl: (process.env.SUPABASE_URL || '').trim(),
  supabaseServiceKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  supabaseBucket: (process.env.SUPABASE_BUCKET || 'homelog-uploads').trim(),
};

// True only when all Supabase settings are present (incl. a non-empty bucket),
// so storage features activate and uploads take the proper 503-disabled path.
env.storageEnabled = Boolean(env.supabaseUrl && env.supabaseServiceKey && env.supabaseBucket);

// How many proxy hops to trust (Express `trust proxy`). Default 1 for a single
// load balancer (Render/Heroku). Override with TRUST_PROXY: a number, or "false"
// for no proxy, or an IP/subnet string.
env.trustProxy = (() => {
  const v = process.env.TRUST_PROXY;
  if (v === undefined || v === '') return 1;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v;
})();

env.isProduction = env.nodeEnv === 'production';
env.isTest = env.nodeEnv === 'test';

/** Allowed CORS origins as an array, or '*' to allow any. */
env.corsOrigins =
  env.corsOrigin === '*'
    ? '*'
    : env.corsOrigin
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

// True when no database URI is configured — the app then falls back to an
// in-memory MongoDB for zero-setup local development.
env.useInMemoryDb = !env.mongoUri;

/**
 * Throw if required runtime secrets are missing. Called by server.js, not on
 * import. In development we tolerate a missing MONGO_URI (an in-memory MongoDB
 * is started instead) and a default JWT secret; production requires real values.
 */
env.assertRuntimeConfig = function assertRuntimeConfig() {
  if (!env.isProduction) return;

  const missing = [];
  if (!env.mongoUri) missing.push('MONGO_URI');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s) for production: ${missing.join(', ')}. ` +
        'Set them in the environment or backend/.env.'
    );
  }
};

module.exports = env;
