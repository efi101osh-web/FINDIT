'use strict';

// `npm run check:db`: checks that your MongoDB Atlas connection works, WITHOUT starting
// the server. Read-only: it connects, asks the database a harmless question, and disconnects.
// It never prints the connection string or password.

const { loadConfigFromProcess } = require('../src/config/env');
const {
  connectDatabase,
  disconnectDatabase,
  inspectDatabase,
  describeConnectionError,
} = require('../src/config/db');

async function main() {
  let config;
  try {
    config = loadConfigFromProcess();
  } catch (err) {
    console.error(`Settings problem: ${err.message}`);
    console.error('Fix it in backend/.env (see backend/.env.example).');
    return 1;
  }
  if (!config.mongodbUri) {
    console.error('MONGODB_URI is not set in backend/.env.');
    console.error('Follow documentation/SETUP_GUIDE.md Part 3 to create the database first.');
    return 1;
  }

  console.log(`Connecting to MongoDB (waiting up to ${Math.round(config.dbTimeoutMs / 1000)} seconds)...`);
  try {
    await connectDatabase({ uri: config.mongodbUri, dbName: config.dbName, serverSelectionTimeoutMS: config.dbTimeoutMs });
  } catch (err) {
    console.error(describeConnectionError(err, config.mongodbUri));
    return 1;
  }

  try {
    const info = await inspectDatabase();
    console.log('SUCCESS: connected to MongoDB.');
    console.log(`  Database name : ${info.databaseName}`);
    console.log(`  Server version: ${info.serverVersion}`);
    console.log(`  Server address: ${info.host}`);
    return 0;
  } catch (err) {
    console.error(describeConnectionError(err, config.mongodbUri));
    return 1;
  } finally {
    await disconnectDatabase();
  }
}

main().then((code) => process.exit(code));
