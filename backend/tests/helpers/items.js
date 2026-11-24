'use strict';

// Helpers for building report data in tests.

const request = require('supertest');

const DAY = 24 * 60 * 60 * 1000;
const dateDaysAgo = (n) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);

const validLost = (overrides = {}) => ({
  reportType: 'LOST',
  title: 'Black wireless headphones',
  category: 'ELECTRONICS',
  description: 'Over-ear wireless headphones in a black case.',
  colour: 'BLACK',
  generalLocation: 'LIBRARY',
  locationDetail: 'Main library, second floor',
  dateOccurred: dateDaysAgo(1),
  approximateTime: 'AFTERNOON',
  privateDetails: 'Scratch on the left earcup; blue sticker inside the case.',
  ...overrides,
});

const validFound = (overrides = {}) => ({
  reportType: 'FOUND',
  title: 'Headphones in black case',
  category: 'ELECTRONICS',
  description: 'Over-ear headphones in a hard black case, found on a desk.',
  colour: 'BLACK',
  generalLocation: 'MALE_HALLS',
  locationDetail: 'Winslow',
  dateOccurred: dateDaysAgo(1),
  approximateTime: 'EVENING',
  privateDetails: 'Blue sticker inside the lid.',
  handedToOffice: true,
  privateStorageLocation: 'Security Office, shelf B',
  ...overrides,
});

const createItem = (app, token, body) => request(app).post('/api/v1/items').set('Authorization', `Bearer ${token}`).send(body);
const call = (app, method, path, token) => {
  const req = request(app)[method](`/api/v1${path}`);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

module.exports = { dateDaysAgo, validLost, validFound, createItem, call, DAY };
