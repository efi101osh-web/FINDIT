'use strict';

// WHERE on campus a report is about. THIS IS THE ONLY FILE TO EDIT to change the places.
//
// How it works: a person first picks a ZONE (a general kind of place). Depending on the zone,
// the app then asks for a little more detail, in one of three ways:
//   LIST           pick one name from a fixed list (which hall, which church)
//   REQUIRED_TEXT  type a short description (which library, which class number)
//   OPTIONAL_TEXT  a short description if they want to give one
//
// The zone is used for matching lost and found reports (the detail adds to it when it is a
// list entry). It is only a HINT about where an item was last seen or found: items get moved,
// so every zone allows "Not sure", and a mismatch never rules a match out.
//
// The place names below come from the campus (Babcock University). Names of people and
// numbers such as room capacities are deliberately not stored.

const NOT_SURE_WHICH = 'Not sure which';
const MAX_DETAIL_LENGTH = 80;

const list = (names) => Object.freeze([...names, NOT_SURE_WHICH]);

const LOCATION_ZONES = Object.freeze([
  {
    code: 'LIBRARY',
    label: 'Library',
    detail: { mode: 'REQUIRED_TEXT', hint: 'Which library, and which floor or section?' },
  },
  {
    code: 'CLASSROOM',
    label: 'Lecture buildings and classrooms',
    detail: { mode: 'REQUIRED_TEXT', hint: 'Which building and class number? For example: BBS Class 102' },
  },
  {
    code: 'AUDITORIUM',
    label: 'Auditoriums, lecture theatres and halls',
    detail: {
      mode: 'LIST',
      hint: 'Which one?',
      options: list([
        'Amphitheatre',
        'Ameyoh Auditorium',
        'BBS Auditorium A',
        'BBS Auditorium B',
        'BBS Auditorium C',
        'Bethel Hall Auditorium',
        'Chiemela Ikonne LTA',
        'Crystal Hall Auditorium',
        'Diamond Hall',
        'FAD Hall Auditorium',
        'Law Activity Hall (Iperu campus)',
        'Nelson Mandela Auditorium',
        'Ogden Hall Auditorium',
        'Platinum Hall Auditorium',
        'Queen Esther Auditorium',
        'Samuel Akande Auditorium',
        'Sapphire Activity Hall',
        'Silvanus Chioma LTA',
        'White Hall Auditorium',
        'Youth Center',
      ]),
    },
  },
  {
    code: 'MALE_HALLS',
    label: 'Halls of residence (male)',
    detail: {
      mode: 'LIST',
      hint: 'Which hall?',
      options: list([
        'Bethel Splendor',
        'Emerald Hall',
        'Gamaliel Classic Hall (Iperu campus)',
        'Gamaliel Hall',
        'Gideon Troopers',
        'Neal Wilson',
        'Nelson Mandela',
        'Samuel Akande',
        'Topaz Hall',
        'Welch',
        'Winslow',
      ]),
    },
  },
  {
    code: 'FEMALE_HALLS',
    label: 'Halls of residence (female)',
    detail: {
      mode: 'LIST',
      hint: 'Which hall?',
      options: list([
        'Ameyo Adadevoh',
        'Crystal',
        'Felicia Adebisi Dada',
        'Havilah Gold',
        'Iperu Female Hall',
        'Justice Deborah',
        'Nyberg',
        'Ogden',
        'Platinum',
        'Queen Esther',
        'White',
      ]),
    },
  },
  {
    code: 'CHURCH',
    label: 'Church or chapel',
    detail: {
      mode: 'LIST',
      hint: 'Which church or chapel?',
      options: list([
        'Bethel Chapel',
        'Beula Chapel',
        'Canaan Land Chapel',
        'Christ Our Foundation Church',
        'Christ Our Shepherd Chapel',
        'Covenant Chapel',
        'Dominion Chapel',
        'Ebenezer Chapel',
        'Glory Land Chapel',
        'Grace Chapel',
        'Heir of the Kingdom Chapel',
        'Heritage Church',
        'Light House Chapel',
        'Living Springs',
        'Maranatha Chapel',
        'Millennium Chapel',
        'Mount Zion',
        'New Creation Chapel',
        'New Life Chapel',
        'Pioneer Church',
        'Praise Chapel',
        'Prince Emmanuel Chapel',
        'Redemption Chapel',
        'Shekainah Glory',
        'Siloam Valley Church',
        'Solid Rock Chapel',
        'Testimony Chapel',
        'Victory Land Chapel',
        'Youth Church',
      ]),
    },
  },
  { code: 'CAFETERIA', label: 'Cafeteria and food areas', detail: { mode: 'OPTIONAL_TEXT', hint: 'Which cafeteria? For example: Old Cafeteria' } },
  { code: 'SPORTS', label: 'Sports facilities, field and gym', detail: { mode: 'OPTIONAL_TEXT', hint: 'Which facility?' } },
  { code: 'HOSPITAL', label: 'Hospital or health centre', detail: { mode: 'OPTIONAL_TEXT', hint: 'Which part? For example: BUTH 600 Seater' } },
  { code: 'ADMIN', label: 'Administration buildings and offices', detail: { mode: 'OPTIONAL_TEXT', hint: 'Which office or building?' } },
  { code: 'SHOPS', label: 'Shops, bookshop and market area', detail: { mode: 'OPTIONAL_TEXT', hint: 'Which shop or area?' } },
  { code: 'GATES', label: 'Gates, roads and parking', detail: { mode: 'OPTIONAL_TEXT', hint: 'Which gate, road or car park?' } },
  { code: 'IPERU', label: 'Iperu-Remo campus (other places)', detail: { mode: 'OPTIONAL_TEXT', hint: 'Which place?' } },
  { code: 'OFF_CAMPUS', label: 'Off campus', detail: { mode: 'OPTIONAL_TEXT', hint: 'Which area or street?' } },
  { code: 'NOT_SURE', label: 'Not sure, or somewhere else', detail: { mode: 'OPTIONAL_TEXT', hint: 'Anything that might help (optional)' } },
]);

