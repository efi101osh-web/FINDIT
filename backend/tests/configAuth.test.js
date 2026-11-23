'use strict';

// Tests for the authentication-related settings (token key, token lifetime, password
// hashing strength, allowed email domains).

const util = require('util');
const { loadConfig } = require('../src/config/env');

const SECRET = 'k3y-'.repeat(12); // 48 characters

describe('JWT_SECRET (a secret)', () => {
  test('is optional to load (the server itself refuses to start without it) and readable when set', () => {
    expect(loadConfig({}).jwtSecret).toBeUndefined();
    expect(loadConfig({ JWT_SECRET: SECRET }).jwtSecret).toBe(SECRET);
  });

  test('refuses a short secret, with a message that points to the generator and never shows the value', () => {
    let message = '';
    try {
      loadConfig({ JWT_SECRET: 'short-secret-value' });
    } catch (err) {
      message = err.message;
    }
    expect(message).toMatch(/at least 32 characters/);
    expect(message).toMatch(/npm run make:secret/);
    expect(message).not.toContain('short-secret-value');
  });

  test('refuses obvious placeholders even when long enough', () => {
    expect(() => loadConfig({ JWT_SECRET: 'changeme'.padEnd(40, 'x') })).toThrow(/placeholder/);
    expect(() => loadConfig({ JWT_SECRET: 'your-secret-goes-here-and-it-is-long' })).toThrow(/placeholder/);
  });

  test('cannot leak by printing or serialising the whole config', () => {
    const cfg = loadConfig({ JWT_SECRET: SECRET });
    expect(JSON.stringify(cfg)).not.toContain(SECRET);
    expect(util.inspect(cfg)).not.toContain(SECRET);
    expect(Object.keys(cfg)).not.toContain('jwtSecret');
  });
});

describe('JWT_EXPIRES_IN', () => {
  test('defaults to 7d and accepts minutes, hours and days', () => {
    expect(loadConfig({}).jwtExpiresIn).toBe('7d');
    for (const v of ['15m', '12h', '30d']) expect(loadConfig({ JWT_EXPIRES_IN: v }).jwtExpiresIn).toBe(v);
  });

  test.each(['31d', '0d', '7', 'abc', '1w', '999999d', '720h1', '44641m'])('refuses "%s"', (v) => {
    expect(() => loadConfig({ JWT_EXPIRES_IN: v })).toThrow(/JWT_EXPIRES_IN/);
  });
});

describe('BCRYPT_ROUNDS', () => {
  test('defaults to 12', () => {
    expect(loadConfig({}).bcryptRounds).toBe(12);
  });

  test('accepts 4 to 15, refuses anything else', () => {
    expect(loadConfig({ BCRYPT_ROUNDS: '4' }).bcryptRounds).toBe(4);
    expect(loadConfig({ BCRYPT_ROUNDS: '15' }).bcryptRounds).toBe(15);
    for (const v of ['3', '16', 'abc', '12.5', '-1']) {
      expect(() => loadConfig({ BCRYPT_ROUNDS: v })).toThrow(/BCRYPT_ROUNDS/);
    }
  });

  test('production refuses a weak setting but development and test allow it', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', BCRYPT_ROUNDS: '9' })).toThrow(/too weak for production/);
    expect(loadConfig({ NODE_ENV: 'production', BCRYPT_ROUNDS: '10' }).bcryptRounds).toBe(10);
    expect(loadConfig({ NODE_ENV: 'test', BCRYPT_ROUNDS: '4' }).bcryptRounds).toBe(4);
  });
});

describe('ALLOWED_EMAIL_DOMAINS', () => {
  test('defaults to "anyone may register" (an empty list)', () => {
    expect(loadConfig({}).allowedEmailDomains).toEqual([]);
  });

  test('parses a list, trims, lower-cases and forgives a leading @', () => {
    expect(loadConfig({ ALLOWED_EMAIL_DOMAINS: ' @University.edu, mail.example.org ,, ' }).allowedEmailDomains).toEqual([
      'university.edu',
      'mail.example.org',
    ]);
  });

  test.each(['not a domain', 'localhost', 'a..b.com', '-bad.com', 'university'])('refuses "%s"', (v) => {
    expect(() => loadConfig({ ALLOWED_EMAIL_DOMAINS: v })).toThrow(/ALLOWED_EMAIL_DOMAINS/);
  });
});

describe('rate limit settings', () => {
  test('are optional: nothing set means "use the built-in defaults"', () => {
    expect(loadConfig({}).rateLimits).toEqual({});
  });

  test('can be tuned from the environment', () => {
    expect(
      loadConfig({ RATE_LIMIT_GLOBAL_MAX: '900', RATE_LIMIT_LOGIN_FAILURES: '5', RATE_LIMIT_REGISTER_MAX: ' 50 ' }).rateLimits
    ).toEqual({ globalMax: 900, loginFailuresMax: 5, registerMax: 50 });
  });

  test.each([
    ['RATE_LIMIT_GLOBAL_MAX', '0'],
    ['RATE_LIMIT_LOGIN_FAILURES', 'many'],
    ['RATE_LIMIT_REGISTER_MAX', '1.5'],
    ['RATE_LIMIT_GLOBAL_MAX', '1000001'],
    ['RATE_LIMIT_LOGIN_FAILURES', '-3'],
  ])('refuses %s=%s', (name, value) => {
    expect(() => loadConfig({ [name]: value })).toThrow(new RegExp(name));
  });

  test('the settings object cannot be changed afterwards', () => {
    expect(Object.isFrozen(loadConfig({ RATE_LIMIT_GLOBAL_MAX: '5' }).rateLimits)).toBe(true);
  });
});
