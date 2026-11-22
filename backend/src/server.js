'use strict';

// Starts the server. Run with `npm start` (or `npm run dev` to auto-restart on changes).

// Load the settings first, so a mistake in them is reported in plain words
// instead of as a long technical error.
let config;
try {
  ({ config } = require('./config/env'));
} catch (err) {
  console.error(`Settings problem: ${err.message}`);
  console.error('Fix it in backend/.env (see backend/.env.example), then start the server again.');
  process.exit(1);
}

const app = require('./app');

const server = app.listen(config.port);

server.once('listening', () => {
  console.log(`FINDIT API is running (${config.nodeEnv} mode).`);
  console.log(`Health check: http://localhost:${config.port}/api/v1/health`);
  console.log('Press Ctrl+C to stop.');
});

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${config.port} is already in use. Stop the other program using it, ` +
        'or set a different PORT in backend/.env.'
    );
  } else {
    console.error('The server could not start:', err.message);
  }
  process.exit(1);
});

// Stop cleanly when you press Ctrl+C or the host asks the process to end.
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
