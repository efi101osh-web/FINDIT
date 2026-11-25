import { CATEGORY_ICONS, CATEGORY_LABELS, COLOUR_LABELS, REPORT_TYPE_LABELS, STATUS_LABELS, labelFor } from '../src/utils/labels';
import { TAB_ICONS } from '../src/navigation/MainTabs';
import { zoneLabel, placeText, placeZoneLine } from '../src/utils/place';
import { describeWithBackend, fromBackend } from './helpers/backend';

const IONICONS = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');

describeWithBackend('every code the backend can send has a readable label', () => {
  let constants;
  beforeAll(() => {
    constants = fromBackend('src/config/constants.js');
  });

  test('categories, colours, report types and statuses', () => {
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual([...constants.CATEGORIES].sort());
    expect(Object.keys(COLOUR_LABELS).sort()).toEqual([...constants.COLOURS].sort());
    expect(Object.keys(REPORT_TYPE_LABELS).sort()).toEqual([...constants.REPORT_TYPES].sort());
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...constants.ITEM_STATUS_LIST].sort());
  });

  test('every category has an icon, and every icon is a real Ionicons name', () => {
    expect(Object.keys(CATEGORY_ICONS).sort()).toEqual([...constants.CATEGORIES].sort());
    for (const [category, icon] of Object.entries(CATEGORY_ICONS)) expect([category, icon in IONICONS]).toEqual([category, true]);
  });
});

test('every tab icon is a real Ionicons name', () => {
  for (const [tab, icons] of Object.entries(TAB_ICONS)) for (const icon of icons) expect([tab, icon, icon in IONICONS]).toEqual([tab, icon, true]);
});

test('no label is empty or just a code', () => {
  for (const map of [CATEGORY_LABELS, COLOUR_LABELS, STATUS_LABELS, REPORT_TYPE_LABELS]) {
    for (const [code, label] of Object.entries(map)) {
      expect(label.length).toBeGreaterThan(2);
      expect(label).not.toBe(code);
      expect(label).not.toMatch(/_/);
    }
  }
});

describe('labelFor', () => {
  test('uses the map, and tidies an unknown code instead of showing it raw', () => {
    expect(labelFor(CATEGORY_LABELS, 'KEYS')).toBe('Keys');
    expect(labelFor(CATEGORY_LABELS, 'NEW_THING')).toBe('New thing');
    expect(labelFor(CATEGORY_LABELS, undefined)).toBe('');
  });
});

describe('places', () => {
  const zones = [
    { code: 'MALE_HALLS', label: 'Halls of residence (male)' },
    { code: 'NOT_SURE', label: 'Not sure, or somewhere else' },
  ];
  test('the zone name comes from the server list', () => {
    expect(zoneLabel(zones, 'MALE_HALLS')).toBe('Halls of residence (male)');
    expect(zoneLabel(zones, 'MARS')).toBeNull();
    expect(zoneLabel(undefined, 'MALE_HALLS')).toBeNull();
  });
  test('a specific detail is shown first, with the zone as a second line', () => {
    expect(placeText(zones, 'MALE_HALLS', 'Winslow')).toBe('Winslow');
    expect(placeZoneLine(zones, 'MALE_HALLS', 'Winslow')).toBe('Halls of residence (male)');
  });
  test('"Not sure which" and no detail fall back to the zone name', () => {
    expect(placeText(zones, 'MALE_HALLS', 'Not sure which')).toBe('Halls of residence (male)');
    expect(placeText(zones, 'NOT_SURE', null)).toBe('Not sure, or somewhere else');
    expect(placeZoneLine(zones, 'MALE_HALLS', null)).toBeNull();
  });
  test('an unknown zone still reads sensibly', () => {
    expect(placeText([], 'MALE_HALLS', null)).toBe('Somewhere on campus');
    expect(placeText([], 'MALE_HALLS', 'Winslow')).toBe('Winslow');
  });
});
