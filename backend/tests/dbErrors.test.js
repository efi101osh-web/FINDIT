'use strict';

// Tests for turning database errors into plain English, and for never leaking the password.
// None of these need a running database (one uses a deliberately closed port).

const {
  connectDatabase,
  disconnectDatabase,
  getDatabaseState,
  describeConnectionError,
  redactSecrets,
  secretsFromUri,
} = require('../src/config/db');

const URI = 'mongodb+srv://alice:Sup3rSecretPw@cluster0.example.mongodb.net/?retryWrites=true&w=majority';

describe('describeConnectionError', () => {
  test('wrong username or password', () => {
    const err = Object.assign(new Error('bad auth : Authentication failed.'), { code: 18 });
    const text = describeConnectionError(err, URI);
    expect(text).toMatch(/username or password/i);
    expect(text).toMatch(/Database Access/);
  });

  test('password with unencoded special characters', () => {
    const text = describeConnectionError(new Error('Password contains unescaped characters'), URI);
    expect(text).toMatch(/special characters/i);
    expect(text).toMatch(/letters and digits/i);
  });

  test('database address not found (DNS)', () => {
    const text = describeConnectionError(new Error('querySrv ENOTFOUND _mongodb._tcp.cluster0.example.mongodb.net'), URI);
    expect(text).toMatch(/address could not be found/i);
  });

  test('server did not answer: points at the Atlas Network Access list first', () => {
    const err = new Error('Server selection timed out after 10000 ms');
    err.name = 'MongooseServerSelectionError';
    const text = describeConnectionError(err, URI);
    expect(text).toMatch(/did not answer in time/i);
    expect(text).toMatch(/Network Access/);
    expect(text).toMatch(/IP address/);
    expect(text).toMatch(/MONGODB_TIMEOUT_MS=30000/); // the hint for slow or mobile connections
  });

  test('anything else falls back to a generic message that still shows the (redacted) detail', () => {
    const text = describeConnectionError(new Error('something odd'), URI);
    expect(text).toMatch(/unexpected database error/i);
    expect(text).toContain('something odd');
  });

  test('never contains the password, the username or the full address, even if the driver put them in its message', () => {
    const noisy = new Error(`Failed connecting to ${URI} using password Sup3rSecretPw for alice`);
    const text = describeConnectionError(noisy, URI);
    expect(text).not.toContain('Sup3rSecretPw');
    expect(text).not.toContain('alice');
    expect(text).not.toContain(URI);
    expect(text).toContain('***');
  });

  test('never prints "[object Object]" when the driver supplies a structured reason', () => {
    const err = Object.assign(new Error('Server selection timed out'), {
      name: 'MongooseServerSelectionError',
      reason: { type: 'Unknown', servers: new Map() },
    });
    expect(describeConnectionError(err, URI)).not.toContain('[object Object]');
  });

  test('also hides a URL-encoded password in both its encoded and decoded form', () => {
    const uri = 'mongodb+srv://bob:p%40ss%23word1@cluster0.example.mongodb.net/';
    const noisy = new Error('auth failed for p@ss#word1 and p%40ss%23word1');
    const text = describeConnectionError(noisy, uri);
    expect(text).not.toContain('p@ss#word1');
    expect(text).not.toContain('p%40ss%23word1');
  });
});

describe('redactSecrets / secretsFromUri', () => {
  test('hides the credentials of any connection string found in text', () => {
    const out = redactSecrets('error at mongodb://user:hunter2@host:27017/db and mongodb+srv://a:b@c/d');
    expect(out).not.toContain('hunter2');
    expect(out).toContain('mongodb://***@host:27017/db');
  });

  test('extracts the secrets from a URI, and nothing from a URI without credentials', () => {
    expect(secretsFromUri(URI)).toEqual(expect.arrayContaining(['Sup3rSecretPw', 'alice']));
    expect(secretsFromUri('mongodb://127.0.0.1:27017')).toEqual([]);
  });
});

describe('a real failed connection', () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  test('T-DB-01: connecting to a port where nothing listens fails fast with a friendly message', async () => {
    const uri = 'mongodb://127.0.0.1:1/'; // port 1: nothing is listening
    const started = Date.now();

    let caught;
    try {
      await connectDatabase({ uri, dbName: 'findit', serverSelectionTimeoutMS: 600 });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(Date.now() - started).toBeLessThan(5000); // did not hang
    expect(getDatabaseState()).toBe('disconnected');
    const text = describeConnectionError(caught, uri);
    expect(text).toMatch(/did not answer in time/i);
    expect(text).not.toContain('[object Object]');
  });
});
