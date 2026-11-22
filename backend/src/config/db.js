'use strict';

// Everything about talking to MongoDB lives here: connecting, disconnecting,
// reporting the connection state, and turning scary driver errors into plain English.
//
// Terms: MongoDB is the database. Mongoose is the library that lets our code use it.
// MongoDB Atlas is the free cloud service that hosts our MongoDB.

const mongoose = require('mongoose');

const DEFAULT_TIMEOUT_MS = 10000;

/** 'connected' or 'disconnected'. Used by the health check. */
function getDatabaseState() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

/**
 * Connect to MongoDB. Rejects if it cannot connect within `serverSelectionTimeoutMS`
 * (instead of waiting a very long time).
 *
 * `driverOptions` is for tests only (see tests/helpers/database.js). The real server
 * never passes it.
 */
async function connectDatabase({
  uri,
  dbName,
  serverSelectionTimeoutMS = DEFAULT_TIMEOUT_MS,
  driverOptions = {},
}) {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS, ...driverOptions });
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

/**
 * Print a short message if the connection drops or comes back while the server runs.
 * Returns a function that switches the messages off (used before a deliberate shutdown,
 * so we do not claim the connection was "lost" when we closed it ourselves).
 */
function attachConnectionLogging(logger = console) {
  const onDisconnected = () => logger.warn('Database connection lost. Trying to reconnect...');
  const onReconnected = () => logger.log('Database connection restored.');
  mongoose.connection.on('disconnected', onDisconnected);
  mongoose.connection.on('reconnected', onReconnected);
  return function detach() {
    mongoose.connection.off('disconnected', onDisconnected);
    mongoose.connection.off('reconnected', onReconnected);
  };
}

/** Ask the database a harmless question to prove it works. Read-only. Used by `npm run check:db`. */
async function inspectDatabase() {
  const admin = mongoose.connection.db.admin();
  await admin.ping();
  const info = await admin.serverInfo();
  return {
    host: mongoose.connection.host,
    databaseName: mongoose.connection.name,
    serverVersion: info.version,
  };
}

/**
 * Remove anything secret from a piece of text before it is shown to a human.
 * Replaces the password part of any connection string, plus any extra secrets given.
 */
function redactSecrets(text, extraSecrets = []) {
  let out = String(text);
  out = out.replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, '$1***@');
  for (const secret of extraSecrets) {
    if (secret && String(secret).length >= 4) {
      out = out.split(String(secret)).join('***');
    }
  }
  return out;
}

/** Pull the username and password out of a connection string, so they can be redacted. */
function secretsFromUri(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/([^:@/]+):([^@]+)@/i.exec(String(uri || ''));
  if (!match) return [];
  const [, user, pass] = match;
  const decoded = (() => {
    try {
      return decodeURIComponent(pass);
    } catch {
      return pass;
    }
  })();
  return [pass, decoded, user];
}

/**
 * Turn a connection error into a short, plain-English explanation of what is
 * probably wrong and what to check. Never includes the password or the full address.
 */
function describeConnectionError(err, uri) {
  const secrets = [uri, ...secretsFromUri(uri)];
  // `err.reason` is sometimes a text and sometimes an object; only use it when it is text.
  const reasonText = err && typeof err.reason === 'string' ? err.reason : '';
  const raw = `${err && err.message ? err.message : err} ${reasonText}`;
  const message = redactSecrets(raw, secrets).trim();

  let reason;
  let checks;

  if (/unescaped|must be escaped|percent-?encod/i.test(message)) {
    reason = 'The password in MONGODB_URI contains special characters that are not encoded.';
    checks = [
      'The simplest fix: in Atlas, set a new database password using only letters and digits.',
      'Then paste the new password into MONGODB_URI (no spaces, no < > signs).',
    ];
  } else if (err && (err.code === 18 || /bad auth|authentication failed|auth.*failed/i.test(message))) {
    reason = 'The database rejected the username or password.';
    checks = [
      'In MONGODB_URI, check the username and password are exactly what you set in Atlas (Database Access).',
      'Passwords are case-sensitive. Make sure no < > placeholder text was left in.',
      'If the password has special characters, set a new one with only letters and digits.',
    ];
  } else if (/ENOTFOUND|EAI_AGAIN|querySrv|getaddrinfo/i.test(message)) {
    reason = 'The database address could not be found.';
    checks = [
      'Check your internet connection.',
      'Copy the connection string from Atlas again. The part after the @ sign must be your cluster address.',
    ];
  } else if (
    (err && err.name === 'MongooseServerSelectionError') ||
    /server selection|timed out|ECONNREFUSED|ETIMEDOUT/i.test(message)
  ) {
    reason = 'The database did not answer in time.';
    checks = [
      'MOST COMMON: in Atlas, open Network Access and make sure your current IP address is on the list.',
      'Check your internet connection (a VPN or a strict firewall can block it).',
      'Check your Atlas cluster is running and not paused.',
    ];
  } else {
    reason = 'An unexpected database error occurred.';
    checks = ['Copy the technical detail below and send it to your assistant.'];
  }

  return [
    `Could not connect to MongoDB. ${reason}`,
    ...checks.map((line) => `  - ${line}`),
    `Technical detail: ${message}`,
  ].join('\n');
}

module.exports = {
  getDatabaseState,
  connectDatabase,
  disconnectDatabase,
  attachConnectionLogging,
  inspectDatabase,
  redactSecrets,
  secretsFromUri,
  describeConnectionError,
};
