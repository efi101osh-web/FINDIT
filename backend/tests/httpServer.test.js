'use strict';

// The HTTP server's idle-connection settings. No database needed.

const http = require('http');
const { configureServer, KEEP_ALIVE_MS } = require('../src/utils/configureServer');
const { makeTestApp } = require('./helpers/testConfig');

describe('configureServer', () => {
  test('keeps idle connections open for 65 seconds, with a headers timeout longer than that', () => {
    const server = configureServer(http.createServer());
    expect(KEEP_ALIVE_MS).toBe(65000);
    expect(server.keepAliveTimeout).toBe(65000);
    expect(server.headersTimeout).toBeGreaterThan(server.keepAliveTimeout);
  });

  test('a real server built this way tells clients it will keep their connection for 65 seconds', async () => {
    const server = configureServer(http.createServer(makeTestApp()));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const agent = new http.Agent({ keepAlive: true });
    try {
      const headers = await new Promise((resolve, reject) => {
        http
          .get({ host: '127.0.0.1', port: server.address().port, path: '/api/v1/health', agent }, (res) => {
            res.resume();
            res.on('end', () => resolve(res.headers));
          })
          .on('error', reject);
      });
      expect(headers['keep-alive']).toBe('timeout=65');
    } finally {
      agent.destroy();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
