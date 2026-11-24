'use strict';

// Browse and search rules that need no database: the query builder and the query validator.
// (The behaviour against a real database is in items.browse.test.js.)

const { escapeRegex, splitWords, zoneCodesMatching, buildBrowseFilter, sortFor, MAX_WORDS } = require('../src/services/itemSearch');
const { listItemsQuery, SORTS } = require('../src/validators/itemValidators');
const { ACTIVE_ITEM_STATUSES } = require('../src/config/constants');

const parse = (query) => listItemsQuery.safeParse(query);
const refusedFields = (query) => {
  const result = parse(query);
  expect(result.success).toBe(false);
  return result.error.issues.map((issue) => issue.path[0] ?? '(unknown field)');
};

describe('escapeRegex: typed text is always plain letters, never a pattern', () => {
  test('every character that has a special meaning in a pattern is escaped', () => {
    for (const ch of '.*+?^${}()|[]\\') {
      const escaped = escapeRegex(ch);
      expect([ch, escaped]).toEqual([ch, `\\${ch}`]);
      expect(new RegExp(escaped).test(ch)).toBe(true);
    }
  });

  test('an escaped pattern matches the text literally and nothing more', () => {
    expect(new RegExp(escapeRegex('a.c')).test('abc')).toBe(false);
    expect(new RegExp(escapeRegex('a.c')).test('a.c')).toBe(true);
    expect(new RegExp(escapeRegex('(.*)+$'), 'i').test('x (.*)+$ y')).toBe(true);
    expect(new RegExp(escapeRegex('(.*)+$'), 'i').test('anything at all')).toBe(false);
  });

  test('a classic "catastrophic" pattern cannot slow the search down once escaped', () => {
    const evil = '(a+)+$';
    const subject = `${'a'.repeat(40)}!`;
    const started = Date.now();
    expect(new RegExp(escapeRegex(evil)).test(subject)).toBe(false);
    expect(Date.now() - started).toBeLessThan(200);
  });

  test('ordinary text passes through unchanged', () => {
    expect(escapeRegex('headphones')).toBe('headphones');
    expect(escapeRegex("Bob's bag")).toBe("Bob's bag");
  });
});

describe('splitWords', () => {
  test('lower-cases, removes extra spaces and repeats', () => {
    expect(splitWords('  Black   HEADPHONES black ')).toEqual(['black', 'headphones']);
  });
  test('keeps only the first few words', () => {
    expect(splitWords('a1 b2 c3 d4 e5 f6 g7')).toEqual(['a1', 'b2', 'c3', 'd4', 'e5']);
    expect(MAX_WORDS).toBe(5);
  });
  test('nothing in, nothing out', () => {
    expect(splitWords('')).toEqual([]);
    expect(splitWords(undefined)).toEqual([]);
    expect(splitWords('   ')).toEqual([]);
  });
});

describe('zoneCodesMatching: a word can match the NAME of a place', () => {
  test('"hall" finds the halls of residence and the auditoriums and halls', () => {
    expect(zoneCodesMatching('hall').sort()).toEqual(['AUDITORIUM', 'FEMALE_HALLS', 'MALE_HALLS']);
  });
  test('"church" finds the church zone, an unknown word finds none', () => {
    expect(zoneCodesMatching('church')).toEqual(['CHURCH']);
    expect(zoneCodesMatching('zzzzz')).toEqual([]);
  });
  test('it is case-insensitive on the stored names because the word is already lower case', () => {
    expect(zoneCodesMatching('library')).toEqual(['LIBRARY']);
  });
});

