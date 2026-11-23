'use strict';

// The first-administrator seeding (against a REAL MongoDB).

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const createPasswordService = require('../src/services/passwordService');
const { seedAdmin } = require('../src/services/adminSeedService');
const { makeTestApp } = require('./helpers/testConfig');
const { describeWithDatabase, connectTestDatabase, cleanUpTestDatabase } = require('./helpers/database');
const { uniqueEmail, createUserDirectly, loginViaApi } = require('./helpers/users');

const passwords = createPasswordService({ rounds: 4 });
const app = makeTestApp();
const rawUsers = () => mongoose.connection.collection('users');

describeWithDatabase('seedAdmin', () => {
  beforeAll(connectTestDatabase);
  afterAll(cleanUpTestDatabase);

  test('T-AUTH-13: creates an administrator who can log in, with a bcrypt hash and no password stored', async () => {
    const email = uniqueEmail('boss');
    const { status, user } = await seedAdmin({ email, password: 'BossPass2026', fullName: 'Boss Person', passwords });

    expect(status).toBe('created');
    expect(user.role).toBe('admin');
    const stored = await rawUsers().findOne({ email });
    expect(stored.role).toBe('admin');
    expect(stored.accountStatus).toBe('ACTIVE');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$04\$/);
    expect(JSON.stringify(stored)).not.toContain('BossPass2026');

    const login = await loginViaApi(app, email, 'BossPass2026');
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('admin');
  });

  test('running it again is safe: nothing changes, and a different password does NOT reset the real one', async () => {
    const email = uniqueEmail('boss');
    await seedAdmin({ email, password: 'FirstPass2026', passwords });
    const before = (await rawUsers().findOne({ email })).passwordHash;

    const again = await seedAdmin({ email, password: 'SomethingElse9', passwords });
    expect(again.status).toBe('already_admin');
    expect((await rawUsers().findOne({ email })).passwordHash).toBe(before);
    expect((await loginViaApi(app, email, 'FirstPass2026')).status).toBe(200);
    expect(await User.countDocuments({ email })).toBe(1);
  });

  test('an existing REGULAR account is not touched unless --promote is given', async () => {
    const { email, password } = await createUserDirectly({ role: 'user' });
    const refused = await seedAdmin({ email, password: 'Whatever2026', passwords });
    expect(refused.status).toBe('exists_not_admin');
    expect((await rawUsers().findOne({ email })).role).toBe('user');

    const promoted = await seedAdmin({ email, password: 'Whatever2026', passwords, promote: true });
    expect(promoted.status).toBe('promoted');
    expect((await rawUsers().findOne({ email })).role).toBe('admin');
    // their own password still works: promotion never changes a password
    expect((await loginViaApi(app, email, password)).status).toBe(200);
    expect(await bcrypt.compare('Whatever2026', (await rawUsers().findOne({ email })).passwordHash)).toBe(false);
  });

  test('refuses a weak password, a bad email and a bad name, and creates nothing', async () => {
    const email = uniqueEmail('weakboss');
    await expect(seedAdmin({ email, password: 'weak', passwords })).rejects.toThrow(/SEED_ADMIN_PASSWORD/);
    await expect(seedAdmin({ email: 'not-an-email', password: 'BossPass2026', passwords })).rejects.toThrow(/SEED_ADMIN_EMAIL/);
    await expect(seedAdmin({ email, password: 'BossPass2026', fullName: 'A', passwords })).rejects.toThrow(/SEED_ADMIN_NAME/);
    expect(await User.countDocuments({ email })).toBe(0);
  });

  test('refuses placeholder text left over from the instructions, and creates nothing', async () => {
    const email = uniqueEmail('placeholder');
    await expect(
      seedAdmin({ email, password: '<a strong password: 8 or more characters with at least one letter and one number>', passwords })
    ).rejects.toThrow(/placeholder/);
    await expect(seedAdmin({ email: '<the email you will log in with>', password: 'BossPass2026', passwords })).rejects.toThrow(/placeholder/);
    await expect(seedAdmin({ email, password: 'BossPass2026', fullName: '<your name>', passwords })).rejects.toThrow(/placeholder/);
    expect(await User.countDocuments({ email })).toBe(0);
  });

  test('the error for a weak password does not repeat the password', async () => {
    let message = '';
    try {
      await seedAdmin({ email: uniqueEmail('x'), password: 'nodigitshere', passwords });
    } catch (err) {
      message = err.message;
    }
    expect(message).not.toContain('nodigitshere');
  });
});
