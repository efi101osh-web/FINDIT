'use strict';

// The list of campus places and the rules that check a zone together with its detail.

const { LOCATION_ZONES, ZONE_CODES, NOT_SURE_WHICH, MAX_DETAIL_LENGTH, getZone, checkLocation } = require('../src/config/campusLocations');

const optionsOf = (code) => getZone(code).detail.options;
const problemsFor = (zone, detail) => checkLocation(zone, detail);

describe('the list of zones', () => {
  test('has unique codes, labels and a valid way of asking for detail', () => {
    expect(new Set(ZONE_CODES).size).toBe(ZONE_CODES.length);
    expect(new Set(LOCATION_ZONES.map((z) => z.label)).size).toBe(LOCATION_ZONES.length);
    for (const zone of LOCATION_ZONES) {
      expect(zone.code).toMatch(/^[A-Z_]+$/);
      expect(zone.label.length).toBeGreaterThan(2);
      expect(['LIST', 'REQUIRED_TEXT', 'OPTIONAL_TEXT']).toContain(zone.detail.mode);
      expect(zone.detail.hint.length).toBeGreaterThan(3);
    }
  });

  test('every zone that uses a list has real, unique, short names and ends with "Not sure which"', () => {
    for (const zone of LOCATION_ZONES.filter((z) => z.detail.mode === 'LIST')) {
      const options = zone.detail.options;
      expect(options.length).toBeGreaterThan(2);
      expect(new Set(options).size).toBe(options.length);
      expect(options[options.length - 1]).toBe(NOT_SURE_WHICH);
      for (const name of options) {
        expect(name.trim()).toBe(name);
        expect(name.length).toBeGreaterThan(2);
        expect(name.length).toBeLessThanOrEqual(MAX_DETAIL_LENGTH); // every name must fit the detail limit
      }
    }
  });

  test('the zones that are free text have no list, and the ones with a list are exactly the expected ones', () => {
    expect(LOCATION_ZONES.filter((z) => z.detail.mode === 'LIST').map((z) => z.code).sort()).toEqual(
      ['AUDITORIUM', 'CHURCH', 'FEMALE_HALLS', 'MALE_HALLS', 'OTHER_HALLS'].sort()
    );
    for (const zone of LOCATION_ZONES.filter((z) => z.detail.mode !== 'LIST')) expect(zone.detail.options).toBeUndefined();
  });

  test('no hall appears in both the male and the female list', () => {
    const real = (code) => optionsOf(code).filter((n) => n !== NOT_SURE_WHICH);
    const male = new Set(real('MALE_HALLS'));
    for (const name of [...real('FEMALE_HALLS'), ...real('OTHER_HALLS')]) expect(male.has(name)).toBe(false);
    const female = new Set(real('FEMALE_HALLS'));
    for (const name of real('OTHER_HALLS')) expect(female.has(name)).toBe(false);
  });

  test('contains the campus places the owner supplied (spot checks)', () => {
    expect(optionsOf('MALE_HALLS')).toEqual(expect.arrayContaining(['Winslow', 'Gideon Troopers', 'Neal Wilson', 'Welch', 'Bethel Splendor']));
    expect(optionsOf('FEMALE_HALLS')).toEqual(expect.arrayContaining(['Queen Esther', 'Crystal', 'Ameyo Adadevoh', 'Nyberg']));
    expect(optionsOf('CHURCH')).toEqual(expect.arrayContaining(['Pioneer Church', 'Youth Church', 'Ebenezer Chapel']));
    expect(optionsOf('CHURCH')).toHaveLength(29 + 1); // 29 churches and chapels plus "Not sure which"
    expect(getZone('LIBRARY').detail.mode).toBe('REQUIRED_TEXT');
    expect(getZone('CLASSROOM').detail.mode).toBe('REQUIRED_TEXT');
  });

  test('is a frozen structure that cannot be changed by accident', () => {
    expect(Object.isFrozen(LOCATION_ZONES)).toBe(true);
    expect(Object.isFrozen(optionsOf('CHURCH'))).toBe(true);
  });
});

describe('checkLocation', () => {
  test('LIST zones: a listed place is fine; missing or unlisted is refused on locationDetail', () => {
    expect(problemsFor('MALE_HALLS', 'Winslow')).toEqual([]);
    expect(problemsFor('MALE_HALLS', 'Not sure which')).toEqual([]);
    for (const bad of [undefined, null, '', '   ', 'Nyberg', 'winslow', 'Winslow Hall', 42]) {
      const problems = problemsFor('MALE_HALLS', bad);
      expect([bad, problems.length, problems[0] && problems[0].field]).toEqual([bad, 1, 'locationDetail']);
    }
  });

  test('a listed place is trimmed before it is compared', () => {
    expect(problemsFor('FEMALE_HALLS', '  Queen Esther  ')).toEqual([]);
  });

  test('REQUIRED_TEXT zones (library, classrooms): a short description is required', () => {
    expect(problemsFor('LIBRARY', 'Main library, 2nd floor')).toEqual([]);
    expect(problemsFor('CLASSROOM', 'BBS Class 102')).toEqual([]);
    for (const bad of [undefined, null, '', '  ', 'ab']) expect(problemsFor('LIBRARY', bad)).toHaveLength(1);
    expect(problemsFor('LIBRARY', 'x'.repeat(MAX_DETAIL_LENGTH + 1))).toHaveLength(1);
    expect(problemsFor('LIBRARY', 'x'.repeat(MAX_DETAIL_LENGTH))).toEqual([]);
    expect(problemsFor('LIBRARY', 'Bad\u0000text here')).toHaveLength(1);
    expect(problemsFor('LIBRARY', 12345)).toHaveLength(1);
  });

  test('OPTIONAL_TEXT zones: nothing is fine, but anything given must still be sensible', () => {
    for (const zone of ['CAFETERIA', 'SPORTS', 'HOSPITAL', 'ADMIN', 'SHOPS', 'GATES', 'IPERU', 'OFF_CAMPUS', 'NOT_SURE']) {
      expect([zone, problemsFor(zone)]).toEqual([zone, []]);
      expect([zone, problemsFor(zone, null)]).toEqual([zone, []]);
      expect([zone, problemsFor(zone, 'Old Cafeteria')]).toEqual([zone, []]);
      expect(problemsFor(zone, 'ab')).toHaveLength(1);
    }
  });

  test('an unknown zone is refused on generalLocation', () => {
    const problems = problemsFor('MARS', 'x');
    expect(problems).toHaveLength(1);
    expect(problems[0].field).toBe('generalLocation');
  });
});
