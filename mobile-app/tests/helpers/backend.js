// Lets tests compare the app with the REAL backend code in ../backend (same repository), so the
// two cannot drift apart. If the backend's libraries are not installed, those tests are SKIPPED
// (and reported as skipped), never silently passed. Run `npm ci` in backend/ to enable them.

const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..', '..', '..', 'backend');
const available = fs.existsSync(path.join(backendRoot, 'node_modules', 'zod'));

if (!available) {
  // eslint-disable-next-line no-console
  console.warn('[tests] Backend comparison tests are SKIPPED: run "npm ci" in the backend folder to include them.');
}

const describeWithBackend = available ? describe : describe.skip;
const fromBackend = (relative) => require(path.join(backendRoot, relative));

module.exports = { describeWithBackend, fromBackend, backendAvailable: available };
