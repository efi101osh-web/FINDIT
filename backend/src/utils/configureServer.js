'use strict';

// Node closes an idle "keep-alive" connection after only 5 seconds. A client that reuses a
// connection at the wrong moment (Postman, a phone app, a proxy) then gets "ECONNRESET" on a
// perfectly good request. Keeping idle connections open for 65 seconds (longer than the idle
// timeouts those clients and proxies use) prevents it. This is the usual setting for servers
// that sit behind clients or load balancers.

const KEEP_ALIVE_MS = 65 * 1000;

function configureServer(server) {
  server.keepAliveTimeout = KEEP_ALIVE_MS;
  // Node requires the headers timeout to be longer than the keep-alive timeout.
  server.headersTimeout = KEEP_ALIVE_MS + 1000;
  return server;
}

module.exports = { configureServer, KEEP_ALIVE_MS };
