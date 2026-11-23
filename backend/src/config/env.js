'use strict';

// Reads the app's settings from environment variables, checks them, and returns
// one frozen `config` object for the rest of the code to use.
//
// "Fail fast": if a setting is wrong the app refuses to start and says why,
// instead of failing in a confusing way later.
//
// During development the settings come from a file called `.env` in the backend
// folder (copied from `.env.example`). That file is private and never committed.
// Real environment variables, if set, always win over the file.
//
// IMPORTANT: `loadConfig` itself never reads any file. It only checks the values
// it is given. That keeps the automated tests completely independent of your
// private `.env` (so a test can never accidentally touch your real database).

const path = require('path');
const dotenv = require('dotenv');

const ALLOWED_ENVIRONMENTS = ['development', 'test', 'production'];
const DEFAULT_PORT = '4000';
const DEFAULT_DB_NAME = 'findit';
const DEFAULT_CORS_ORIGINS = 'http://localhost:5173'; // the admin dashboard's dev address (Vite)
const DEFAULT_JWT_EXPIRES_IN = '7d';
const MAX_JWT_LIFETIME_MINUTES = 30 * 24 * 60; // 30 days: tokens cannot be revoked, so keep them short-lived
const DEFAULT_BCRYPT_ROUNDS = 12;

/** Clean and check the MongoDB connection string. It is a SECRET: never put it in a message. */
function parseMongoUri(raw) {
  const uri = String(raw || '').trim();
  if (uri === '') return undefined;

  // The most common beginner slip: pasting the whole line ("MONGODB_URI=...") after the
  // "=", so the label appears twice. Say so plainly, without repeating the value (a secret).
  if (/^MONGODB_URI\s*=/i.test(uri)) {
    throw new Error(
      'Invalid MONGODB_URI. The value starts with "MONGODB_URI=" again. In backend/.env the label ' +
        'must appear only once, at the very start of the line: MONGODB_URI=mongodb://... ' +
        '(delete the second "MONGODB_URI=").'
    );
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error(
      'Invalid MONGODB_URI. It must start with "mongodb+srv://" or "mongodb://". Check the very ' +
        'beginning of the value in backend/.env: nothing may come before "mongodb".'
    );
  }
  if (/[<>]/.test(uri)) {
    throw new Error(
      'MONGODB_URI still contains a placeholder such as <db_password>. ' +
        'Replace the whole placeholder, including the < and > signs, with the real value.'
    );
  }
  if (/\s/.test(uri)) {
    throw new Error('Invalid MONGODB_URI. It must not contain spaces or line breaks.');
  }
  return uri;
}

/** The database name inside the cluster (Atlas holds many databases). */
function parseDbName(raw) {
  const name = String(raw || DEFAULT_DB_NAME).trim();
  if (!/^[A-Za-z0-9_-]{1,38}$/.test(name)) {
    throw new Error(
      `Invalid MONGODB_DB_NAME "${name}". Use 1 to 38 letters, digits, "_" or "-".`
    );
  }
  return name;
}

/**
 * Websites (browsers) allowed to call this API, as a list of origins like
 * "http://localhost:5173". Wildcards are refused on purpose.
 */
function parseCorsOrigins(raw) {
  const text = raw === undefined || String(raw).trim() === '' ? DEFAULT_CORS_ORIGINS : String(raw);
  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .map((item) => {
      if (item === '*') {
        throw new Error('Invalid CORS_ORIGINS. "*" (allow everyone) is not permitted. List each website.');
      }
      const origin = item.replace(/\/$/, '').toLowerCase(); // forgive one trailing slash
      if (!/^https?:\/\/[^/\s]+$/.test(origin)) {
        throw new Error(
          `Invalid CORS_ORIGINS entry "${item}". Use the form http://host:port with no path, e.g. http://localhost:5173.`
        );
      }
      return origin;
    });
}

/** The key that signs login tokens. A SECRET: never put it in a message. */
function parseJwtSecret(raw) {
  const secret = String(raw || '').trim();
  if (secret === '') return undefined;
  if (secret.length < 32) {
    throw new Error(
      'Invalid JWT_SECRET. It is too short: use at least 32 characters. ' +
        'Generate a strong one with: npm run make:secret'
    );
  }
  if (/^(change.?me|your.?secret|secret|password|example|placeholder)/i.test(secret)) {
    throw new Error(
      'Invalid JWT_SECRET. It looks like a placeholder. Generate a real random one with: npm run make:secret'
    );
  }
  return secret;
}

