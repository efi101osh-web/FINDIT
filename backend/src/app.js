'use strict';

// Builds the Express application: which middleware runs, and in what order.
// It does NOT start listening on a port. server.js does that. Keeping them
// apart lets the automated tests use the app directly without a network port.

const express = require('express');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Do not tell the world which framework we use.
app.disable('x-powered-by');

// Read JSON request bodies, refusing anything over 100 kB.
app.use(express.json({ limit: '100kb' }));

// All API routes live under /api/v1 (see documentation/API_CONTRACT.md).
app.use('/api/v1', routes);

// Order matters: these two must come last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
