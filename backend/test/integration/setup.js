'use strict';

// Shared Mocha hooks: spin up an in-memory MongoDB for the integration suite and
// connect Mongoose to it, then tear it all down. Imported by integration tests.
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;

async function startTestDb() {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
}

async function stopTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (memoryServer) await memoryServer.stop();
}

/** Remove all documents between tests so each case starts clean. */
async function clearTestDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

module.exports = { startTestDb, stopTestDb, clearTestDb };
