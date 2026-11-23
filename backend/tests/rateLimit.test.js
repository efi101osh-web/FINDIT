'use strict';

// Rate limiting. No database needed: requests are counted before any real work happens, and
// the requests below are deliberately invalid (400), which counts as a failed attempt.

const request = require('supertest');
const { createApp } = require('../src/app');
const { makeTestApp, makeTestConfig } = require('./helpers/testConfig');

const RELAXED = { globalMax: 1000000, loginFailuresMax: 1000000, registerMax: 1000000 };
const appWith = (limits) => makeTestApp({}, { rateLimits: { ...RELAXED, ...limits } });
const login = (app, email) => request(app).post('/api/v1/auth/login').send({ email, password: '' });

describe('login rate limit (failed attempts, per address + email)', () => {
  test('T-SEC-03: after the allowed failed attempts, login gets 429 RATE_LIMITED in the standard format', async () => {
    const app = appWith({ loginFailuresMax: 3 });
    for (let i = 0; i < 3; i += 1) expect((await login(app, 'a@example.com')).status).toBe(400);

    const blocked = await login(app, 'a@example.com');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ success: false, error: { code: 'RATE_LIMITED', message: expect.any(String) } });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.headers['ratelimit']).toBeDefined(); // tells well-behaved clients their budget
  });

  test('the budget is per EMAIL: guessing one account does not lock out other people on the same address', async () => {
    const app = appWith({ loginFailuresMax: 2 });
    await login(app, 'victim@example.com');
    await login(app, 'victim@example.com');
    expect((await login(app, 'victim@example.com')).status).toBe(429);
    expect((await login(app, 'someone.else@example.com')).status).toBe(400); // not blocked
  });

  test('the same email in different letter case or with spaces shares one budget (no sneaking past it)', async () => {
    const app = appWith({ loginFailuresMax: 2 });
    await login(app, 'Victim@Example.com');
    await login(app, '  victim@example.COM ');
    expect((await login(app, 'VICTIM@EXAMPLE.COM')).status).toBe(429);
  });

  test('other endpoints are not held back by a locked-out login', async () => {
    const app = appWith({ loginFailuresMax: 1 });
    await login(app, 'a@example.com');
    expect((await login(app, 'a@example.com')).status).toBe(429);
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
  });
});

describe('register rate limit', () => {
  test('every sign-up request counts, and the extra ones get 429', async () => {
    const app = appWith({ registerMax: 2 });
    expect((await request(app).post('/api/v1/auth/register').send({})).status).toBe(400);
    expect((await request(app).post('/api/v1/auth/register').send({})).status).toBe(400);
    const blocked = await request(app).post('/api/v1/auth/register').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('general rate limit', () => {
  test('covers every endpoint', async () => {
    const app = appWith({ globalMax: 4 });
    for (let i = 0; i < 4; i += 1) expect((await request(app).get('/api/v1/health')).status).toBe(200);
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  test('counters belong to one app instance (they are not shared by accident)', async () => {
    const a = appWith({ loginFailuresMax: 1 });
    const b = appWith({ loginFailuresMax: 1 });
    await login(a, 'a@example.com');
    expect((await login(a, 'a@example.com')).status).toBe(429);
    expect((await login(b, 'a@example.com')).status).toBe(400);
  });
});

describe('limits set in the settings (.env)', () => {
  test('are really used by the app when nothing overrides them', async () => {
    // Built directly from a config, the way the real server does it (no test overrides).
    const app = createApp(makeTestConfig({ RATE_LIMIT_GLOBAL_MAX: '2' }));
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
    expect((await request(app).get('/api/v1/health')).status).toBe(429);
  });

  test('the built-in defaults apply when nothing is set (a generous general limit, so normal use is never blocked)', async () => {
    const app = createApp(makeTestConfig());
    for (let i = 0; i < 25; i += 1) expect((await request(app).get('/api/v1/health')).status).toBe(200);
  });
});
