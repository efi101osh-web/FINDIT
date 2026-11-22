'use strict';

// Runs ONCE after all tests: stops the throwaway MongoDB if one was started.

module.exports = async function globalTeardown() {
  if (globalThis.__MONGOD__) {
    await globalThis.__MONGOD__.stop();
  }
};
