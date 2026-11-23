'use strict';

// Starts the server. Run with `npm start` (or `npm run dev` to auto-restart on changes).
//
// Order of events: load settings -> connect to the database -> start listening.
// If any step fails, the server stops and explains what to fix.

const { loadConfigFromProcess } = require('./config/env');
const {
  connectDatabase,
  disconnectDatabase,
  attachConnectionLogging,
  describeConnectionError,
} = require('./config/db');
const { initModels } = require('./models');
const { createApp } = require('./app');

function stopWithMessage(lines) {
  console.error(lines.join('\n'));
  process.exit(1);
}

async function main() {
  // 1. Settings. Reported in plain words instead of as a long technical error.
  let config;
  try {
    config = loadConfigFromProcess();
  } catch (err) {
    return stopWithMessage([
      `Settings problem: ${err.message}`,
      'Fix it in backend/.env (see backend/.env.example), then start the server again.',
    ]);
  }

  if (!config.mongodbUri) {
    return stopWithMessage([
      'Settings problem: MONGODB_URI is not set.',
      'The server needs a database. Follow documentation/SETUP_GUIDE.md Part 3, then put the',
      'connection string in backend/.env as MONGODB_URI=..., and start the server again.',
    ]);
  }

  if (!config.jwtSecret) {
    return stopWithMessage([
      'Settings problem: JWT_SECRET is not set.',
      'It is the secret key that signs login tokens. Generate one with: npm run make:secret',
      'then put it in backend/.env as JWT_SECRET=... and start the server again.',
    ]);
  }

  // 2. Database.
  try {
    await connectDatabase({ uri: config.mongodbUri, dbName: config.dbName });
  } catch (err) {
    return stopWithMessage([describeConnectionError(err, config.mongodbUri)]);
  }
  // Wait until the database has built its indexes (the "unique email" rule depends on one).
  await initModels();
  const detachConnectionLogging = attachConnectionLogging();
  console.log(`Connected to MongoDB (database "${config.dbName}").`);

  // 3. Web server.
  const app = createApp(config);
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

  // Stop cleanly when you press Ctrl+C or the host asks the process to end:
  // stop accepting requests, close the database connection, then exit.
  function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down...`);
    detachConnectionLogging(); // closing the database on purpose is not a "lost connection"
    server.close(async () => {
      try {
        await disconnectDatabase();
      } finally {
        process.exit(0);
      }
    });
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  return undefined;
}

main().catch((err) => {
  console.error('The server could not start:', err.message);
  process.exit(1);
});
