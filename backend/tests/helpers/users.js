'use strict';

// Helpers for creating and logging in test users.

const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');

let counter = 0;
const uniqueEmail = (prefix = 'user') => `${prefix}${Date.now()}${counter++}@example.com`;

const PASSWORD = 'Sunrise2026';

/** Register through the real API. Returns the response body data plus the credentials used. */
async function registerViaApi(app, overrides = {}) {
  const body = { fullName: 'Test Person', email: uniqueEmail(), password: PASSWORD, ...overrides };
  const res = await request(app).post('/api/v1/auth/register').send(body);
  return { res, body, data: res.body.data, token: res.body.data && res.body.data.token };
}

/** Insert a user straight into the database (used for staff roles and suspended accounts). */
async function createUserDirectly({ role = 'user', accountStatus = 'ACTIVE', password = PASSWORD, email, fullName } = {}) {
  const passwordHash = await bcrypt.hash(password, 4);
  const user = await User.create({
    fullName: fullName || `Test ${role}`,
    email: email || uniqueEmail(role),
    passwordHash,
    role,
    accountStatus,
  });
  return { user, email: user.email, password };
}

async function loginViaApi(app, email, password = PASSWORD) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

module.exports = { PASSWORD, uniqueEmail, registerViaApi, createUserDirectly, loginViaApi };
