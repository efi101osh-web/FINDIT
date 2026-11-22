'use strict';

// Tests that need a REAL MongoDB. With plain `npm test` they show as "skipped".
// Run them with `npm run test:db` (see documentation/SETUP_GUIDE.md).

const request = require('supertest');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { getDatabaseState, inspectDatabase, disconnectDatabase } = require('../src/config/db');
const mongoose = require('mongoose');
const {
  describeWithDatabase,
  connectTestDatabase,
  cleanUpTestDatabase,
} = require('./helpers/database');

const app = createApp(loadConfig({ NODE_ENV: 'test' }));

describeWithDatabase('real MongoDB connection', () => {
  let dbName;

  beforeAll(async () => {
    dbName = await connectTestDatabase();
  });

  afterAll(async () => {
    await cleanUpTestDatabase();
  });

  test('T-DB-02: connecting works and the state is "connected", using the database name we asked for', () => {
    expect(mongoose.connection.readyState).toBe(1);
    expect(getDatabaseState()).toBe('connected');
    expect(mongoose.connection.name).toBe(dbName);
  });

  test('T-HLT-01: the health check reports database "connected"', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
  });

  test('inspectDatabase (used by `npm run check:db`) returns the name, address and server version', async () => {
    const info = await inspectDatabase();
    expect(info.databaseName).toBe(dbName);
    expect(info.serverVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(typeof info.host).toBe('string');
  });

  test('data can really be written and read back (proves this is a genuine working database)', async () => {
    const collection = mongoose.connection.collection('connection_check');
    await collection.insertOne({ note: 'hello', at: new Date() });
    const found = await collection.findOne({ note: 'hello' });
    expect(found).not.toBeNull();
    expect(found.note).toBe('hello');
  });

  test('T-DB-03: after disconnecting, health honestly reports "disconnected" (and the server stays up)', async () => {
    await disconnectDatabase();
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe('disconnected');
  });
});
