'use strict';

// Tests for the input rules (Zod schemas) and the validation checkpoint.
// No database needed. Test IDs refer to documentation/TEST_PLAN.md.

const request = require('supertest');
const express = require('express');
const { registerSchema, loginSchema } = require('../src/validators/authValidators');
const { updateProfileSchema, changePasswordSchema } = require('../src/validators/userValidators');
const validate = require('../src/middleware/validate');
const createErrorHandler = require('../src/middleware/errorHandler');
const { loadConfig } = require('../src/config/env');

const GOOD = { fullName: 'Amina Yusuf', email: 'amina@example.com', password: 'Sunrise2026' };
const issuesOf = (result) => result.error.issues.map((i) => `${i.code}:${i.path.join('.')}`);

describe('registerSchema', () => {
  test('accepts a valid sign-up and cleans it (trim, lower-case the email)', () => {
    const result = registerSchema.safeParse({
      fullName: '  Amina Yusuf  ',
      email: '  Amina@Example.COM ',
      password: 'Sunrise2026',
      phoneNumber: ' +234 801 234 5678 ',
      contactPreference: 'EMAIL',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      fullName: 'Amina Yusuf',
      email: 'amina@example.com',
      password: 'Sunrise2026',
      phoneNumber: '+234 801 234 5678',
      contactPreference: 'EMAIL',
    });
  });

  test('the password is never trimmed or altered', () => {
    expect(registerSchema.parse({ ...GOOD, password: '  Pass 1234  ' }).password).toBe('  Pass 1234  ');
  });

  test.each([
    ['too short', 'Ab1'],
    ['no number', 'OnlyLettersHere'],
    ['no letter', '1234567890'],
    ['73 characters (over the 72 limit)', `a1${'x'.repeat(71)}`],
    ['under 72 characters but over 72 BYTES', `a1${'€'.repeat(24)}`], // 26 characters, 74 bytes
  ])('T-AUTH-03: refuses a weak or too-long password: %s', (label, password) => {
    expect(registerSchema.safeParse({ ...GOOD, password }).success).toBe(false);
  });

  test('accepts a password of exactly 72 bytes', () => {
    expect(registerSchema.safeParse({ ...GOOD, password: `a1${'€'.repeat(23)}` }).success).toBe(true); // 2 + 69 = 71
    expect(registerSchema.safeParse({ ...GOOD, password: `a1${'x'.repeat(70)}` }).success).toBe(true); // exactly 72
  });

  test.each(['not-an-email', 'a@b', '', 'x'.repeat(250) + '@example.com'])('refuses the email %j', (email) => {
    expect(registerSchema.safeParse({ ...GOOD, email }).success).toBe(false);
  });

  test('T-AUTH-04: refuses every field the form is not supposed to send (role, status, hash, ...)', () => {
    for (const extra of [{ role: 'admin' }, { accountStatus: 'ACTIVE' }, { passwordHash: 'x' }, { isAdmin: true }, { _id: '1' }]) {
      const result = registerSchema.safeParse({ ...GOOD, ...extra });
      expect(result.success).toBe(false);
      expect(issuesOf(result)).toContain('unrecognized_keys:');
    }
  });

  test('T-SRC-06: refuses objects and arrays where text is expected (injection attempts)', () => {
    expect(registerSchema.safeParse({ ...GOOD, email: { $ne: null } }).success).toBe(false);
    expect(registerSchema.safeParse({ ...GOOD, password: { $gt: '' } }).success).toBe(false);
    expect(registerSchema.safeParse({ ...GOOD, fullName: ['a', 'b'] }).success).toBe(false);
    expect(registerSchema.safeParse({ ...GOOD, fullName: 12345 }).success).toBe(false);
  });

  test('refuses names with control characters, too short or too long', () => {
    for (const fullName of ['A', 'x'.repeat(81), 'Bad\u0000Name', 'Bad\nName']) {
      expect(registerSchema.safeParse({ ...GOOD, fullName }).success).toBe(false);
    }
  });

  test.each(['abc', '12345', '1'.repeat(21), '<script>'])('refuses the phone number %j', (phoneNumber) => {
    expect(registerSchema.safeParse({ ...GOOD, phoneNumber }).success).toBe(false);
  });

  test('refuses an unknown contact preference', () => {
    expect(registerSchema.safeParse({ ...GOOD, contactPreference: 'PIGEON' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  test('accepts email + password, and does not apply strength rules to an existing password', () => {
    expect(loginSchema.safeParse({ email: ' A@B.com ', password: '1' }).data).toEqual({ email: 'a@b.com', password: '1' });
  });

  test('refuses extra fields, an empty password, a gigantic password and object values', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x', role: 'admin' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(201) }).success).toBe(false);
    expect(loginSchema.safeParse({ email: { $ne: null }, password: { $ne: null } }).success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  test('accepts any of the permitted fields, and null to clear the phone number', () => {
    expect(updateProfileSchema.safeParse({ fullName: 'New Name' }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ phoneNumber: null }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ contactPreference: 'PHONE' }).success).toBe(true);
  });

  test('T-USR-02: refuses email, role, account status and anything else not listed', () => {
    for (const extra of [{ email: 'x@y.com' }, { role: 'admin' }, { accountStatus: 'SUSPENDED' }, { passwordHash: 'x' }, { profileImage: null }]) {
      expect(updateProfileSchema.safeParse({ fullName: 'Ok Name', ...extra }).success).toBe(false);
    }
  });

  test('refuses an empty update', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  test('accepts a valid change', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'Old12345', newPassword: 'New12345' }).success).toBe(true);
  });

  test('refuses a weak new password, the same password, and extra fields', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'Old12345', newPassword: 'weak' }).success).toBe(false);
    const same = changePasswordSchema.safeParse({ currentPassword: 'Same1234', newPassword: 'Same1234' });
    expect(same.success).toBe(false);
    expect(same.error.issues[0].path).toEqual(['newPassword']);
    expect(changePasswordSchema.safeParse({ currentPassword: 'a', newPassword: 'New12345', role: 'admin' }).success).toBe(false);
  });
});

describe('validate() middleware', () => {
  const app = express();
  app.use(express.json());
  app.post('/echo', validate({ body: registerSchema }), (req, res) => res.json({ got: req.valid.body }));
  app.use(createErrorHandler(loadConfig({ NODE_ENV: 'test' })));

  test('passes cleaned data to the controller in req.valid.body', async () => {
    const res = await request(app).post('/echo').send({ ...GOOD, email: ' AMINA@Example.com ' });
    expect(res.status).toBe(200);
    expect(res.body.got.email).toBe('amina@example.com');
  });

  test('replies 400 VALIDATION_ERROR with one entry per problem field', async () => {
    const res = await request(app).post('/echo').send({ fullName: 'A', email: 'nope', password: 'x', role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'email', 'password', 'role']));
    expect(res.body.error.details.find((d) => d.field === 'role').message).toBe('This field is not accepted.');
  });

  test('a request with no body at all is a validation error, not a crash', async () => {
    const res = await request(app).post('/echo');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