describe('buildBrowseFilter', () => {
  test('with nothing asked, only ACTIVE reports match: never CLOSED, never RETURNED', () => {
    const filter = buildBrowseFilter({});
    expect(filter).toEqual({ status: { $in: ACTIVE_ITEM_STATUSES } });
    expect(filter.status.$in).not.toContain('CLOSED');
    expect(filter.status.$in).not.toContain('RETURNED');
  });

  test('RETURNED may be asked for explicitly', () => {
    expect(buildBrowseFilter({ status: 'RETURNED' }).status).toBe('RETURNED');
    expect(buildBrowseFilter({ status: 'OPEN' }).status).toBe('OPEN');
  });

  test('CLOSED (or any unknown status) matches NOTHING, even if it reached the builder', () => {
    expect(buildBrowseFilter({ status: 'CLOSED' }).status).toEqual({ $in: [] });
    expect(buildBrowseFilter({ status: 'WHATEVER' }).status).toEqual({ $in: [] });
  });

  test('each filter maps to its own field, and `location` is the zone', () => {
    const filter = buildBrowseFilter({ reportType: 'FOUND', category: 'KEYS', colour: 'RED', location: 'MALE_HALLS' });
    expect(filter).toMatchObject({ reportType: 'FOUND', category: 'KEYS', colour: 'RED', generalLocation: 'MALE_HALLS' });
  });

  test('a date range is inclusive at both ends', () => {
    const from = new Date('2026-11-01T00:00:00.000Z');
    const to = new Date('2026-11-10T00:00:00.000Z');
    expect(buildBrowseFilter({ dateFrom: from, dateTo: to }).dateOccurred).toEqual({ $gte: from, $lte: to });
    expect(buildBrowseFilter({ dateFrom: from }).dateOccurred).toEqual({ $gte: from });
    expect(buildBrowseFilter({ dateTo: to }).dateOccurred).toEqual({ $lte: to });
    expect(buildBrowseFilter({}).dateOccurred).toBeUndefined();
  });

  test('no search text means no text conditions at all', () => {
    expect(buildBrowseFilter({}).$and).toBeUndefined();
    expect(buildBrowseFilter({ q: '   ' }).$and).toBeUndefined();
  });

  test('every word must match one of the PUBLIC fields; the pattern is the escaped word', () => {
    const filter = buildBrowseFilter({ q: 'Black head(phones' });
    expect(filter.$and).toHaveLength(2); // two words: BOTH must match (each in any one of the fields)
    expect(filter.$and[0].$or[0]).toEqual({ title: { $regex: 'black', $options: 'i' } });
    expect(filter.$and[1].$or[0]).toEqual({ title: { $regex: 'head\\(phones', $options: 'i' } }); // the ( is escaped
    for (const { $or } of filter.$and) {
      expect($or.map((condition) => Object.keys(condition)[0])).toEqual(['title', 'description', 'brand', 'locationDetail']);
    }
  });

  test('the zone name is searched too: "library" also matches reports whose zone is the library', () => {
    const conditions = buildBrowseFilter({ q: 'library' }).$and[0].$or;
    expect(conditions).toContainEqual({ generalLocation: { $in: ['LIBRARY'] } });
  });

  test('PRIVATE fields are never part of any search', () => {
    const json = JSON.stringify(buildBrowseFilter({ q: 'secret words here', category: 'KEYS' }));
    for (const privateField of ['privateDetails', 'privateStorageLocation', 'closeReason', 'reporterId']) {
      expect([privateField, json.includes(privateField)]).toEqual([privateField, false]);
    }
  });
});

describe('sortFor', () => {
  test('each option sorts the right way, and the id is always the final tie-breaker', () => {
    expect(sortFor('newest')).toEqual({ createdAt: -1, _id: -1 });
    expect(sortFor('oldest')).toEqual({ createdAt: 1, _id: 1 });
    expect(sortFor('eventNewest')).toEqual({ dateOccurred: -1, createdAt: -1, _id: -1 });
    expect(sortFor('eventOldest')).toEqual({ dateOccurred: 1, createdAt: 1, _id: 1 });
    for (const sort of SORTS) expect(Object.keys(sortFor(sort)).pop()).toBe('_id');
  });
  test('an unknown sort falls back to newest', () => {
    expect(sortFor('sideways')).toEqual(sortFor('newest'));
    expect(sortFor(undefined)).toEqual(sortFor('newest'));
  });
});

