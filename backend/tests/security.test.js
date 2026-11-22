'use strict';

// Tests for the security headers (Helmet) and the CORS allow-list.
// Test IDs refer to documentation/TEST_PLAN.md.

const request = require('supertest');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');

const ALLOWED = 'https://dash.example.com';
const app = createApp(
  loadConfig({ NODE_ENV: 'test', CORS_ORIGINS: `${ALLOWED}, http://localhost:5173/` })
);

describe('security headers (Helmet)', () => {
  test('T-SEC-01: every response carries the standard browser-protection headers', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('the headers are also present on error responses', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('CORS allow-list', () => {
  test('T-SEC-02: an allowed website is told it may read the reply', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', ALLOWED);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  test('an entry written with a trailing slash in the settings still works', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('T-SEC-02: any other website gets no permission headers, so a browser blocks it', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example.org');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('a lookalike of an allowed origin is not allowed', async () => {
    for (const origin of [`${ALLOWED}.evil.org`, 'https://dash.example.com:8443', 'http://dash.example.com']) {
      const res = await request(app).get('/api/v1/health').set('Origin', origin);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    }
  });

  test('requests with no Origin (mobile app, Postman, curl) are not affected', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('a browser "preflight" check from an allowed website is approved for our methods and headers', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', ALLOWED)
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'Authorization, Content-Type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
    expect(res.headers['access-control-allow-methods']).toContain('PATCH');
    expect(res.headers['access-control-allow-headers']).toMatch(/Authorization/i);
  });

  test('a preflight from any other website is not approved', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'https://evil.example.org')
      .set('Access-Control-Request-Method', 'PATCH');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('cookies are never allowed cross-site (we use tokens, not cookies)', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', ALLOWED);
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
