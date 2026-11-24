'use strict';

// Fixed lists of allowed values, defined once so every part of the backend agrees.
// (See documentation/DATABASE_SCHEMA.md section 3. More lists are added as their
// stages arrive.)

const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
  RECOVERY_OFFICER: 'recovery_officer',
});
const ROLE_LIST = Object.freeze(Object.values(ROLES));

const ACCOUNT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
});
const ACCOUNT_STATUS_LIST = Object.freeze(Object.values(ACCOUNT_STATUSES));

// How staff should contact a user. This never exposes contact details to other users.
const CONTACT_PREFERENCES = Object.freeze(['IN_APP', 'EMAIL', 'PHONE']);

// ---- Lost and found reports (Stage 5) -----------------------------------------------------

const REPORT_TYPES = Object.freeze(['LOST', 'FOUND']);

const CATEGORIES = Object.freeze([
  'ELECTRONICS',
  'BAGS',
  'WALLETS_AND_CARDS', // includes student ID cards
  'KEYS',
  'CLOTHING',
  'ACCESSORIES',
  'DOCUMENTS',
  'BOOKS_AND_STATIONERY',
  'SPORTS_EQUIPMENT',
  'OTHER',
]);

const COLOURS = Object.freeze([
  'BLACK', 'WHITE', 'GREY', 'SILVER', 'RED', 'ORANGE', 'YELLOW', 'GREEN',
  'BLUE', 'PURPLE', 'PINK', 'BROWN', 'BEIGE', 'GOLD', 'MULTICOLOUR', 'OTHER',
]);

// Roughly when during the day. Easy to pick on a phone, and easy to compare when matching.
const TIME_BANDS = Object.freeze([
  'MORNING', // 06:00 to 12:00
  'AFTERNOON', // 12:00 to 17:00
  'EVENING', // 17:00 to 21:00
  'NIGHT', // 21:00 to 06:00
  'UNKNOWN',
]);

const ITEM_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  POTENTIAL_MATCH: 'POTENTIAL_MATCH',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  APPROVED_FOR_RETURN: 'APPROVED_FOR_RETURN',
  RETURNED: 'RETURNED',
  CLOSED: 'CLOSED',
});
const ITEM_STATUS_LIST = Object.freeze(Object.values(ITEM_STATUSES));

module.exports = {
  REPORT_TYPES,
  CATEGORIES,
  COLOURS,
  TIME_BANDS,
  ITEM_STATUSES,
  ITEM_STATUS_LIST,
  ROLES,
  ROLE_LIST,
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LIST,
  CONTACT_PREFERENCES,
};
