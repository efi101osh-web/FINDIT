// The checks on the report form, and the conversion of the form into what the server expects.
// The rules are the SAME as the server's (backend/src/validators/itemValidators.js and
// backend/src/config/campusLocations.js). They give instant feedback; the server re-checks everything
// and its answer is the one that counts. tests/itemValidation.test.js compares the two.

import { detailRule } from './place';

export const NOT_SURE_WHICH = 'Not sure which';
export const MAX_DETAIL_LENGTH = 80;
const DAY_MS = 24 * 60 * 60 * 1000;
const CONTROL = /[\u0000-\u001F\u007F]/;
const CONTROL_EXCEPT_NEWLINES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** Today's date as the phone shows it, in the form the server wants: "2026-11-25". */
export function localIsoDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The date `days` before `now` (phone time), as "YYYY-MM-DD". */
export function daysBeforeIso(days, now = new Date()) {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  base.setDate(base.getDate() - days);
  return localIsoDate(base);
}

function textProblem(label, raw, { min, max, required = false, newlines = false }) {
  const text = String(raw || '').trim();
  if (text.length === 0) return required ? `Enter ${label.toLowerCase()}.` : null;
  if (text.length < min) return `${label} must be at least ${min} characters.`;
  if (text.length > max) return `${label} must be at most ${max} characters.`;
  if ((newlines ? CONTROL_EXCEPT_NEWLINES : CONTROL).test(text)) return `${label} contains characters that are not allowed.`;
  return null;
}

function dateProblem(raw, nowMs) {
  const value = String(raw || '').trim();
  if (!value) return 'Choose the date.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Use the date format YYYY-MM-DD, for example 2026-11-14.';
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return 'That date does not exist.';
  if (parsed.getTime() > nowMs + DAY_MS) return 'The date cannot be in the future.';
  if (parsed.getTime() < nowMs - 365 * DAY_MS) return 'The date cannot be more than a year ago.';
  return null;
}

function placeProblem(zones, zoneCode, detailRaw) {
  const rule = detailRule(zones, zoneCode);
  const detail = String(detailRaw || '').trim();
  if (!rule) return null;
  if (rule.mode === 'LIST') {
    if (!detail) return `Choose one. ${rule.hint}`;
    return rule.options.includes(detail) ? null : 'Choose one of the listed places.';
  }
  if (!detail) return rule.mode === 'REQUIRED_TEXT' ? `Please add a short description. ${rule.hint}` : null;
  if (detail.length < 3) return 'Location detail must be at least 3 characters.';
  if (detail.length > MAX_DETAIL_LENGTH) return `Location detail must be at most ${MAX_DETAIL_LENGTH} characters.`;
  if (CONTROL.test(detail)) return 'Location detail contains characters that are not allowed.';
  return null;
}

/** Returns { field: message } for everything wrong (an empty object when the form is fine). */
export function validateReport(values, zones, now = Date.now()) {
  const errors = {};
  const set = (field, message) => {
    if (message) errors[field] = message;
  };
  set('title', textProblem('Item name', values.title, { min: 3, max: 80, required: true }));
  set('category', values.category ? null : 'Choose a category.');
  set('colour', values.colour ? null : 'Choose a colour.');
  set('description', textProblem('Description', values.description, { min: 10, max: 1000, required: true, newlines: true }));
  set('brand', textProblem('Brand', values.brand, { min: 1, max: 40 }));
  if (!values.generalLocation || !detailRule(zones, values.generalLocation)) {
    set('generalLocation', 'Choose the place.');
  } else {
    set('locationDetail', placeProblem(zones, values.generalLocation, values.locationDetail));
  }
  set('dateOccurred', dateProblem(values.dateOccurred, now));
  set('privateDetails', textProblem('Private details', values.privateDetails, { min: 1, max: 1000, newlines: true }));
  if (values.reportType === 'FOUND') {
    set('privateStorageLocation', textProblem('Storage location', values.privateStorageLocation, { min: 1, max: 200 }));
  }
  return errors;
}

const trimmed = (value) => String(value || '').trim();

/** The body for POST /items. Optional boxes left empty are simply not sent. */
export function buildCreateBody(values) {
  const body = {
    reportType: values.reportType,
    title: trimmed(values.title),
    category: values.category,
    description: trimmed(values.description),
    colour: values.colour,
    generalLocation: values.generalLocation,
    dateOccurred: trimmed(values.dateOccurred),
    approximateTime: values.approximateTime || 'UNKNOWN',
  };
  if (trimmed(values.brand)) body.brand = trimmed(values.brand);
  if (trimmed(values.locationDetail)) body.locationDetail = trimmed(values.locationDetail);
  if (trimmed(values.privateDetails)) body.privateDetails = trimmed(values.privateDetails);
  if (values.reportType === 'FOUND') {
    body.handedToOffice = Boolean(values.handedToOffice);
    if (trimmed(values.privateStorageLocation)) body.privateStorageLocation = trimmed(values.privateStorageLocation);
  }
  return body;
}

/** The form's values for an existing report (the owner's view), ready to edit. */
export function valuesFromItem(item) {
  return {
    reportType: item.reportType,
    title: item.title,
    category: item.category,
    colour: item.colour,
    description: item.description,
    brand: item.brand || '',
    generalLocation: item.generalLocation,
    locationDetail: item.locationDetail || '',
    dateOccurred: String(item.dateOccurred).slice(0, 10),
    approximateTime: item.approximateTime || 'UNKNOWN',
    privateDetails: item.privateDetails || '',
    handedToOffice: Boolean(item.handedToOffice),
    privateStorageLocation: item.privateStorageLocation || '',
  };
}

export const emptyValues = (reportType = 'LOST') => ({
  reportType,
  title: '',
  category: null,
  colour: null,
  description: '',
  brand: '',
  generalLocation: null,
  locationDetail: '',
  dateOccurred: '',
  approximateTime: 'UNKNOWN',
  privateDetails: '',
  handedToOffice: false,
  privateStorageLocation: '',
});

/**
 * The body for PATCH /items/:id: ONLY what changed. A box the person emptied is sent as null
 * (the server's way of saying "remove this"). reportType can never change.
 */
export function buildUpdateBody(item, values) {
  const changes = {};
  const text = (field, itemValue = item[field]) => {
    const now = trimmed(values[field]);
    if (now !== trimmed(itemValue)) changes[field] = now;
  };
  const optional = (field) => {
    const now = trimmed(values[field]);
    if (now !== trimmed(item[field])) changes[field] = now || null;
  };
  text('title');
  text('description');
  optional('brand');
  optional('privateDetails');
  for (const field of ['category', 'colour', 'approximateTime']) if (values[field] !== item[field]) changes[field] = values[field];
  if (trimmed(values.dateOccurred) !== String(item.dateOccurred).slice(0, 10)) changes.dateOccurred = trimmed(values.dateOccurred);

  const detail = trimmed(values.locationDetail);
  if (values.generalLocation !== item.generalLocation) {
    changes.generalLocation = values.generalLocation;
    if (detail) changes.locationDetail = detail; // the server drops the old detail on a zone change
  } else if (detail !== trimmed(item.locationDetail)) {
    changes.locationDetail = detail || null;
  }

  if (item.reportType === 'FOUND') {
    if (Boolean(values.handedToOffice) !== Boolean(item.handedToOffice)) changes.handedToOffice = Boolean(values.handedToOffice);
    optional('privateStorageLocation');
  }
  return changes;
}
