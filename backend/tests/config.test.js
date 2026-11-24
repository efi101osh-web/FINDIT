'use strict';

// Tests that the settings loader accepts good values and refuses bad ones ("fail fast"),
// and that the database password can never leak by accident.

const util = require('util');
const { loadConfig } = require('../src/config/env');

const SECRET_URI = 'mongodb+srv://alice:Sup3rSecretPw@cluster0.example.mongodb.net/?retryWrites=true&w=majority';

describe('loadConfig: basics', () => {
  test('uses safe defaults when nothing is set', () => {
    const cfg = loadConfig({});
    expect(cfg.nodeEnv).toBe('development');
    expect(cfg.port).toBe(4000);
    expect(cfg.isProduction).toBe(false);
    expect(cfg.isTest).toBe(false);
    expect(cfg.dbName).toBe('findit');
    expect(cfg.corsOrigins).toEqual(['http://localhost:5173']);
    expect(cfg.mongodbUri).toBeUndefined();
  });

  test('reads and trims PORT and NODE_ENV', () => {
    const cfg = loadConfig({ NODE_ENV: ' production ', PORT: ' 5050 ' });
    expect(cfg.nodeEnv).toBe('production');
    expect(cfg.port).toBe(5050);
    expect(cfg.isProduction).toBe(true);
  });

  test.each(['abc', '0', '70000', '3.5', '-1', '4000abc', '1e3'])(
    'refuses invalid PORT "%s"',
    (port) => {
      expect(() => loadConfig({ PORT: port })).toThrow(/Invalid PORT/);
    }
  );

  test('refuses an unknown NODE_ENV', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/Invalid NODE_ENV/);
  });

  test('returns a frozen object that cannot be changed by accident', () => {
    expect(Object.isFrozen(loadConfig({}))).toBe(true);
  });
});

describe('loadConfig: MONGODB_URI (a secret)', () => {
  test('accepts a valid Atlas-style and a plain local connection string', () => {
    expect(loadConfig({ MONGODB_URI: SECRET_URI }).mongodbUri).toBe(SECRET_URI);
    expect(loadConfig({ MONGODB_URI: ' mongodb://127.0.0.1:27017 ' }).mongodbUri).toBe('mongodb://127.0.0.1:27017');
  });

  test('treats an empty value as "not set"', () => {
    expect(loadConfig({ MONGODB_URI: '   ' }).mongodbUri).toBeUndefined();
  });

  test.each([
    ['no scheme', 'localhost:27017'],
    ['wrong scheme', 'http://example.com'],
    ['placeholder password left in', 'mongodb+srv://alice:<db_password>@cluster0.example.mongodb.net/'],
    ['contains a space', 'mongodb+srv://alice:pass word@cluster0.example.mongodb.net/'],
  ])('refuses a bad connection string: %s', (label, uri) => {
    expect(() => loadConfig({ MONGODB_URI: uri })).toThrow(/MONGODB_URI/);
  });

  test('recognises the "label pasted twice" slip and says exactly what to remove', () => {
    const doubled = 'MONGODB_URI=mongodb://alice:Sup3rSecretPw@ac-1.example.mongodb.net:27017/?ssl=true';
    let message = '';
    try {
      loadConfig({ MONGODB_URI: doubled });
    } catch (err) {
      message = err.message;
    }
    expect(message).toMatch(/starts with "MONGODB_URI=" again/);
    expect(message).toMatch(/delete the second/);
    expect(message).not.toContain('Sup3rSecretPw'); // never echoes the secret
    expect(message).not.toContain('example.mongodb.net');
  });

  test('a value with anything before "mongodb" is refused with a pointer to the start of the value', () => {
    expect(() => loadConfig({ MONGODB_URI: 'findit_app:abc@host/' })).toThrow(/very beginning/);
  });

  test('the error message never contains the secret it was given', () => {
    const bad = 'mongodb+srv://alice:Sup3rSecretPw@cluster0.example.mongodb.net/<oops>';
    let message = '';
    try {
      loadConfig({ MONGODB_URI: bad });
    } catch (err) {
      message = err.message;
    }
    expect(message).toMatch(/MONGODB_URI/);
    expect(message).not.toContain('Sup3rSecretPw');
    expect(message).not.toContain('alice');
  });

  test('the password cannot leak by printing or serialising the whole config', () => {
    const cfg = loadConfig({ MONGODB_URI: SECRET_URI });
    expect(cfg.mongodbUri).toBe(SECRET_URI); // still readable on purpose
    expect(JSON.stringify(cfg)).not.toContain('Sup3rSecretPw');
    expect(util.inspect(cfg)).not.toContain('Sup3rSecretPw');
    expect(Object.keys(cfg)).not.toContain('mongodbUri');
  });
});

describe('loadConfig: MONGODB_DB_NAME', () => {
  test.each(['findit', 'findit_dev', 'My-Db-2'])('accepts "%s"', (name) => {
    expect(loadConfig({ MONGODB_DB_NAME: name }).dbName).toBe(name);
  });

  test.each(['my db', 'a/b', 'db.name', 'x$y', 'a'.repeat(39)])('refuses "%s"', (name) => {
    expect(() => loadConfig({ MONGODB_DB_NAME: name })).toThrow(/Invalid MONGODB_DB_NAME/);
  });
});

describe('loadConfig: MONGODB_TIMEOUT_MS', () => {
  test('defaults to 10 seconds', () => {
    expect(loadConfig({}).dbTimeoutMs).toBe(10000);
    expect(loadConfig({ MONGODB_TIMEOUT_MS: '  ' }).dbTimeoutMs).toBe(10000);
  });

  test('can be raised for slow networks', () => {
    expect(loadConfig({ MONGODB_TIMEOUT_MS: '30000' }).dbTimeoutMs).toBe(30000);
    expect(loadConfig({ MONGODB_TIMEOUT_MS: ' 120000 ' }).dbTimeoutMs).toBe(120000);
  });

  test.each(['999', '120001', 'abc', '10.5', '-1', '30s'])('refuses "%s"', (v) => {
    expect(() => loadConfig({ MONGODB_TIMEOUT_MS: v })).toThrow(/MONGODB_TIMEOUT_MS/);
  });
});

describe('loadConfig: CORS_ORIGINS', () => {
  test('parses a comma-separated list, trims, lower-cases and drops one trailing slash', () => {
    const cfg = loadConfig({ CORS_ORIGINS: ' https://Dash.Example.com/ , http://localhost:5173,, ' });
    expect(cfg.corsOrigins).toEqual(['https://dash.example.com', 'http://localhost:5173']);
  });

  test('refuses "*" (allow everyone)', () => {
    expect(() => loadConfig({ CORS_ORIGINS: '*' })).toThrow(/not permitted/);
  });

  test.each(['localhost:5173', 'http://example.com/admin', 'ftp://example.com', 'http://exa mple.com'])(
    'refuses a malformed entry "%s"',
    (entry) => {
      expect(() => loadConfig({ CORS_ORIGINS: entry })).toThrow(/Invalid CORS_ORIGINS/);
    }
  );
});
