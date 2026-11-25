// PREVIEW DATA, used only until the app is connected to the server (Stage 8).
// Everything here has the exact shape of the real API replies (documentation/API_CONTRACT.md),
// and tests/sampleData.test.js checks it against the backend so the two cannot drift apart.

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - days * DAY_MS).toISOString();
};
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const card = (id, fields) => ({ image: null, isMine: false, locationDetail: null, ...fields, id });

export const sampleItems = [
  card('s1', { reportType: 'LOST', title: 'Black wireless headphones', category: 'ELECTRONICS', colour: 'BLACK', generalLocation: 'LIBRARY', locationDetail: 'Main library, second floor', dateOccurred: daysAgo(0), status: 'OPEN', isMine: true, createdAt: hoursAgo(2) }),
  card('s2', { reportType: 'FOUND', title: 'Set of keys on a red lanyard', category: 'KEYS', colour: 'RED', generalLocation: 'MALE_HALLS', locationDetail: 'Winslow', dateOccurred: daysAgo(1), status: 'OPEN', createdAt: hoursAgo(20) }),
  card('s3', { reportType: 'FOUND', title: 'Blue backpack with a laptop sleeve', category: 'BAGS', colour: 'BLUE', generalLocation: 'CLASSROOM', locationDetail: 'BBS Class 102', dateOccurred: daysAgo(2), status: 'POTENTIAL_MATCH', createdAt: hoursAgo(44) }),
  card('s4', { reportType: 'LOST', title: 'Grey zip-up hoodie', category: 'CLOTHING', colour: 'GREY', generalLocation: 'FEMALE_HALLS', locationDetail: 'Queen Esther', dateOccurred: daysAgo(3), status: 'OPEN', createdAt: hoursAgo(70) }),
  card('s5', { reportType: 'LOST', title: 'Student ID card', category: 'WALLETS_AND_CARDS', colour: 'WHITE', generalLocation: 'CHURCH', locationDetail: 'Pioneer Church', dateOccurred: daysAgo(4), status: 'UNDER_VERIFICATION', isMine: true, createdAt: hoursAgo(95) }),
  card('s6', { reportType: 'FOUND', title: 'Scientific calculator', category: 'ELECTRONICS', colour: 'GREY', generalLocation: 'CAFETERIA', locationDetail: 'Old Cafeteria', dateOccurred: daysAgo(6), status: 'OPEN', createdAt: hoursAgo(140) }),
  card('s7', { reportType: 'FOUND', title: 'Silver wrist watch', category: 'ACCESSORIES', colour: 'SILVER', generalLocation: 'GATES', locationDetail: 'Main gate', dateOccurred: daysAgo(9), status: 'APPROVED_FOR_RETURN', createdAt: hoursAgo(210) }),
  card('s8', { reportType: 'LOST', title: 'Chemistry textbook', category: 'BOOKS_AND_STATIONERY', colour: 'GREEN', generalLocation: 'NOT_SURE', locationDetail: null, dateOccurred: daysAgo(12), status: 'OPEN', createdAt: hoursAgo(290) }),
];

// The same shape as GET /meta/options. Only the zones the sample reports use are included, and
// the lists are shortened. The real, complete list always comes from the server.
const zone = (code, label, mode, hint, options) => ({ code, label, detail: options ? { mode, hint, options } : { mode, hint } });

export const sampleOptions = {
  campusLocations: [
    zone('LIBRARY', 'Library', 'REQUIRED_TEXT', 'Which library, and which floor or section?'),
    zone('CLASSROOM', 'Lecture buildings and classrooms', 'REQUIRED_TEXT', 'Which building and class number? For example: BBS Class 102'),
    zone('MALE_HALLS', 'Halls of residence (male)', 'LIST', 'Which hall?', ['Winslow', 'Welch', 'Not sure which']),
    zone('FEMALE_HALLS', 'Halls of residence (female)', 'LIST', 'Which hall?', ['Queen Esther', 'Nyberg', 'Not sure which']),
    zone('CHURCH', 'Church or chapel', 'LIST', 'Which church or chapel?', ['Pioneer Church', 'Youth Church', 'Not sure which']),
    zone('CAFETERIA', 'Cafeteria and food areas', 'OPTIONAL_TEXT', 'Which cafeteria? For example: Old Cafeteria'),
    zone('GATES', 'Gates, roads and parking', 'OPTIONAL_TEXT', 'Which gate, road or car park?'),
    zone('NOT_SURE', 'Not sure, or somewhere else', 'OPTIONAL_TEXT', 'Anything that might help (optional)'),
  ],
};

export const sampleUserFor = ({ fullName, email }) => ({
  id: 'sample-user',
  fullName: fullName || String(email || 'Friend').split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  email: String(email || '').trim().toLowerCase(),
  role: 'user',
  phoneNumber: null,
  profileImage: null,
  contactPreference: 'IN_APP',
  accountStatus: 'ACTIVE',
  createdAt: new Date().toISOString(),
});