describe('listItemsQuery (the query-string rules for GET /items)', () => {
  test('with nothing sent: newest first, page 1, 20 per page', () => {
    expect(parse({}).data).toEqual({ sort: 'newest', page: 1, limit: 20 });
  });

  test('a full, valid request is accepted and cleaned', () => {
    const result = parse({
      q: '  head  ', reportType: 'FOUND', category: 'ELECTRONICS', colour: 'BLACK', location: 'MALE_HALLS',
      status: 'RETURNED', dateFrom: '2026-11-01', dateTo: '2026-11-30', sort: 'eventOldest', page: '2', limit: '10',
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ q: 'head', page: 2, limit: 10, sort: 'eventOldest' });
    expect(result.data.dateFrom).toEqual(new Date('2026-11-01T00:00:00.000Z'));
  });

  test('T-SRC-04: limit above 50 is refused, and so are 0, negatives, decimals and words', () => {
    for (const limit of ['51', '500', '0', '-1', '2.5', 'ten', '']) expect([limit, refusedFields({ limit })]).toEqual([limit, ['limit']]);
    expect(parse({ limit: '50' }).success).toBe(true);
    expect(parse({ limit: '1' }).success).toBe(true);
  });

  test('page must be a whole number from 1', () => {
    for (const page of ['0', '-3', '1.5', 'abc']) expect([page, refusedFields({ page })]).toEqual([page, ['page']]);
  });

  test('T-SRC-05: the search text must be 2 to 60 characters, and plain text', () => {
    expect(refusedFields({ q: 'a' })).toEqual(['q']);
    expect(refusedFields({ q: ' a ' })).toEqual(['q']);
    expect(refusedFields({ q: '' })).toEqual(['q']);
    expect(refusedFields({ q: 'x'.repeat(61) })).toEqual(['q']);
    expect(parse({ q: 'x'.repeat(60) }).success).toBe(true);
    expect(refusedFields({ q: 'bad\u0000text' })).toEqual(['q']);
    expect(parse({ q: '(.*)+$' }).success).toBe(true); // allowed: it is just text, and it is escaped later
  });

  test('T-SRC-06: operator-style and repeated values are refused', () => {
    expect(refusedFields({ category: { $ne: 'KEYS' } })).toEqual(['category']);
    expect(refusedFields({ status: { $in: ['OPEN'] } })).toEqual(['status']);
    expect(refusedFields({ q: { $regex: '.*' } })).toEqual(['q']);
    expect(refusedFields({ q: ['a1', 'b2'] })).toEqual(['q']);
    expect(refusedFields({ limit: ['2', '3'] })).toEqual(['limit']);
    expect(refusedFields({ 'category[$ne]': 'KEYS' })).toEqual(['(unknown field)']);
  });

  test('values must come from the allowed lists', () => {
    for (const [field, value] of [['reportType', 'MISSING'], ['category', 'FOOD'], ['colour', 'TURQUOISE'], ['location', 'MARS'], ['sort', 'sideways']]) {
      expect([field, refusedFields({ [field]: value })]).toEqual([field, [field]]);
    }
  });

  test('closed reports can never be requested; the other statuses can', () => {
    expect(refusedFields({ status: 'CLOSED' })).toEqual(['status']);
    for (const status of ['OPEN', 'POTENTIAL_MATCH', 'UNDER_VERIFICATION', 'APPROVED_FOR_RETURN', 'RETURNED']) {
      expect([status, parse({ status }).success]).toEqual([status, true]);
    }
  });

  test('dates: real calendar dates only, in YYYY-MM-DD, and the range must not run backwards', () => {
    for (const dateFrom of ['2026-02-30', '2026-13-01', '14/11/2026', 'yesterday', '2026-1-5']) {
      expect([dateFrom, refusedFields({ dateFrom })]).toEqual([dateFrom, ['dateFrom']]);
    }
    expect(refusedFields({ dateTo: '2026-99-99' })).toEqual(['dateTo']);
    expect(refusedFields({ dateFrom: '2026-12-31', dateTo: '2026-01-01' })).toEqual(['dateTo']);
    expect(parse({ dateFrom: '2026-11-14', dateTo: '2026-11-14' }).success).toBe(true); // a single day
  });

  test('a date filter may be in the future or long ago (the rules for NEW reports do not apply)', () => {
    expect(parse({ dateFrom: '2000-01-01', dateTo: '2099-12-31' }).success).toBe(true);
  });

  test('unknown parameters are refused rather than ignored', () => {
    expect(refusedFields({ colour: 'RED', mine: 'true' })).toEqual(['(unknown field)']);
    expect(refusedFields({ reporterId: '665f2a7e9b1d4a0012ab3501' })).toEqual(['(unknown field)']);
    expect(refusedFields({ privateDetails: 'x' })).toEqual(['(unknown field)']);
  });
});
