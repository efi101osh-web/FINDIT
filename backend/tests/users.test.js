'use strict';

// Profile and password management for the logged-in user (against a REAL MongoDB).
// Test IDs refer to documentation/TEST_PLAN.md.

const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { makeTestApp } = require('./helpers/testConfig');
const { describeWithDatabase, connectTestDatabase, cleanUpTestDatabase } = require('./helpers/database');
const { PASSWORD, registerViaApi, loginViaApi } = require('./helpers/users');

const app = makeTestApp();
const rawUsers = () => mongoose.connection.collection('users');
const patch = (path, token, body) => request(app).patch(`/api/v1/users/me${path}`).set('Authorization', `Bearer ${token}`).send(body);

describeWithDatabase('PATCH /users/me (profile)', () => {
  beforeAll(connectTestDatabase);
  afterAll(cleanUpTestDatabase);

  test('T-USR-01: updates the permitted fields and saves them', async () => {
    const { body, token, data } = await registerViaApi(app);
    await new Promise((r) => setTimeout(r, 15)); // so updatedAt visibly changes

    const res = await patch('', token, { fullName: '  Amina B. Yusuf ', phoneNumber: '+234 80 9999 9999', contactPreference: 'EMAIL' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      id: data.user.id,
      fullName: 'Amina B. Yusuf',
      phoneNumber: '+234 80 9999 9999',
      contactPreference: 'EMAIL',
      email: body.email,
      role: 'user',
    });
    const stored = await rawUsers().findOne({ email: body.email });
    expect(stored.fullName).toBe('Amina B. Yusuf');
    expect(stored.updatedAt.getTime()).toBeGreaterThan(stored.createdAt.getTime());
  });

  test('sending only one field changes only that field', async () => {
    const { token, data } = await registerViaApi(app, { fullName: 'Original Name', phoneNumber: '+234 801 234 5678' });
    const res = await patch('', token, { contactPreference: 'PHONE' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ fullName: 'Original Name', phoneNumber: '+234 801 234 5678', contactPreference: 'PHONE', id: data.user.id });
  });

  test('null clears the phone number (the field is removed from the database)', async () => {
    const { body, token } = await registerViaApi(app, { phoneNumber: '+234 801 234 5678' });
    const res = await patch('', token, { phoneNumber: null });
    expect(res.status).toBe(200);
    expect(res.body.data.user.phoneNumber).toBeNull();
    expect(await rawUsers().findOne({ email: body.email, phoneNumber: { $exists: true } })).toBeNull();
  });

  test('T-USR-02: email, role, account status and the hash cannot be changed here, and nothing is changed', async () => {
    const { body, token } = await registerViaApi(app);
    for (const attempt of [
      { email: 'hijack@example.com' },
      { role: 'admin' },
      { accountStatus: 'SUSPENDED' },
      { passwordHash: 'x' },
      { fullName: 'Valid Name', role: 'admin' }, // a valid change with a forbidden extra
    ]) {
      const res = await patch('', token, attempt);
      expect([JSON.stringify(attempt), res.status]).toEqual([JSON.stringify(attempt), 400]);
    }
    const stored = await rawUsers().findOne({ email: body.email });
    expect(stored.role).toBe('user');
    expect(stored.accountStatus).toBe('ACTIVE');
    expect(stored.fullName).toBe('Test Person'); // even the valid part of the mixed request was not applied
  });

  test('an empty update and invalid values are 400s', async () => {
    const { token } = await registerViaApi(app);
    expect((await patch('', token, {})).status).toBe(400);
    expect((await patch('', token, { fullName: 'A' })).status).toBe(400);
    expect((await patch('', token, { contactPreference: 'PIGEON' })).status).toBe(400);
  });

  test('without a login it is a 401, even when the body is also invalid (login is checked first)', async () => {
    const res = await request(app).patch('/api/v1/users/me').send({ role: 'admin' });
    expect(res.status).toBe(401);
  });
});

describeWithDatabase('PATCH /users/me/password', () => {
  beforeAll(connectTestDatabase);
  afterAll(cleanUpTestDatabase);

  test('T-USR-03: with the right current password it works: the new one logs in, the old one does not, and the hash changed', async () => {
    const { body, token } = await registerViaApi(app);
    const before = (await rawUsers().findOne({ email: body.email })).passwordHash;

    const res = await patch('/password', token, { currentPassword: PASSWORD, newPassword: 'Moonrise2027' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ message: 'Password updated.' });

    expect((await loginViaApi(app, body.email, 'Moonrise2027')).status).toBe(200);
    expect((await loginViaApi(app, body.email, PASSWORD)).status).toBe(401);
    const after = (await rawUsers().findOne({ email: body.email })).passwordHash;
    expect(after).not.toBe(before);
    expect(after).toMatch(/^\$2[aby]\$/);
  });

  test('T-USR-04: a wrong current password is a 400 on "currentPassword" (not a 401), and the password is unchanged', async () => {
    const { body, token } = await registerViaApi(app);
    const res = await patch('/password', token, { currentPassword: 'WrongPassword9', newPassword: 'Moonrise2027' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('currentPassword');
    expect((await loginViaApi(app, body.email, PASSWORD)).status).toBe(200);
  });

  test('a weak new password, an unchanged password and extra fields are all 400', async () => {
    const { token } = await registerViaApi(app);
    expect((await patch('/password', token, { currentPassword: PASSWORD, newPassword: 'weak' })).status).toBe(400);
    expect((await patch('/password', token, { currentPassword: PASSWORD, newPassword: PASSWORD })).status).toBe(400);
    expect((await patch('/password', token, { currentPassword: PASSWORD, newPassword: 'Moonrise2027', role: 'admin' })).status).toBe(400);
  });

  test('T-USR-05: KNOWN LIMITATION (documented): an existing token keeps working after a password change until it expires', async () => {
    const { token } = await registerViaApi(app);
    await patch('/password', token, { currentPassword: PASSWORD, newPassword: 'Moonrise2027' });
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200); // see documentation/SECURITY_PLAN.md section 4, accepted risk 1
  });

  test('a suspended user cannot change a password', async () => {
    const { body, token } = await registerViaApi(app);
    await User.updateOne({ email: body.email }, { accountStatus: 'SUSPENDED' });
    expect((await patch('/password', token, { currentPassword: PASSWORD, newPassword: 'Moonrise2027' })).status).toBe(403);
  });
});
