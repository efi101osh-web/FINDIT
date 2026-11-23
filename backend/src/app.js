'use strict';

// Builds the Express application: which middleware runs, and in what order.
// It does NOT start listening on a port (server.js does that), and it does NOT
// connect to the database. Keeping those apart lets the automated tests build
// an app with whatever settings they want, without a network port.

const express = require('express');
const helmet = require('helmet');
const createCors = require('./middleware/cors');
const createRoutes = require('./routes');
const createServices = require('./services');
const createAuthenticate = require('./middleware/authenticate');
const createRateLimiters = require('./middleware/rateLimiters');
const notFound = require('./middleware/notFound');
const createErrorHandler = require('./middleware/errorHandler');

/**
 * `options.rateLimits` lets tests use different limits (see middleware/rateLimiters.js).
 * The real server uses the defaults, or the values set in backend/.env.
 */
function createApp(config, options = {}) {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is required to build the app. Generate one with: npm run make:secret');
  }
  const app = express();
  const services = createServices(config);
  const limiters = createRateLimiters({ ...config.rateLimits, ...options.rateLimits });

  // Do not tell the world which framework we use.
  app.disable('x-powered-by');

  // Security headers that make browsers safer (stops clickjacking, MIME sniffing, etc.).
  app.use(helmet());

  // Which websites may call us from a browser (see middleware/cors.js).
  app.use(createCors(config.corsOrigins));

  // Read JSON request bodies, refusing anything over 100 kB.
  app.use(express.json({ limit: '100kb' }));

  // Slow down floods from any single address (before anything else does real work).
  app.use('/api/v1', limiters.global);

  // All API routes live under /api/v1 (see documentation/API_CONTRACT.md).
  app.use('/api/v1', createRoutes({ services, authenticate: createAuthenticate(services), limiters }));

  // Order matters: these two must come last.
  app.use(notFound);
  app.use(createErrorHandler(config));

  return app;
}

module.exports = { createApp };
