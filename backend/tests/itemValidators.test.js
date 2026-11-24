'use strict';

// The input rules for reports. No database needed. Test IDs refer to documentation/TEST_PLAN.md.

const { createItemSchema, updateItemSchema, closeItemSchema, idParams, listMineQuery } = require('../src/validators/itemValidators');
const { validLost, validFound, dateDaysAgo, DAY } = require('./helpers/items');

const parse = (schema, value) => schema.safeParse(value);
const fieldsOf = (result) => result.error.issues.flatMap((i) => (i.code === 'unrecognized_keys' ? i.keys : [i.path.join('.') || 'body']));
const refused = (schema, value, field) => {
  const result = parse(schema, value);
  expect([JSON.stringify(value).slice(0, 80), result.success]).toEqual([JSON.stringify(value).slice(0, 80), false]);
  if (field) expect(fieldsOf(result)).toContain(field);
};
const without = (obj, key) => {
  const copy = { ...obj };
  delete copy[key];
  return copy;
};

describe('createItemSchema: valid reports', () => {
  test('a valid LOST report is accepted and cleaned (spaces trimmed, the date becomes a real Date)', () => {
    const result = parse(createItemSchema, validLost({ title: '  Black headphones ' }));
    expect(result.success).toBe(true);
    expect(result.data.title).toBe('Black headphones');
    expect(result.data.dateOccurred).toBeInstanceOf(Date);
    expect(result.data.dateOccurred.toISOString()).toMatch(/T00:00:00\.000Z$/);
  });

  test('a valid FOUND report with the found-only fields is accepted', () => {
    expect(parse(createItemSchema, validFound()).success).toBe(true);
  });

  test('the optional fields can be left out', () => {
    const minimal = {
      reportType: 'LOST', title: 'Blue backpack', category: 'BAGS', description: 'Navy backpack with two front pockets.',
      colour: 'BLUE', generalLocation: 'NOT_SURE', dateOccurred: dateDaysAgo(2),
    };
    expect(parse(createItemSchema, minimal).success).toBe(true);
  });

  test('descriptions may contain line breaks', () => {
    expect(parse(createItemSchema, validLost({ description: 'Line one of the description.\nLine two here.' })).success).toBe(true);
  });
});

describe('createItemSchema: required fields and allowed values', () => {
  test.each(['reportType', 'title', 'category', 'description', 'colour', 'generalLocation', 'dateOccurred'])('T-ITM-03: %s is required', (field) => {
    refused(createItemSchema, without(validLost(), field), field);
  });

  test.each([
    ['reportType', 'MISSING'],
    ['category', 'FOOD'],
    ['colour', 'TURQUOISE'],
    ['generalLocation', 'MARS'],
    ['approximateTime', 'LUNCHTIME'],
  ])('T-ITM-03: refuses an unknown %s', (field, value) => {
    refused(createItemSchema, validLost({ [field]: value }), field);
  });

  test.each([
    ['title', 'ab'], ['title', 'x'.repeat(81)], ['title', 'Bad\u0000name'],
    ['description', 'too short'], ['description', 'x'.repeat(1001)], ['description', 'Has a\u0007bell character in it'],
    ['brand', 'x'.repeat(41)], ['brand', ''], ['privateDetails', 'x'.repeat(1001)], ['privateStorageLocation', 'x'.repeat(201)],
  ])('refuses %s = %j', (field, value) => {
    refused(createItemSchema, validFound({ [field]: value }), field);
  });

  test('T-SRC-06: refuses objects, arrays and numbers where text is expected (injection attempts)', () => {
    for (const field of ['title', 'description', 'category', 'colour', 'generalLocation', 'dateOccurred', 'brand']) {
      refused(createItemSchema, validLost({ [field]: { $ne: null } }), field);
      refused(createItemSchema, validLost({ [field]: ['a'] }), field);
      refused(createItemSchema, validLost({ [field]: 12345 }), field);
    }
  });
});

