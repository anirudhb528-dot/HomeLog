'use strict';

const mongoose = require('mongoose');
const env = require('./env');

// Holds the in-memory MongoDB instance when one is started (dev with no URI).
let memoryServer = null;

/**
 * Resolve the MongoDB connection string. If MONGO_URI is configured (local
 * mongod or Atlas) it's used directly. Otherwise — for zero-setup local dev —
 * an ephemeral in-memory MongoDB is started and its URI returned.
 */
async function resolveUri() {
  if (env.mongoUri) return env.mongoUri;

  if (env.isProduction) {
    throw new Error('MONGO_URI is required in production.');
  }

  // Lazy-require so production installs never need this dependency.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  console.log('[db] No MONGO_URI set — starting an in-memory MongoDB (first run downloads it)...');
  memoryServer = await MongoMemoryServer.create();
  console.log('[db] In-memory MongoDB ready. NOTE: data is ephemeral and resets on restart.');
  return memoryServer.getUri();
}

/**
 * Connect to MongoDB. Resolves once the connection is open so `server.js` can
 * boot the HTTP listener only after the database is reachable.
 * @returns {{ usingMemoryServer: boolean }}
 */
async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  const uri = await resolveUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[db] MongoDB connected');

  return { usingMemoryServer: !!memoryServer };
}

/** Close the connection and stop the in-memory server if one is running. */
async function disconnectDB() {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
