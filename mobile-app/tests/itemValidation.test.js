import { buildCreateBody, buildUpdateBody, daysBeforeIso, emptyValues, localIsoDate, valuesFromItem, validateReport } from '../src/utils/itemValidation';
import { previewZones } from '../src/api/previewZones';
import { describeWithBackend, fromBackend } from './helpers/backend';

const ZONES = previewZones;
const good = (over = {}) => ({
  ...emptyValues('LOST'),
  title: 'Black wireless headphones',
  category: 'ELECTRONICS',
  colour: 'BLACK',
  description: 'Over-ear wireless headphones in a black case.',
  generalLocation: 'LIBRARY',
  locationDetail: 'Main library, second floor',
  dateOccurred: daysBeforeIso(1),
  ...over,
});
const goodFound = (over = {}) => good({ reportType: 'FOUND', generalLocation: 'MALE_HALLS', locationDetail: 'Winslow', handedToOffice: true, privateStorageLocation: 'Security Office, shelf B', ...over });
const problems = (values) => validateReport(values, ZONES);
const onlyField = (values) => Object.keys(problems(values));

describe('a complete form', () => {
  test('a good lost report and a good found report have no problems', () => {
    expect(problems(good())).toEqual({});
    expect(problems(goodFound())).toEqual({});
  });
  test('an empty form lists every required box and nothing else', () => {
    expect(onlyField(emptyValues('LOST')).sort()).toEqual(['category', 'colour', 'dateOccurred', 'description', 'generalLocation', 'title']);
  });
});

describe('text boxes: the same limits as the server', () => {
  test.each([
    ['title', 2, 3, 80, 81],
    ['description', 9, 10, 1000, 1001],
  ])('%s: shortest %i fails, %i is fine, %i is fine, %i fails', (field, tooShort, short, long, tooLong) => {
    expect(onlyField(good({ [field]: 'x'.repeat(tooShort) }))).toEqual([field]);
    expect(onlyField(good({ [field]: 'x'.repeat(short) }))).toEqual([]);
    expect(onlyField(good({ [field]: 'x'.repeat(long) }))).toEqual([]);
    expect(onlyField(good({ [field]: 'x'.repeat(tooLong) }))).toEqual([field]);
  });
  test('spaces around the text do not count towards the length', () => {
    expect(onlyField(good({ title: '  ab  ' }))).toEqual(['title']);
    expect(onlyField(good({ title: '  abc  ' }))).toEqual([]);
  });
  test('optional boxes may be empty, but not too long', () => {
    expect(onlyField(good({ brand: '', privateDetails: '' }))).toEqual([]);
    expect(onlyField(good({ brand: 'x'.repeat(40) }))).toEqual([]);
    expect(onlyField(good({ brand: 'x'.repeat(41) }))).toEqual(['brand']);
    expect(onlyField(good({ privateDetails: 'x'.repeat(1001) }))).toEqual(['privateDetails']);
  });
  test('the storage place only matters (and is only checked) on a found report', () => {
    expect(onlyField(goodFound({ privateStorageLocation: 'x'.repeat(201) }))).toEqual(['privateStorageLocation']);
    expect(onlyField(good({ privateStorageLocation: 'x'.repeat(500) }))).toEqual([]);
  });
  test('line breaks are fine in the description, odd control characters are not', () => {
    expect(onlyField(good({ description: 'Over-ear headphones.\nIn a black case.' }))).toEqual([]);
    expect(onlyField(good({ description: 'Over-ear headphones\u0000in a case' }))).toEqual(['description']);
    expect(onlyField(good({ title: 'Black\nheadphones' }))).toEqual(['title']);
  });
  test('category and colour must be chosen', () => {
    expect(problems(good({ category: null })).category).toBe('Choose a category.');
    expect(problems(good({ colour: null })).colour).toBe('Choose a colour.');
  });
});

