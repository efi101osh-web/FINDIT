'use strict';

// Helpers for tests that need a real MongoDB.

const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../../src/config/db');

// Use `describeWithDatabase` instead of `describe` for tests that need MongoDB.
// With plain `npm test` they show up in the results as "skipped" (never "passed").
const describeWithDatabase = process.env.TEST_MONGO_URI ? describe : describe.skip;

// WHY THIS EXISTS: the MongoDB driver loads Node's `os` module with a dynamic `import()`,
// which Jest's sandbox does not support. Inside Jest the driver then sends an EMPTY
// handshake and the database refuses with "Missing required sub-document 'driver'".
// The driver has an option for handing it the module directly, so tests do that.
// The real server runs in plain Node and does not need this, so it is kept out of src/.
const TEST_DRIVER_OPTIONS = { runtimeAdapters: { os: require('os') } };

/** A different database name for every test file, so tests can never disturb each other. */
function uniqueDbName() {
  return `findit_test_${process.pid}_${Date.now()}`;
}

/** Connect Mongoose to the throwaway test database. Returns the database name used. */
async function connectTestDatabase() {
  const dbName = uniqueDbName();
  await connectDatabase({
    uri: process.env.TEST_MONGO_URI,
    dbName,
    serverSelectionTimeoutMS: 5000,
    driverOptions: TEST_DRIVER_OPTIONS,
  });
  return dbName;
}

/** Delete the test database and disconnect. Call in `afterAll`. */
async function cleanUpTestDatabase() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await disconnectDatabase();
}

module.exports = { describeWithDatabase, connectTestDatabase, cleanUpTestDatabase, TEST_DRIVER_OPTIONS };
