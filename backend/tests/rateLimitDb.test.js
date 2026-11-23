'use strict';

// Rate limiting rules that need real accounts (against a REAL MongoDB).

const request = require('supertest');
const { makeTestApp } = require('./helpers/testConfig');
const { describeWithDatabase, connectTestDatabase, cleanUpTestDatabase } = require('./helpers/database');
const { PASSWORD, registerViaApi } = require('./helpers/users');

const RELAXED = { globalMax: 1000000, loginFailuresMax: 1000000, registerMax: 1000000 };

describeWithDatabase('login limit counts only FAILED attempts', () => {
  beforeAll(connectTestDatabase);
  afterAll(cleanUpTestDatabase);

  test('many correct logins never use up the budget, but wrong passwords do', async () => {
    const app = makeTestApp({}, { rateLimits: { ...RELAXED, loginFailuresMax: 2 } });
    const { body } = await registerViaApi(app);
    const login = (password) => request(app).post('/api/v1/auth/login').send({ email: body.email, password });

    for (let i = 0; i < 6; i += 1) expect((await login(PASSWORD)).status).toBe(200); // far more than the limit of 2

    expect((await login('WrongPassword1')).status).toBe(401);
    expect((await login('WrongPassword2')).status).toBe(401);
    expect((await login('WrongPassword3')).status).toBe(429); // the failures used up the budget

    // Even the CORRECT password is refused while locked out (otherwise guessing would still work).
    expect((await login(PASSWORD)).status).toBe(429);
  });

  test('a lock-out of one account does not affect another account on the same address', async () => {
    const app = makeTestApp({}, { rateLimits: { ...RELAXED, loginFailuresMax: 1 } });
    const a = await registerViaApi(app);
    const b = await registerViaApi(app);
    const login = (email, password) => request(app).post('/api/v1/auth/login').send({ email, password });

    await login(a.body.email, 'WrongPassword1');
    expect((await login(a.body.email, 'WrongPassword1')).status).toBe(429);
    expect((await login(b.body.email, PASSWORD)).status).toBe(200);
  });
});