describe('the place: zone first, then the detail', () => {
  test('a zone must be chosen', () => {
    expect(problems(good({ generalLocation: null })).generalLocation).toBe('Choose the place.');
    expect(onlyField(good({ generalLocation: 'MARS' }))).toEqual(['generalLocation']);
  });
  test('a hall must come from that zone\'s list', () => {
    expect(onlyField(goodFound({ locationDetail: 'Winslow' }))).toEqual([]);
    expect(onlyField(goodFound({ locationDetail: '' }))).toEqual(['locationDetail']);
    expect(onlyField(goodFound({ locationDetail: 'Nyberg' }))).toEqual(['locationDetail']); // a female hall, in the male list
    expect(onlyField(goodFound({ locationDetail: 'Not sure which' }))).toEqual([]);
    expect(onlyField(goodFound({ generalLocation: 'FEMALE_HALLS', locationDetail: 'Nyberg' }))).toEqual([]);
  });
  test('the library and classrooms need a short description', () => {
    expect(onlyField(good({ generalLocation: 'LIBRARY', locationDetail: '' }))).toEqual(['locationDetail']);
    expect(onlyField(good({ generalLocation: 'CLASSROOM', locationDetail: 'ab' }))).toEqual(['locationDetail']);
    expect(onlyField(good({ generalLocation: 'CLASSROOM', locationDetail: 'x'.repeat(81) }))).toEqual(['locationDetail']);
    expect(onlyField(good({ generalLocation: 'CLASSROOM', locationDetail: 'BBS Class 102' }))).toEqual([]);
  });
  test('other zones need no detail, but if one is given it must be sensible', () => {
    expect(onlyField(good({ generalLocation: 'CAFETERIA', locationDetail: '' }))).toEqual([]);
    expect(onlyField(good({ generalLocation: 'CAFETERIA', locationDetail: 'Old Cafeteria' }))).toEqual([]);
    expect(onlyField(good({ generalLocation: 'CAFETERIA', locationDetail: 'ab' }))).toEqual(['locationDetail']);
    expect(onlyField(good({ generalLocation: 'NOT_SURE', locationDetail: '' }))).toEqual([]);
  });
});

