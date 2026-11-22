'use strict';

// Tests against a REAL MongoDB that has a login turned on, so that a wrong-password
// failure is a genuine error from the real database (not one we invented).
// Skipped with plain `npm test`; run with `npm run test:db`.

const { MongoMemoryServer } = require('mongodb-memory-server-core');
const mongoose = require('mongoose');
const {
  connectDatabase,
  disconnectDatabase,
  getDatabaseState,
  describeConnectionError,
} = require('../src/config/db');
const { describeWithDatabase, TEST_DRIVER_OPTIONS } = require('./helpers/database');
const MONGO_VERSION = require('./helpers/mongoVersion');

const ROOT_USER = 'root';
const ROOT_PASSWORD = 'RightPassw0rd';
const WRONG_PASSWORD = 'WrongPassw0rd';

describeWithDatabase('MongoDB with a login turned on', () => {
  let mongod;
  let hostAndPort;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      binary: { version: MONGO_VERSION },
      auth: { enable: true, customRootName: ROOT_USER, customRootPwd: ROOT_PASSWORD },
    });
    hostAndPort = mongod.getUri().replace(/^mongodb:\/\//, '').replace(/\/.*$/, '');
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
    if (mongod) await mongod.stop();
  });

  const uriFor = (password) => `mongodb://${ROOT_USER}:${password}@${hostAndPort}/?authSource=admin`;

  test('T-DB-04: a wrong password is rejected by the real database, explained in plain English, and never leaked', async () => {
    const uri = uriFor(WRONG_PASSWORD);

    let caught;
    try {
      await connectDatabase({ uri, dbName: 'findit', serverSelectionTimeoutMS: 5000, driverOptions: TEST_DRIVER_OPTIONS });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(getDatabaseState()).toBe('disconnected');

    const text = describeConnectionError(caught, uri);
    expect(text).toMatch(/username or password/i);
    expect(text).not.toContain(WRONG_PASSWORD);
    expect(text).not.toContain(uri);
  });

  test('the correct password connects, so the test above fails for the right reason', async () => {
    await connectDatabase({
      uri: uriFor(ROOT_PASSWORD),
      dbName: 'findit',
      serverSelectionTimeoutMS: 5000,
      driverOptions: TEST_DRIVER_OPTIONS,
    });
    expect(mongoose.connection.readyState).toBe(1);
    expect(getDatabaseState()).toBe('connected');
  });
});
