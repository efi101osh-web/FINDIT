'use strict';

// Reads the app's settings from environment variables, checks them, and exports
// one frozen `config` object for the rest of the code to use.
//
// "Fail fast": if a setting is wrong, the app refuses to start and says why,
// instead of failing in a confusing way later.
//
// During development, settings come from a file called `.env` inside the backend
// folder (copied from `.env.example`). That file is private and never committed.
// Real environment variables, if set, always win over the file.

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const ALLOWED_ENVIRONMENTS = ['development', 'test', 'production'];
const DEFAULT_PORT = '4000';

/**
 * Turns raw environment values into a validated config object.
 * Takes `env` as a parameter (default: the real environment) so tests can try
 * different values without touching the real environment.
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

  return Object.freeze({
    nodeEnv,
    port,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
  });
}

module.exports = { loadConfig, config: loadConfig() };
