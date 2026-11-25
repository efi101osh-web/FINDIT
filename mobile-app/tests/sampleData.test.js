import { sampleItems, sampleOptions, sampleUserFor } from '../src/api/sampleData';
import { describeWithBackend, fromBackend } from './helpers/backend';
import { zoneLabel } from '../src/utils/place';

describe('the preview data is well formed', () => {
  test('ids are unique and every report has a title', () => {
    expect(new Set(sampleItems.map((item) => item.id)).size).toBe(sampleItems.length);
    for (const item of sampleItems) expect(item.title.length).toBeGreaterThan(2);
  });

  test('dates are UTC midnight, like the server sends', () => {
    for (const item of sampleItems) expect(item.dateOccurred).toMatch(/T00:00:00\.000Z$/);
  });

  test('every report place can be turned into words', () => {
    for (const item of sampleItems) expect([item.generalLocation, zoneLabel(sampleOptions.campusLocations, item.generalLocation)]).not.toContain(null);
  });

  test('a preview user is made from an email or a name', () => {
    expect(sampleUserFor({ email: 'amina.yusuf@example.com' }).fullName).toBe('Amina Yusuf');
    expect(sampleUserFor({ fullName: 'Tunde Bello', email: 'T@x.com' })).toMatchObject({ fullName: 'Tunde Bello', email: 't@x.com', role: 'user' });
  });
});

describeWithBackend('the preview data has exactly the shape the real server sends', () => {
  let constants;
  let serializers;
  let campus;
  beforeAll(() => {
    constants = fromBackend('src/config/constants.js');
    serializers = fromBackend('src/utils/serializers.js');
    campus = fromBackend('src/config/campusLocations.js');
  });

  test('a report card has the same fields as the backend produces (no more, no fewer)', () => {
    const realCard = serializers.toItemCard(
      { _id: 'x', reportType: 'LOST', title: 't', category: 'KEYS', colour: 'RED', generalLocation: 'NOT_SURE', dateOccurred: new Date(), status: 'OPEN', reporterId: 'u', createdAt: new Date() },
      'viewer'
    );
    for (const item of sampleItems) expect(Object.keys(item).sort()).toEqual(Object.keys(realCard).sort());
  });

  test('every value is one the server could really send', () => {
    for (const item of sampleItems) {
      expect(constants.REPORT_TYPES).toContain(item.reportType);
      expect(constants.CATEGORIES).toContain(item.category);
      expect(constants.COLOURS).toContain(item.colour);
      expect(constants.ITEM_STATUS_LIST).toContain(item.status);
      expect(campus.ZONE_CODES).toContain(item.generalLocation);
      // and the place detail is one the server would accept for that zone
      expect(campus.checkLocation(item.generalLocation, item.locationDetail || undefined)).toEqual([]);
    }
  });

  test('the preview place list matches the backend: same codes, same names, same way of asking', () => {
    for (const sample of sampleOptions.campusLocations) {
      const real = campus.getZone(sample.code);
      expect(real).toBeTruthy();
      expect(sample.label).toBe(real.label);
      expect(sample.detail.mode).toBe(real.detail.mode);
      expect(sample.detail.hint).toBe(real.detail.hint);
      for (const option of sample.detail.options || []) expect(real.detail.options).toContain(option);
    }
  });
});
