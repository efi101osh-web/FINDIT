'use strict';

// Rate limiting: slows down anyone who makes too many requests, which stops password guessing
// and floods. Counted in memory (fine for one server process). The numbers are in
// documentation/API_CONTRACT.md section 1.6 and can be changed in backend/.env.
//
// Three limiters:
//   global   every endpoint, per IP address
//   login    FAILED logins only, per IP address AND email together. One student mistyping a
//            password cannot lock out others who share the same Wi-Fi address, and a correct
//            login never uses up the budget
//   register every sign-up request, per IP address (stops floods of fake accounts)

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

const DEFAULTS = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  globalMax: 600, // requests per IP per window
  loginFailuresMax: 10, // failed logins per IP+email per window
  registerMax: 20, // sign-up requests per IP per hour
  registerWindowMs: 60 * 60 * 1000,
};

/** The email typed into a login form, cleaned the same way the login itself cleans it. */
function emailOf(req) {
  const email = req.body && req.body.email;
  return typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : '';
}

function createRateLimiters(overrides = {}) {
  const options = { ...DEFAULTS, ...overrides };

  const common = {
    standardHeaders: 'draft-7', // tells well-behaved clients how many requests they have left
    legacyHeaders: false,
    // Reply in our standard error format instead of the library's plain text.
    handler: (req, res, next) => next(ApiError.rateLimited()),
  };

  return {
    global: rateLimit({ ...common, windowMs: options.windowMs, limit: options.globalMax }),
    login: rateLimit({
      ...common,
      windowMs: options.windowMs,
      limit: options.loginFailuresMax,
      skipSuccessfulRequests: true, // only failures (status 400 and up) are counted
      keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${emailOf(req)}`,
    }),
    register: rateLimit({ ...common, windowMs: options.registerWindowMs, limit: options.registerMax }),
  };
}

module.exports = createRateLimiters;
