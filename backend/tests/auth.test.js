'use strict';

// Registration, login and token checks, against a REAL MongoDB (run with `npm run test:db`).
// Test IDs refer to documentation/TEST_PLAN.md.

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { makeTestApp, TEST_JWT_SECRET } = require('./helpers/testConfig');
const { describeWithDatabase, connectTestDatabase, cleanUpTestDatabase } = require('./helpers/database');
const { PASSWORD, uniqueEmail, registerViaApi, createUserDirectly, loginViaApi } = require('./helpers/users');

const app = makeTestApp();
const rawUsers = () => mongoose.connection.collection('users');

describeWithDatabase('registration', () => {
  beforeAll(connectTestDatabase);
  afterAll(cleanUpTestDatabase);

  test('T-AUTH-01: a valid sign-up returns 201, the user, and a login token, and no password hash', async () => {
    const { res } = await registerViaApi(app, { fullName: '  Amina Yusuf ', email: '  Amina1@Example.COM ', phoneNumber: '+234 801 234 5678' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const { user, token, expiresIn } = res.body.data;
    expect(user).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{24}$/),
      fullName: 'Amina Yusuf',
      email: 'amina1@example.com',
      role: 'user',
      phoneNumber: '+234 801 234 5678',
      profileImage: null,
      contactPreference: 'IN_APP',
      accountStatus: 'ACTIVE',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(token.split('.')).toHaveLength(3);
    expect(expiresIn).toBe('7d');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  test('T-AUTH-10: the database stores a bcrypt hash made with the configured strength, never the password', async () => {
    const { body } = await registerViaApi(app);
    const stored = await rawUsers().findOne({ email: body.email });

    expect(stored.passwordHash).toMatch(/^\$2[aby]\$04\$/); // bcrypt, cost 4 (the test setting)
    expect(stored.passwordHash).toHaveLength(60);
    expect(stored.passwordHash).not.toContain(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, stored.passwordHash)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain(PASSWORD);
  });

  test('a normal query never returns the password hash (select: false)', async () => {
    const { body } = await registerViaApi(app);
    const found = await User.findOne({ email: body.email });
    expect(found.passwordHash).toBeUndefined();
    expect(found.toObject()).not.toHaveProperty('passwordHash');
  });

  test('T-AUTH-02: the same email again (even in different letter case) is a 409 CONFLICT, and only one account exists', async () => {
    const email = uniqueEmail('dup');
    expect((await registerViaApi(app, { email })).res.status).toBe(201);

    const second = await registerViaApi(app, { email: email.toUpperCase() });
    expect(second.res.status).toBe(409);
    expect(second.res.body.error.code).toBe('CONFLICT');
    expect(second.res.body.error.details[0].field).toBe('email');
    expect(await User.countDocuments({ email })).toBe(1);
  });

  test('T-AUTH-12: five sign-ups with the same email at the SAME moment: exactly one wins (the database enforces uniqueness)', async () => {
    const email = uniqueEmail('race');
    const results = await Promise.all(Array.from({ length: 5 }, () => registerViaApi(app, { email })));
    const statuses = results.map((r) => r.res.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    expect(await User.countDocuments({ email })).toBe(1);
  });

  test('T-AUTH-04: "role" in the body is refused and creates no account; accounts are always plain users', async () => {
    const email = uniqueEmail('sneaky');
    const { res } = await registerViaApi(app, { email, role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.find((d) => d.field === 'role')).toBeDefined();
    expect(await User.countDocuments({ email })).toBe(0);

    const ok = await registerViaApi(app);
    expect((await rawUsers().findOne({ email: ok.body.email })).role).toBe('user');
  });

  test('T-AUTH-03: a weak password is a 400 naming the password field, and creates no account', async () => {
    const email = uniqueEmail('weak');
    const { res } = await registerViaApi(app, { email, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
    expect(await User.countDocuments({ email })).toBe(0);
  });

  test('injection attempt: an object where the email should be is refused, not run as a query', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ fullName: 'Ab', email: { $ne: null }, password: PASSWORD });
    expect(res.status).toBe(400);
  });

  test('optional campus-email restriction: only listed domains may register', async () => {
    const restricted = makeTestApp({ ALLOWED_EMAIL_DOMAINS: 'uni.edu' });
    const bad = await registerViaApi(restricted, { email: uniqueEmail('x').replace('example.com', 'gmail.com') });
    expect(bad.res.status).toBe(400);
    expect(bad.res.body.error.details[0].field).toBe('email');
    expect(bad.res.body.error.details[0].message).toMatch(/uni\.edu/);

    const good = await registerViaApi(restricted, { email: uniqueEmail('y').replace('example.com', 'UNI.EDU') });
    expect(good.res.status).toBe(201);
  });
});

describeWithDatabase('login', () => {
  beforeAll(connectTestDatabase);
  afterAll(cleanUpTestDatabase);

  test('T-AUTH-05: correct credentials return 200, the user and a token that identifies that user', async () => {
    const { body, data } = await registerViaApi(app);
    const res = await loginViaApi(app, body.email);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(data.user.id);
    const decoded = jwt.verify(res.body.data.token, TEST_JWT_SECRET, { algorithms: ['HS256'] });
    expect(decoded.sub).toBe(data.user.id);
    expect(decoded.iss).toBe('findit-api');
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 3600);
    expect(decoded.role).toBeUndefined(); // the role is NOT in the token
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  test('the email is matched ignoring case and surrounding spaces', async () => {
    const { body } = await registerViaApi(app);
    expect((await loginViaApi(app, `  ${body.email.toUpperCase()}  `)).status).toBe(200);
  });

  test('T-AUTH-06: a wrong password and an unknown email get the IDENTICAL reply', async () => {
    const { body } = await registerViaApi(app);
    const wrongPassword = await loginViaApi(app, body.email, 'WrongPassword9');
    const unknownEmail = await loginViaApi(app, uniqueEmail('ghost'), 'WrongPassword9');

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('T-AUTH-14: an unknown email still costs a full password check, so response time does not reveal which emails exist', async () => {
    const { body } = await registerViaApi(app);
    const spy = jest.spyOn(bcrypt, 'compare');
    try {
      await loginViaApi(app, body.email, 'WrongPassword9');
      const callsForRealUser = spy.mock.calls.length;
      spy.mockClear();
      await loginViaApi(app, uniqueEmail('ghost'), 'WrongPassword9');
      expect(callsForRealUser).toBe(1);
      expect(spy.mock.calls.length).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  test('T-AUTH-07: a suspended account with the right password gets 403 ACCOUNT_SUSPENDED and no token', async () => {
    const { email, password } = await createUserDirectly({ accountStatus: 'SUSPENDED' });
    const res = await loginViaApi(app, email, password);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    expect(res.body.data).toBeUndefined();
  });

  test('a suspended account with a WRONG password gets the normal 401 (suspension is not revealed to guessers)', async () => {
    const { email } = await createUserDirectly({ accountStatus: 'SUSPENDED' });
    const res = await loginViaApi(app, email, 'WrongPassword9');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('injection attempts in the login form are refused (400), never run as queries', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
    expect(res.body.data).toBeUndefined();
  });
});

describeWithDatabase('tokens on protected routes (GET /auth/me)', () => {
  let user;
  beforeAll(async () => {
    await connectTestDatabase();
    user = await createUserDirectly({});
  });
  afterAll(cleanUpTestDatabase);

  const sign = (payload = {}, options = {}, secret = TEST_JWT_SECRET) =>
    jwt.sign(payload, secret, { algorithm: 'HS256', issuer: 'findit-api', subject: String(user.user._id), expiresIn: '1h', ...options });
  const me = (authorization) => {
    const req = request(app).get('/api/v1/auth/me');
    return authorization === undefined ? req : req.set('Authorization', authorization);
  };

  test('a valid token returns the current user', async () => {
    const res = await me(`Bearer ${sign()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  test('the same endpoint under /users/me gives the same user', async () => {
    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${sign()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(String(user.user._id));
  });

  test.each([
    ['no Authorization header', undefined],
    ['wrong scheme', 'Basic abc'],
    ['no token after Bearer', 'Bearer '],
    ['not a token at all', 'Bearer not.a.token'],
    ['three words', 'Bearer a b'],
  ])('T-AUTH-08: %s gives 401 UNAUTHENTICATED', async (label, header) => {
    const res = await me(header);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('an expired token gives 401 with a message saying it expired', async () => {
    const res = await me(`Bearer ${sign({}, { expiresIn: -10 })}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/expired/i);
  });

  test('T-AUTH-11: forged tokens are all refused: wrong key, "none" algorithm, other algorithm, wrong issuer, bad subject', async () => {
    const attempts = {
      'signed with a different key': sign({}, {}, 'a-completely-different-signing-key-1234567890'),
      'wrong issuer': sign({}, { issuer: 'someone-else' }),
      'subject is not an id': sign({}, { subject: 'admin' }),
      'no subject': jwt.sign({}, TEST_JWT_SECRET, { algorithm: 'HS256', issuer: 'findit-api', expiresIn: '1h' }),
      'HS512 instead of HS256': sign({}, { algorithm: 'HS512' }),
      // "alg: none": an unsigned token an attacker writes by hand
      'algorithm "none"': `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(
        JSON.stringify({ sub: String(user.user._id), iss: 'findit-api', exp: Math.floor(Date.now() / 1000) + 3600 })
      ).toString('base64url')}.`,
      'valid token with the signature cut off': sign().split('.').slice(0, 2).join('.') + '.',
    };
    for (const [label, token] of Object.entries(attempts)) {
      const res = await me(`Bearer ${token}`);
      expect([label, res.status]).toEqual([label, 401]);
    }
  });

  test('a validly signed token for an account that no longer exists is refused', async () => {
    const gone = await createUserDirectly({});
    const token = sign({}, { subject: String(gone.user._id) });
    await User.deleteOne({ _id: gone.user._id });
    expect((await me(`Bearer ${token}`)).status).toBe(401);
  });

  test('T-AUTH-09: suspending an account blocks its existing token on the very next request', async () => {
    const victim = await createUserDirectly({});
    const token = sign({}, { subject: String(victim.user._id) });
    expect((await me(`Bearer ${token}`)).status).toBe(200);

    await User.updateOne({ _id: victim.user._id }, { accountStatus: 'SUSPENDED' });
    const res = await me(`Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});