describe('createItemSchema: the date', () => {
  const withDate = (dateOccurred) => validLost({ dateOccurred });
  const dayOffset = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

  test('T-ITM-04: today and yesterday are fine', () => {
    expect(parse(createItemSchema, withDate(dateDaysAgo(0))).success).toBe(true);
    expect(parse(createItemSchema, withDate(dateDaysAgo(1))).success).toBe(true);
  });

  test('T-ITM-04: tomorrow is allowed (a phone in Nigeria can be a day ahead of the server clock), but later is the future', () => {
    expect(parse(createItemSchema, withDate(dayOffset(1))).success).toBe(true);
    refused(createItemSchema, withDate(dayOffset(3)), 'dateOccurred');
    refused(createItemSchema, withDate(dayOffset(400)), 'dateOccurred');
  });

  test('a date more than a year ago is refused; just under a year is fine', () => {
    refused(createItemSchema, withDate(dateDaysAgo(366)), 'dateOccurred');
    refused(createItemSchema, withDate('1999-01-01'), 'dateOccurred');
    expect(parse(createItemSchema, withDate(dateDaysAgo(364))).success).toBe(true);
  });

  test.each(['14/11/2026', '2026-1-5', '2026-11-14T10:00:00Z', 'yesterday', '', '20261114', '2026-13-01', '2026-02-30', '2026-00-10'])(
    'refuses the date %j (wrong format or not a real date)',
    (value) => {
      refused(createItemSchema, withDate(value), 'dateOccurred');
    }
  );
});

describe('createItemSchema: where it was (zone + detail)', () => {
  test('a hall from the list is accepted; an unlisted one, or none, is refused on locationDetail', () => {
    expect(parse(createItemSchema, validLost({ generalLocation: 'FEMALE_HALLS', locationDetail: 'Queen Esther' })).success).toBe(true);
    refused(createItemSchema, validLost({ generalLocation: 'FEMALE_HALLS', locationDetail: 'Winslow' }), 'locationDetail');
    refused(createItemSchema, without(validLost({ generalLocation: 'FEMALE_HALLS' }), 'locationDetail'), 'locationDetail');
  });

  test('library and classrooms need a short description', () => {
    expect(parse(createItemSchema, validLost({ generalLocation: 'CLASSROOM', locationDetail: 'BBS Class 102' })).success).toBe(true);
    refused(createItemSchema, without(validLost({ generalLocation: 'LIBRARY' }), 'locationDetail'), 'locationDetail');
    refused(createItemSchema, validLost({ generalLocation: 'LIBRARY', locationDetail: 'ab' }), 'locationDetail');
  });

  test('other zones accept no detail at all', () => {
    for (const zone of ['CAFETERIA', 'SPORTS', 'GATES', 'OFF_CAMPUS', 'NOT_SURE']) {
      expect([zone, parse(createItemSchema, without(validLost({ generalLocation: zone }), 'locationDetail')).success]).toEqual([zone, true]);
    }
  });

  test('"Not sure which" is a valid choice in every list', () => {
    for (const zone of ['MALE_HALLS', 'FEMALE_HALLS', 'CHURCH', 'AUDITORIUM']) {
      expect(parse(createItemSchema, validLost({ generalLocation: zone, locationDetail: 'Not sure which' })).success).toBe(true);
    }
  });
});

describe('createItemSchema: found-only fields and forbidden fields', () => {
  test('T-ITM-05: handedToOffice and privateStorageLocation are refused on a LOST report', () => {
    refused(createItemSchema, validLost({ handedToOffice: true }), 'handedToOffice');
    refused(createItemSchema, validLost({ privateStorageLocation: 'Somewhere' }), 'privateStorageLocation');
    refused(createItemSchema, validLost({ handedToOffice: false }), 'handedToOffice');
  });

  test('handedToOffice must be a real true/false, not text', () => {
    refused(createItemSchema, validFound({ handedToOffice: 'true' }), 'handedToOffice');
    refused(createItemSchema, validFound({ handedToOffice: 1 }), 'handedToOffice');
  });

  test.each(['status', 'reporterId', 'images', '_id', 'id', 'createdAt', 'updatedAt', 'isMine', 'closedAt', 'closeReason', 'role'])(
    'T-ITM-10: the field %s is not accepted on a new report',
    (field) => {
      refused(createItemSchema, validLost({ [field]: 'anything' }), field);
    }
  );
});

