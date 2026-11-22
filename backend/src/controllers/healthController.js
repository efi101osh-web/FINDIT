'use strict';

// Controllers are thin: they receive a request and send a response.
// (Real logic lives in services, added from Stage 3 onwards.)

// GET /api/v1/health
// Lets you (and later the apps) check that the server is alive.
// A `database` field is added in Stage 3, once the database connection exists.
function getHealth(req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    },
  });
}

module.exports = { getHealth };
