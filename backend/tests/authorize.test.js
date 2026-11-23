'use strict';

// Role-based access (authorize) against a REAL MongoDB. No admin endpoints exist yet (Stage 12),
// so these tests build a tiny app with two protected routes using the real middleware.

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const createServices = require('../src/services');
const createAuthenticate = require('../src/middleware/authenticate');
const authorize = require('../src/middleware/authorize');
const createErrorHandler = require('../src/middleware/errorHandler');
const { makeTestConfig, TEST_JWT_SECRET } = require('./helpers/testConfig');
const { describeWithDatabase, connectTestDatabase, cleanUpTestDatabase } = require('./helpers/database');
const { createUserDirectly } = require('./helpers/users');

const config = makeTestConfig();
const services = createServices(config);
const authenticate = createAuthenticate(services);

const app = express();
app.get('/admin-only', authenticate, authorize('admin'), (req, res) => res.json({ ok: true, role: req.user.role }));
app.get('/staff', authenticate, authorize('admin', 'recovery_officer'), (req, res) => res.json({ ok: true }));
app.use(createErrorHandler(config));

const bearer = (user) => `Bearer ${services.tokens.issue(user._id)}`;
const get = (path, user) => {
  const req = request(app).get(path);
  return user ? req.set('Authorization', bearer(user)) : req;
};

describeWithDatabase('role-based access', () => {
  let regular, admin, officer;
  beforeAll(async () => {
    await connectTestDatabase();
    regular = (await createUserDirectly({ role: 'user' })).user;
    admin = (await createUserDirectly({ role: 'admin' })).user;
    officer = (await createUserDirectly({ role: 'recovery_officer' })).user;
  });
  afterAll(cleanUpTestDatabase);

  test('no login: 401 (not 403)', async () => {
    expect((await get('/admin-only')).status).toBe(401);
  });

  test('T-ADM-01: a regular user is refused (403 FORBIDDEN) on an admin-only route', async () => {
    const res = await get('/admin-only', regular);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('an administrator is allowed', async () => {
    const res = await get('/admin-only', admin);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  test('a recovery officer is allowed only where the route lists that role', async () => {
    expect((await get('/staff', officer)).status).toBe(200);
    expect((await get('/admin-only', officer)).status).toBe(403);
    expect((await get('/staff', regular)).status).toBe(403);
  });

  test('a role written inside the token is ignored: the role always comes from the database', async () => {
    const forged = jwt.sign({ role: 'admin' }, TEST_JWT_SECRET, {
      algorithm: 'HS256',
      issuer: 'findit-api',
      subject: String(regular._id),
      expiresIn: '1h',
    });
    const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(403);
  });

  test('changing a role takes effect on the very next request, with the same token', async () => {
    const person = (await createUserDirectly({ role: 'admin' })).user;
    expect((await get('/admin-only', person)).status).toBe(200);
    await User.updateOne({ _id: person._id }, { role: 'user' });
    expect((await get('/admin-only', person)).status).toBe(403);
  });

  test('a suspended administrator is refused everywhere (403 ACCOUNT_SUSPENDED)', async () => {
    const person = (await createUserDirectly({ role: 'admin', accountStatus: 'SUSPENDED' })).user;
    const res = await get('/admin-only', person);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});