describe('updateItemSchema', () => {
  test('accepts any single editable field, and null to clear the optional ones', () => {
    expect(parse(updateItemSchema, { title: 'New title here' }).success).toBe(true);
    expect(parse(updateItemSchema, { colour: 'RED' }).success).toBe(true);
    expect(parse(updateItemSchema, { dateOccurred: dateDaysAgo(2) }).success).toBe(true);
    for (const field of ['brand', 'privateDetails', 'locationDetail', 'privateStorageLocation']) {
      expect([field, parse(updateItemSchema, { [field]: null }).success]).toEqual([field, true]);
    }
  });

  test('refuses clearing a field that is required', () => {
    for (const field of ['title', 'category', 'description', 'colour', 'generalLocation', 'dateOccurred', 'approximateTime']) {
      refused(updateItemSchema, { [field]: null }, field);
    }
  });

  test('T-ITM-10: reportType, status, reporterId and anything else not listed are refused', () => {
    for (const field of ['reportType', 'status', 'reporterId', 'images', 'id', '_id', 'createdAt', 'isMine']) {
      refused(updateItemSchema, { title: 'A valid new title', [field]: 'LOST' }, field);
    }
  });

  test('an empty update is refused, and a forbidden field is reported only as that', () => {
    const empty = parse(updateItemSchema, {});
    expect(empty.success).toBe(false);
    expect(empty.error.issues[0].message).toBe('Send at least one field to change.');
    const forbidden = parse(updateItemSchema, { status: 'RETURNED' });
    expect(forbidden.error.issues.map((i) => i.code)).toEqual(['unrecognized_keys']);
  });
});

describe('closeItemSchema, idParams, listMineQuery', () => {
  test('close: the reason is optional, at most 200 characters, and nothing else is accepted', () => {
    expect(parse(closeItemSchema, {}).success).toBe(true);
    expect(parse(closeItemSchema, { reason: 'Found it in my bag.' }).success).toBe(true);
    refused(closeItemSchema, { reason: 'x'.repeat(201) }, 'reason');
    refused(closeItemSchema, { reason: '' }, 'reason');
    refused(closeItemSchema, { status: 'OPEN' }, 'status');
  });

  test('the id must be exactly 24 hexadecimal characters', () => {
    expect(parse(idParams, { id: '665f2a7e9b1d4a0012ab3501' }).success).toBe(true);
    for (const id of ['mine', 'abc', '665f2a7e9b1d4a0012ab350', '665f2a7e9b1d4a0012ab35011', '665f2a7e9b1d4a0012ab350z', '', ['665f2a7e9b1d4a0012ab3501'], { $ne: 1 }]) {
      refused(idParams, { id }, 'id');
    }
  });

  test('my reports query: sensible defaults, strings become numbers, and limits are enforced', () => {
    expect(parse(listMineQuery, {}).data).toEqual({ page: 1, limit: 20 });
    expect(parse(listMineQuery, { page: '3', limit: '50', reportType: 'LOST', status: 'OPEN' }).data).toEqual({ page: 3, limit: 50, reportType: 'LOST', status: 'OPEN' });
  });

  test('T-SRC-04: limit above 50, zero or negative values, non-numbers, unknown filters and injection are all refused', () => {
    for (const query of [
      { limit: '51' }, { limit: '500' }, { limit: '0' }, { limit: '-1' }, { limit: 'many' }, { limit: '2.5' }, { page: '0' }, { page: 'x' },
      { page: ['1', '2'] }, { reportType: 'NEITHER' }, { status: 'DONE' }, { status: { $ne: 'OPEN' } }, { sort: 'newest' }, { q: 'x' },
    ]) {
      refused(listMineQuery, query);
    }
  });
});
