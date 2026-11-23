'use strict';

// A ready-made, safe configuration and app for tests. It never reads your .env, uses a
// throwaway signing key, and hashes passwords with the fastest setting (4) so tests run quickly.

const { loadConfig } = require('../../src/config/env');
const { createApp } = require('../../src/app');

const TEST_JWT_SECRET = 'test-only-signing-key-'.repeat(3); // 66 characters, used only in tests

// Limits so high that ordinary tests never meet the rate limiter.
// (The rate-limit tests build their own app with small limits.)
const RELAXED_LIMITS = { globalMax: 1000000, loginFailuresMax: 1000000, registerMax: 1000000 };

function makeTestConfig(overrides = {}) {
  return loadConfig({ NODE_ENV: 'test', JWT_SECRET: TEST_JWT_SECRET, BCRYPT_ROUNDS: '4', ...overrides });
}

function makeTestApp(overrides = {}, options = {}) {
  return createApp(makeTestConfig(overrides), { rateLimits: RELAXED_LIMITS, ...options });
}

module.exports = { TEST_JWT_SECRET, makeTestConfig, makeTestApp };