const ZONE_CODES = Object.freeze(LOCATION_ZONES.map((zone) => zone.code));
const zonesByCode = new Map(LOCATION_ZONES.map((zone) => [zone.code, zone]));

function getZone(code) {
  return zonesByCode.get(code);
}

/**
 * Checks a zone and its detail together. Returns a list of problems, each { field, message }
 * (empty when everything is fine). `detail` may be undefined, null or a string.
 */
function checkLocation(zoneCode, detail) {
  const zone = getZone(zoneCode);
  if (!zone) {
    return [{ field: 'generalLocation', message: `Choose one of: ${ZONE_CODES.join(', ')}.` }];
  }

  const value = typeof detail === 'string' ? detail.trim() : detail;
  const missing = value === undefined || value === null || value === '';
  const { mode, options } = zone.detail;

  if (mode === 'LIST') {
    if (missing) return [{ field: 'locationDetail', message: `Choose which one (${zone.detail.hint})` }];
    if (!options.includes(value)) {
      return [{ field: 'locationDetail', message: `Choose one of the listed places for "${zone.label}".` }];
    }
    return [];
  }

  if (missing) {
    return mode === 'REQUIRED_TEXT'
      ? [{ field: 'locationDetail', message: `Please add a short description. ${zone.detail.hint}` }]
      : [];
  }
  if (typeof value !== 'string') return [{ field: 'locationDetail', message: 'Location detail must be text.' }];
  if (value.length < 3) return [{ field: 'locationDetail', message: 'Location detail must be at least 3 characters.' }];
  if (value.length > MAX_DETAIL_LENGTH) {
    return [{ field: 'locationDetail', message: `Location detail must be at most ${MAX_DETAIL_LENGTH} characters.` }];
  }
  if (/[\u0000-\u001F\u007F]/.test(value)) {
    return [{ field: 'locationDetail', message: 'Location detail contains characters that are not allowed.' }];
  }
  return [];
}

module.exports = { LOCATION_ZONES, ZONE_CODES, NOT_SURE_WHICH, MAX_DETAIL_LENGTH, getZone, checkLocation };
