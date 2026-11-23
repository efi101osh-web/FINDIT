'use strict';

// Automated tests for the HTTP foundation. Test IDs (T-xxx-nn) refer to
// documentation/TEST_PLAN.md. The tests call the app directly (no network port needed)
// and build it from explicit test settings, never from your private .env file.

const request = require('supertest');
const express = require('express');
const createErrorHandler = require('../src/middleware/errorHandler');
const { makeTestConfig, makeTestApp } = require('./helpers/testConfig');

const testConfig = makeTestConfig();
const app = makeTestApp();

describe('GET /api/v1/health', () => {
  test('T-HLT-01: responds 200 in the standard success format', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
    expect(Number.isNaN(new Date(res.body.data.time).getTime())).toBe(false);
  });

  test('reports the database as "disconnected" when no connection exists (server is alive, so still 200)', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe('disconnected');
  });

  test('does not advertise the framework in response headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('unknown routes', () => {
  test('T-INV-02: unknown URL gives 404 in the standard error format', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });

  test('the 404 message does not echo the requested URL back', async () => {
    const res = await request(app).get('/api/v1/<script>alert(1)</script>');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('script');
  });

  test('a URL outside /api/v1 is also a clean 404', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('malformed requests', () => {
  test('T-INV-03: invalid JSON body gives 400 in the standard error format', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"this is": not valid json');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });

  test('a JSON body over 100 kB is refused with 413', async () => {
    const tooBig = JSON.stringify({ filler: 'a'.repeat(150 * 1024) });
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send(tooBig);

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('unexpected server errors never leak internals', () => {
  // A tiny separate app whose routes deliberately crash, using the real error handler.
  const crashing = express();
  crashing.get('/sync-crash', () => {
    throw new Error('SECRET internal detail: /etc/passwd db password');
  });
  crashing.get('/async-crash', async () => {
    throw new Error('SECRET internal detail: /etc/passwd db password');
  });
  crashing.use(createErrorHandler(testConfig));

  test.each(['/sync-crash', '/async-crash'])(
    'T-SEC-04: %s gives a generic 500 with no stack trace or details',
    async (path) => {
      const res = await request(crashing).get(path);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' },
      });
      const text = JSON.stringify(res.body);
      expect(text).not.toContain('SECRET');
      expect(text).not.toContain('passwd');
      expect(text).not.toMatch(/\bat\s.+\(.+:\d+:\d+\)/); // no stack-trace lines
    }
  );
});
