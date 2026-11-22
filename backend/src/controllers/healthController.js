'use strict';

// Controllers are thin: they receive a request and send a response.
// (Real logic lives in services, added from Stage 4 onwards.)

const { getDatabaseState } = require('../config/db');

// GET /api/v1/health
// Lets you (and later the apps) check that the server is alive and whether the
// database connection is up. The HTTP status is 200 even if the database is down,
// because the server itself is alive; the `database` field tells the truth.
function getHealth(req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: getDatabaseState(),
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    },
  });
}

module.exports = { getHealth };
