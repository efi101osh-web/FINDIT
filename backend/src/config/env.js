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
  };

  // The connection string holds the database password. It is stored as a
  // NON-enumerable property so that accidentally printing or JSON-ing the whole
  // config object can never reveal it. You can still read `config.mongodbUri`.
  Object.defineProperty(config, 'mongodbUri', {
    value: parseMongoUri(env.MONGODB_URI),
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
