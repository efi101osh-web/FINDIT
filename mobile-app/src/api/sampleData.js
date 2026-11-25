// PREVIEW DATA, used only until the app is connected to the server (Stage 8).
// Everything here has the exact shape of the real API replies (documentation/API_CONTRACT.md),
// and tests/sampleData.test.js checks it against the backend so the two cannot drift apart.

import { previewZones } from './previewZones';
import { CATEGORY_LABELS, COLOUR_LABELS, REPORT_TYPE_LABELS, STATUS_LABELS, TIME_BAND_LABELS } from '../utils/labels';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - days * DAY_MS).toISOString();
};
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

// A full report as the OWNER would see it (the "detail" shape). The viewer-specific parts are
// added by the preview store: a report that is not yours never shows the private fields.
const detail = (id, fields) => ({
  image: null,
  isMine: false,
  locationDetail: null,
  brand: null,
  images: [],
  ...fields,
  id,
  updatedAt: fields.createdAt,
});

export const sampleDetails = [
  detail('s1', { reportType: 'LOST', title: 'Black wireless headphones', category: 'ELECTRONICS', colour: 'BLACK', brand: 'Sony', description: 'Over-ear wireless headphones in a black hard case.', generalLocation: 'LIBRARY', locationDetail: 'Main library, second floor', dateOccurred: daysAgo(0), approximateTime: 'AFTERNOON', status: 'OPEN', isMine: true, createdAt: hoursAgo(2), privateDetails: 'Small scratch on the left earcup; blue sticker inside the case.', closedAt: null, closeReason: null }),
  detail('s2', { reportType: 'FOUND', title: 'Set of keys on a red lanyard', category: 'KEYS', colour: 'RED', description: 'Three keys on a red lanyard, found on a bench outside.', generalLocation: 'MALE_HALLS', locationDetail: 'Winslow', dateOccurred: daysAgo(1), approximateTime: 'MORNING', status: 'OPEN', createdAt: hoursAgo(20), handedToOffice: true }),
  detail('s3', { reportType: 'FOUND', title: 'Blue backpack with a laptop sleeve', category: 'BAGS', colour: 'BLUE', brand: 'Adidas', description: 'Navy backpack with two front pockets and a laptop sleeve.', generalLocation: 'CLASSROOM', locationDetail: 'BBS Class 102', dateOccurred: daysAgo(2), approximateTime: 'AFTERNOON', status: 'POTENTIAL_MATCH', createdAt: hoursAgo(44), handedToOffice: false }),
  detail('s4', { reportType: 'LOST', title: 'Grey zip-up hoodie', category: 'CLOTHING', colour: 'GREY', description: 'Grey zip-up hoodie with a small logo on the chest.', generalLocation: 'FEMALE_HALLS', locationDetail: 'Queen Esther', dateOccurred: daysAgo(3), approximateTime: 'EVENING', status: 'OPEN', createdAt: hoursAgo(70) }),
  detail('s5', { reportType: 'LOST', title: 'Student ID card', category: 'WALLETS_AND_CARDS', colour: 'WHITE', description: 'White student identity card in a clear plastic holder.', generalLocation: 'CHURCH', locationDetail: 'Pioneer Church', dateOccurred: daysAgo(4), approximateTime: 'UNKNOWN', status: 'UNDER_VERIFICATION', isMine: true, createdAt: hoursAgo(95), privateDetails: 'There is a small tear at the top left corner.', closedAt: null, closeReason: null }),
  detail('s6', { reportType: 'FOUND', title: 'Scientific calculator', category: 'ELECTRONICS', colour: 'GREY', brand: 'Casio', description: 'Scientific calculator with a grey cover.', generalLocation: 'CAFETERIA', locationDetail: 'Old Cafeteria', dateOccurred: daysAgo(6), approximateTime: 'AFTERNOON', status: 'OPEN', createdAt: hoursAgo(140), handedToOffice: true }),
  detail('s7', { reportType: 'FOUND', title: 'Silver wrist watch', category: 'ACCESSORIES', colour: 'SILVER', description: 'Silver wrist watch with a leather strap.', generalLocation: 'GATES', locationDetail: 'Main gate', dateOccurred: daysAgo(9), approximateTime: 'MORNING', status: 'APPROVED_FOR_RETURN', createdAt: hoursAgo(210), handedToOffice: true }),
  detail('s8', { reportType: 'LOST', title: 'Chemistry textbook', category: 'BOOKS_AND_STATIONERY', colour: 'GREEN', description: 'Chemistry textbook with a green cover and notes in the margins.', generalLocation: 'NOT_SURE', dateOccurred: daysAgo(12), approximateTime: 'UNKNOWN', status: 'OPEN', createdAt: hoursAgo(290) }),
];

// The list-view shape (what GET /items returns for each report).
export const sampleItems = sampleDetails.map(({ id, reportType, title, category, colour, generalLocation, locationDetail, dateOccurred, status, image, isMine, createdAt }) => ({
  id, reportType, title, category, colour, generalLocation, locationDetail, dateOccurred, status, image, isMine, createdAt,
}));

// The same shape as GET /meta/options (documentation/API_CONTRACT.md section 4.2).
export const sampleOptions = {
  reportTypes: Object.keys(REPORT_TYPE_LABELS),
  categories: Object.keys(CATEGORY_LABELS),
  colours: Object.keys(COLOUR_LABELS),
  timeBands: Object.keys(TIME_BAND_LABELS),
  itemStatuses: Object.keys(STATUS_LABELS),
  contactPreferences: ['IN_APP', 'EMAIL', 'PHONE'],
  campusLocations: previewZones,
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
