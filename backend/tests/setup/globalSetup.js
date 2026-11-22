'use strict';

// Runs ONCE before all tests. Decides whether tests that need a real MongoDB can run.
//
//   npm test           -> database tests are SKIPPED (and reported as skipped, never as passed)
//   npm run test:db    -> starts a throwaway in-memory MongoDB and runs them too
//
// If you explicitly ask for database tests (test:db) and the database cannot start,
// the whole run FAILS loudly. It never quietly skips what you asked for.
//
// The test database is a real MongoDB program, started on your own machine, living in
// memory and deleted afterwards. It never touches MongoDB Atlas or any real data.

const { MongoMemoryServer } = require('mongodb-memory-server-core');

const MONGO_VERSION = require('../helpers/mongoVersion');

module.exports = async function globalSetup() {
  process.env.TEST_MONGO_URI = '';

  if (process.env.TEST_DB !== 'memory') {
    console.log(
      '\n[tests] Database tests are SKIPPED. Run "npm run test:db" to include them ' +
        '(first run downloads MongoDB once; see the setup guide).'
    );
    return;
  }

  console.log(`\n[tests] Starting a throwaway MongoDB ${MONGO_VERSION} (first run downloads it)...`);
  const mongod = await MongoMemoryServer.create({ binary: { version: MONGO_VERSION } });
  globalThis.__MONGOD__ = mongod;
  process.env.TEST_MONGO_URI = mongod.getUri();
  console.log('[tests] Test database is ready.');
};
