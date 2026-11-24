'use strict';

// `npm run seed:admin`: creates the first administrator account in your database.
//
// Put these three lines in backend/.env first (see .env.example):
//     SEED_ADMIN_EMAIL=you@example.com
//     SEED_ADMIN_PASSWORD=<a strong password>
//     SEED_ADMIN_NAME=Your Name            (optional)
//
// Afterwards DELETE the SEED_ADMIN_PASSWORD line from .env: it is only needed once.
// This script never prints the password.
//
//   npm run seed:admin                run normally
//   npm run seed:admin -- --promote   also turn an existing REGULAR account with that email into an admin

const { loadConfigFromProcess } = require('../src/config/env');
const {
  connectDatabase,
  disconnectDatabase,
  describeConnectionError,
} = require('../src/config/db');
const { initModels } = require('../src/models');
const createPasswordService = require('../src/services/passwordService');
const { seedAdmin } = require('../src/services/adminSeedService');

async function main() {
  let config;
  try {
    config = loadConfigFromProcess();
  } catch (err) {
    console.error(`Settings problem: ${err.message}`);
    return 1;
  }
  if (!config.mongodbUri) {
    console.error('MONGODB_URI is not set in backend/.env (see documentation/SETUP_GUIDE.md Part 3).');
    return 1;
  }
  const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password, SEED_ADMIN_NAME: fullName } = process.env;
  if (!email || !password) {
    console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in backend/.env first (see .env.example).');
    return 1;
  }

  try {
    await connectDatabase({ uri: config.mongodbUri, dbName: config.dbName, serverSelectionTimeoutMS: config.dbTimeoutMs });
  } catch (err) {
    console.error(describeConnectionError(err, config.mongodbUri));
    return 1;
  }

  try {
    await initModels();
    const passwords = createPasswordService({ rounds: config.bcryptRounds });
    const { status, user } = await seedAdmin({
      email,
      password,
      fullName: fullName || undefined,
      passwords,
      promote: process.argv.includes('--promote'),
    });

    if (status === 'created' || status === 'promoted') {
      console.log(`SUCCESS: ${user.email} is now an administrator${status === 'promoted' ? ' (promoted from a regular account; password unchanged)' : ''}.`);
      console.log('NEXT: delete the SEED_ADMIN_PASSWORD line from backend/.env. It is not needed any more.');
      return 0;
    }
    if (status === 'already_admin') {
      console.log(`Nothing to do: ${user.email} is already an administrator. (Nothing was changed.)`);
      return 0;
    }
    console.error(`${user.email} already exists as a regular account, so nothing was changed.`);
    console.error('If you want to make that existing account an administrator, run: npm run seed:admin -- --promote');
    return 1;
  } catch (err) {
    console.error(`Could not create the administrator: ${err.message}`);
    return 1;
  } finally {
    await disconnectDatabase();
  }
}

main().then((code) => process.exit(code));
