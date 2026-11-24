'use strict';

// GET /api/v1/meta/options: the allowed-value lists for the apps. Public (no login), no database.

const request = require('supertest');
const { makeTestApp } = require('./helpers/testConfig');
const { CATEGORIES, COLOURS, TIME_BANDS, ITEM_STATUS_LIST, CONTACT_PREFERENCES, REPORT_TYPES } = require('../src/config/constants');

const app = makeTestApp();

describe('GET /api/v1/meta/options', () => {
  test('works without logging in, in the standard format', async () => {
    const res = await request(app).get('/api/v1/meta/options');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns every list, exactly as the backend itself validates against them', async () => {
    const { data } = (await request(app).get('/api/v1/meta/options')).body;
    expect(data.reportTypes).toEqual(REPORT_TYPES);
    expect(data.categories).toEqual(CATEGORIES);
    expect(data.colours).toEqual(COLOURS);
    expect(data.timeBands).toEqual(TIME_BANDS);
    expect(data.itemStatuses).toEqual(ITEM_STATUS_LIST);
    expect(data.contactPreferences).toEqual(CONTACT_PREFERENCES);
  });

  test('the campus locations are zones, each saying how to ask for detail, with the places to choose from', async () => {
    const { data } = (await request(app).get('/api/v1/meta/options')).body;
    expect(data.campusLocations).toHaveLength(16);
    const male = data.campusLocations.find((z) => z.code === 'MALE_HALLS');
    expect(male).toMatchObject({ code: 'MALE_HALLS', label: 'Halls of residence (male)', detail: { mode: 'LIST' } });
    expect(male.detail.options).toContain('Winslow');
    const library = data.campusLocations.find((z) => z.code === 'LIBRARY');
    expect(library.detail.mode).toBe('REQUIRED_TEXT');
    expect(library.detail.options).toBeUndefined();
  });

  test('contains nothing private (no users, no tokens, no settings)', async () => {
    const text = JSON.stringify((await request(app).get('/api/v1/meta/options')).body);
    // ("EMAIL" appears as a legitimate contact-preference value, so look for real private data instead)
    expect(text).not.toMatch(/password|secret|token|mongodb|@|passwordHash|jwt/i);
  });
});