describe('the date: the server\'s rules', () => {
  test('quick choices and today are fine', () => {
    for (const days of [0, 1, 2, 3, 30, 300]) expect([days, onlyField(good({ dateOccurred: daysBeforeIso(days) }))]).toEqual([days, []]);
  });
  test('tomorrow is allowed (a phone clock can run a day ahead), two days ahead is not', () => {
    expect(onlyField(good({ dateOccurred: daysBeforeIso(-1) }))).toEqual([]);
    expect(problems(good({ dateOccurred: daysBeforeIso(-3) })).dateOccurred).toBe('The date cannot be in the future.');
  });
  test('more than a year ago is refused', () => {
    expect(problems(good({ dateOccurred: daysBeforeIso(400) })).dateOccurred).toBe('The date cannot be more than a year ago.');
  });
  test('wrong formats and dates that do not exist are explained', () => {
    expect(problems(good({ dateOccurred: '' })).dateOccurred).toBe('Choose the date.');
    for (const bad of ['14/11/2026', '2026-1-5', 'yesterday', '20261114']) expect([bad, problems(good({ dateOccurred: bad })).dateOccurred]).toEqual([bad, 'Use the date format YYYY-MM-DD, for example 2026-11-14.']);
    for (const bad of ['2026-02-30', '2026-13-01', '2026-00-10']) expect([bad, problems(good({ dateOccurred: bad })).dateOccurred]).toEqual([bad, 'That date does not exist.']);
  });
  test('local dates are written the way the server wants them', () => {
    expect(localIsoDate(new Date(2026, 10, 5))).toBe('2026-11-05');
    expect(daysBeforeIso(1, new Date(2026, 2, 1))).toBe('2026-02-28');
    expect(daysBeforeIso(0, new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(daysBeforeIso(1, new Date(2026, 0, 1))).toBe('2025-12-31');
  });
});

describe('buildCreateBody: what is sent to the server', () => {
  test('trims the text and sends only what was filled in', () => {
    expect(buildCreateBody(good({ title: '  Black headphones  ', brand: '   ', privateDetails: '' }))).toEqual({
      reportType: 'LOST', title: 'Black headphones', category: 'ELECTRONICS', description: 'Over-ear wireless headphones in a black case.',
      colour: 'BLACK', generalLocation: 'LIBRARY', locationDetail: 'Main library, second floor', dateOccurred: daysBeforeIso(1), approximateTime: 'UNKNOWN',
    });
  });
  test('the description is trimmed too, like every other text box', () => {
    expect(buildCreateBody(good({ description: '   Over-ear headphones in a case.   ' })).description).toBe('Over-ear headphones in a case.');
    expect(buildCreateBody(good({ description: '  Line one.\nLine two.  ' })).description).toBe('Line one.\nLine two.');
  });
  test('a lost report never carries the found-only fields, even if they were typed before switching', () => {
    const body = buildCreateBody(good({ handedToOffice: true, privateStorageLocation: 'Shelf B' }));
    expect(body).not.toHaveProperty('handedToOffice');
    expect(body).not.toHaveProperty('privateStorageLocation');
  });
  test('a found report sends whether it was handed in, and where it is kept', () => {
    expect(buildCreateBody(goodFound())).toMatchObject({ handedToOffice: true, privateStorageLocation: 'Security Office, shelf B' });
    expect(buildCreateBody(goodFound({ handedToOffice: false, privateStorageLocation: '' }))).toMatchObject({ handedToOffice: false });
    expect(buildCreateBody(goodFound({ privateStorageLocation: '' }))).not.toHaveProperty('privateStorageLocation');
  });
  test('only fields the server accepts are ever sent (never a status, an owner or an image)', () => {
    const allowed = ['reportType', 'title', 'category', 'description', 'colour', 'brand', 'generalLocation', 'locationDetail', 'dateOccurred', 'approximateTime', 'privateDetails', 'handedToOffice', 'privateStorageLocation'];
    for (const body of [buildCreateBody(good({ brand: 'Sony', privateDetails: 'x' })), buildCreateBody(goodFound({ brand: 'Sony', privateDetails: 'x' }))]) {
      for (const key of Object.keys(body)) expect(allowed).toContain(key);
    }
  });
});

describe('editing: only what changed is sent', () => {
  const item = {
    id: 'a', reportType: 'FOUND', title: 'Set of keys', category: 'KEYS', colour: 'RED', brand: null, description: 'Three keys on a red lanyard.',
    generalLocation: 'MALE_HALLS', locationDetail: 'Winslow', dateOccurred: '2026-11-24T00:00:00.000Z', approximateTime: 'MORNING',
    handedToOffice: true, privateDetails: 'Green rubber cap on one key.', privateStorageLocation: 'Security Office',
  };
  const edited = (over) => ({ ...valuesFromItem(item), ...over });

  test('values taken from a report give back an empty change', () => {
    expect(buildUpdateBody(item, valuesFromItem(item))).toEqual({});
  });
  test('the date comes back as the same day', () => {
    expect(valuesFromItem(item).dateOccurred).toBe('2026-11-24');
  });
  test('a changed title is the only thing sent', () => {
    expect(buildUpdateBody(item, edited({ title: ' Keys on a lanyard ' }))).toEqual({ title: 'Keys on a lanyard' });
  });
  test('emptied optional boxes are sent as null, meaning "remove"', () => {
    expect(buildUpdateBody(item, edited({ privateDetails: '' }))).toEqual({ privateDetails: null });
    expect(buildUpdateBody(item, edited({ privateStorageLocation: '  ' }))).toEqual({ privateStorageLocation: null });
    expect(buildUpdateBody({ ...item, brand: 'Sony' }, edited({ brand: '' }))).toEqual({ brand: null });
  });
  test('changing the zone sends the new zone and the new detail, not the old detail', () => {
    expect(buildUpdateBody(item, edited({ generalLocation: 'FEMALE_HALLS', locationDetail: 'Queen Esther' }))).toEqual({ generalLocation: 'FEMALE_HALLS', locationDetail: 'Queen Esther' });
    expect(buildUpdateBody(item, edited({ generalLocation: 'NOT_SURE', locationDetail: '' }))).toEqual({ generalLocation: 'NOT_SURE' });
  });
  test('changing only the detail within the same zone', () => {
    expect(buildUpdateBody(item, edited({ locationDetail: 'Welch' }))).toEqual({ locationDetail: 'Welch' });
    expect(buildUpdateBody({ ...item, generalLocation: 'CAFETERIA', locationDetail: 'Old Cafeteria' }, edited({ generalLocation: 'CAFETERIA', locationDetail: '' }))).toEqual({ locationDetail: null });
  });
  test('found-only changes', () => {
    expect(buildUpdateBody(item, edited({ handedToOffice: false }))).toEqual({ handedToOffice: false });
  });
  test('a lost report never sends found-only fields, and the type is never sent', () => {
    const lost = { ...item, reportType: 'LOST', handedToOffice: undefined, privateStorageLocation: undefined };
    const changes = buildUpdateBody(lost, { ...valuesFromItem(lost), handedToOffice: true, privateStorageLocation: 'x', reportType: 'FOUND' });
    expect(changes).toEqual({});
    expect(buildUpdateBody(item, edited({ reportType: 'LOST' }))).not.toHaveProperty('reportType');
  });
  test('time of day, category, colour and date', () => {
    expect(buildUpdateBody(item, edited({ approximateTime: 'NIGHT', category: 'BAGS', colour: 'BLUE', dateOccurred: '2026-11-23' }))).toEqual({ approximateTime: 'NIGHT', category: 'BAGS', colour: 'BLUE', dateOccurred: '2026-11-23' });
  });
});

describeWithBackend('the form and the SERVER give the same yes or no', () => {
  let schema;
  beforeAll(() => {
    schema = fromBackend('src/validators/itemValidators.js').createItemSchema;
  });

  const cases = {
    'a good lost report': good(),
    'a good found report': goodFound(),
    'a short title': good({ title: 'ab' }),
    'a title of exactly 3': good({ title: 'abc' }),
    'a title of 81': good({ title: 'x'.repeat(81) }),
    'a short description': good({ description: 'too short' }),
    'a description of 1000': good({ description: 'x'.repeat(1000) }),
    'a description of 1001': good({ description: 'x'.repeat(1001) }),
    'a brand of 41': good({ brand: 'x'.repeat(41) }),
    'private details of 1001': good({ privateDetails: 'x'.repeat(1001) }),
    'a storage place of 201 (found)': goodFound({ privateStorageLocation: 'x'.repeat(201) }),
    'a library with no description': good({ locationDetail: '' }),
    'a hall from the wrong zone': goodFound({ locationDetail: 'Nyberg' }),
    'a hall chosen as Not sure which': goodFound({ locationDetail: 'Not sure which' }),
    'a hall with no choice': goodFound({ locationDetail: '' }),
    'a classroom with a 2 letter detail': good({ generalLocation: 'CLASSROOM', locationDetail: 'ab' }),
    'a cafeteria with no detail': good({ generalLocation: 'CAFETERIA', locationDetail: '' }),
    'a church from the list': goodFound({ generalLocation: 'CHURCH', locationDetail: 'Pioneer Church' }),
    'tomorrow': good({ dateOccurred: daysBeforeIso(-1) }),
    'three days ahead': good({ dateOccurred: daysBeforeIso(-3) }),
    'a date 400 days ago': good({ dateOccurred: daysBeforeIso(400) }),
    'a date 300 days ago': good({ dateOccurred: daysBeforeIso(300) }),
    'an impossible date': good({ dateOccurred: '2026-02-30' }),
    'a badly formatted date': good({ dateOccurred: '14/11/2026' }),
    'a description with a line break': good({ description: 'Over-ear headphones.\nIn a black case.' }),
    'a title with a control character': good({ title: 'Black\u0000headphones' }),
  };

  test.each(Object.entries(cases))('%s', (name, values) => {
    const serverAccepts = schema.safeParse(buildCreateBody(values)).success;
    const formAccepts = Object.keys(problems(values)).length === 0;
    expect([name, formAccepts]).toEqual([name, serverAccepts]);
  });

  test('the place rules: every zone and every hall, church and auditorium name is accepted by both', () => {
    const { checkLocation, LOCATION_ZONES } = fromBackend('src/config/campusLocations.js');
    for (const zone of LOCATION_ZONES) {
      const details = zone.detail.mode === 'LIST' ? zone.detail.options : ['A sensible place', '', 'ab'];
      for (const detail of details) {
        const server = checkLocation(zone.code, detail || undefined).length === 0;
        const form = !validateReport({ ...good({ generalLocation: zone.code, locationDetail: detail }) }, ZONES).locationDetail;
        expect([zone.code, detail, form]).toEqual([zone.code, detail, server]);
      }
    }
  });
});
