'use strict';

// `npm run test:db`: runs ALL the automated tests, including the ones that need a real
// MongoDB. It starts a throwaway MongoDB on your own machine (in memory, deleted when the
// tests finish). It never touches your Atlas database.
//
// First run only: this downloads a copy of MongoDB (about 120 MB on Linux and 500-800 MB
// on Windows). It is cached in your home folder, outside the project, and reused afterwards.
//
// This is a tiny script (instead of `TEST_DB=memory jest`) because that command style
// does not work in Windows PowerShell.

process.env.TEST_DB = 'memory';
require('jest').run(process.argv.slice(2));