/** How long a login token stays valid, e.g. 15m, 12h, 7d (at most 30 days). */
function parseJwtExpiresIn(raw) {
  const value = String(raw || DEFAULT_JWT_EXPIRES_IN).trim();
  const match = /^([1-9]\d{0,3})([mhd])$/.exec(value);
  if (!match) {
    throw new Error(
      `Invalid JWT_EXPIRES_IN "${value}". Use a number and a unit: m (minutes), h (hours) or d (days), e.g. 15m, 12h, 7d.`
    );
  }
  const minutes = Number(match[1]) * { m: 1, h: 60, d: 1440 }[match[2]];
  if (minutes > MAX_JWT_LIFETIME_MINUTES) {
    throw new Error('Invalid JWT_EXPIRES_IN. Tokens cannot be revoked early, so the longest allowed is 30d.');
  }
  return value;
}

/** How slow password hashing is on purpose (higher = safer but slower). */
function parseBcryptRounds(raw, nodeEnv) {
  const text = String(raw === undefined || raw === '' ? DEFAULT_BCRYPT_ROUNDS : raw).trim();
  const rounds = Number(text);
  if (!/^\d+$/.test(text) || rounds < 4 || rounds > 15) {
    throw new Error(`Invalid BCRYPT_ROUNDS "${text}". Use a whole number from 4 to 15.`);
  }
  if (nodeEnv === 'production' && rounds < 10) {
    throw new Error('Invalid BCRYPT_ROUNDS. Values below 10 are too weak for production.');
  }
  return rounds;
}

/** Optional: only these email domains may register (e.g. your university's). Empty = any. */
function parseEmailDomains(raw) {
  const text = String(raw || '').trim();
  if (text === '') return [];
  return text
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/^@/, ''))
    .filter((item) => item !== '')
    .map((domain) => {
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
        throw new Error(
          `Invalid ALLOWED_EMAIL_DOMAINS entry "${domain}". Use domains like university.edu, separated by commas.`
        );
      }
      return domain;
    });
}

/** Optional overrides for the rate limits (see middleware/rateLimiters.js). Unset = built-in defaults. */
function parseRateLimits(env) {
  const names = {
    RATE_LIMIT_GLOBAL_MAX: 'globalMax',
    RATE_LIMIT_LOGIN_FAILURES: 'loginFailuresMax',
    RATE_LIMIT_REGISTER_MAX: 'registerMax',
  };
  const limits = {};
  for (const [variable, key] of Object.entries(names)) {
    const raw = env[variable];
    if (raw === undefined || String(raw).trim() === '') continue;
    const text = String(raw).trim();
    const value = Number(text);
    if (!/^\d+$/.test(text) || value < 1 || value > 1000000) {
      throw new Error(`Invalid ${variable} "${text}". Use a whole number from 1 to 1000000.`);
    }
    limits[key] = value;
  }
  return Object.freeze(limits);
}

/**
 * Turns raw environment values into a validated config object.
 * Takes `env` as a parameter so tests can try different values without
 * touching the real environment.
 */
function loadConfig(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || 'development').trim();
  if (!ALLOWED_ENVIRONMENTS.includes(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${nodeEnv}". Use one of: ${ALLOWED_ENVIRONMENTS.join(', ')}.`
    );
  }

  const rawPort = String(env.PORT || DEFAULT_PORT).trim();
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${rawPort}". Use a whole number from 1 to 65535.`);
  }

  const config = {
    nodeEnv,
    port,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    dbName: parseDbName(env.MONGODB_DB_NAME),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
    jwtExpiresIn: parseJwtExpiresIn(env.JWT_EXPIRES_IN),
    bcryptRounds: parseBcryptRounds(env.BCRYPT_ROUNDS, nodeEnv),
    allowedEmailDomains: parseEmailDomains(env.ALLOWED_EMAIL_DOMAINS),
    rateLimits: parseRateLimits(env),
  };

  // The connection string (database password) and the token-signing key are SECRETS.
  // They are stored as NON-enumerable properties so that accidentally printing or
  // JSON-ing the whole config object can never reveal them. You can still read
  // `config.mongodbUri` and `config.jwtSecret` directly.
  Object.defineProperty(config, 'mongodbUri', {
    value: parseMongoUri(env.MONGODB_URI),
    enumerable: false,
  });
  Object.defineProperty(config, 'jwtSecret', {
    value: parseJwtSecret(env.JWT_SECRET),
    enumerable: false,
  });

  return Object.freeze(config);
}

/** Used by the real server and scripts: load backend/.env (if present), then validate. */
function loadConfigFromProcess() {
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
  return loadConfig(process.env);
}

module.exports = { loadConfig, loadConfigFromProcess, DEFAULT_DB_NAME };
