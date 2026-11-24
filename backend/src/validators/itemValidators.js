'use strict';

// The exact shape each report endpoint accepts. Every schema is "strict": any field that is
// not listed is REFUSED. That is how a client can never send `status`, `reporterId` or
// `reportType` (on an edit) and have them obeyed.

const { z } = require('zod');
const { REPORT_TYPES, CATEGORIES, COLOURS, TIME_BANDS, ITEM_STATUS_LIST, BROWSABLE_ITEM_STATUSES } = require('../config/constants');
const { ZONE_CODES, checkLocation } = require('../config/campusLocations');

const oneOf = (values, label) => z.enum(values, { error: `${label} must be one of: ${values.join(', ')}.` });

const noControlChars = (value) => !/[\u0000-\u001F\u007F]/.test(value);
// Descriptions may contain line breaks and tabs, but no other control characters.
const noControlCharsExceptNewlines = (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);

const text = (label, min, max, { newlines = false } = {}) =>
  z
    .string({ error: `${label} must be text.` })
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`)
    .refine(newlines ? noControlCharsExceptNewlines : noControlChars, `${label} contains characters that are not allowed.`);

// ---- the date the item was lost or found -----------------------------------------------------
// Only the DATE matters (the time of day is a separate "morning / afternoon..." choice), so the
// format is YYYY-MM-DD. Two sanity rules: not in the future, and not more than a year ago.
// "Not in the future" allows one day of slack, because a phone in Nigeria can already be on
// tomorrow's date while the server's clock (UTC) is still on today's.
const DAY_MS = 24 * 60 * 60 * 1000;

const isRealCalendarDate = (value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const dateOccurred = z
  .string({ error: 'Date must be text in the form YYYY-MM-DD.' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD, for example 2026-11-14.')
  .refine(isRealCalendarDate, 'That date does not exist.')
  .refine((value) => new Date(`${value}T00:00:00.000Z`).getTime() <= Date.now() + DAY_MS, 'The date cannot be in the future.')
  .refine((value) => new Date(`${value}T00:00:00.000Z`).getTime() >= Date.now() - 365 * DAY_MS, 'The date cannot be more than a year ago.')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

// ---- fields ---------------------------------------------------------------------------------
const reportType = oneOf(REPORT_TYPES, 'Report type');
const title = text('Item name', 3, 80);
const category = oneOf(CATEGORIES, 'Category');
const description = text('Description', 10, 1000, { newlines: true });
const colour = oneOf(COLOURS, 'Colour');
const brand = text('Brand', 1, 40);
const privateDetails = text('Private details', 1, 1000, { newlines: true });
const generalLocation = oneOf(ZONE_CODES, 'Location');
const locationDetail = z.string({ error: 'Location detail must be text.' }).max(80, 'Location detail must be at most 80 characters.');
const approximateTime = oneOf(TIME_BANDS, 'Time of day');
const handedToOffice = z.boolean({ error: 'handedToOffice must be true or false.' });
const privateStorageLocation = text('Storage location', 1, 200);

// Adds the location rules (which depend on the chosen zone) as problems on the right field.
function addLocationProblems(zoneCode, detail, ctx) {
  for (const problem of checkLocation(zoneCode, detail)) {
    ctx.addIssue({ code: 'custom', path: [problem.field], message: problem.message });
  }
}

const createItemSchema = z
  .strictObject({
    reportType,
    title,
    category,
    description,
    colour,
    brand: brand.optional(),
    generalLocation,
    locationDetail: locationDetail.optional(),
    dateOccurred,
    approximateTime: approximateTime.optional(),
    privateDetails: privateDetails.optional(),
    handedToOffice: handedToOffice.optional(),
    privateStorageLocation: privateStorageLocation.optional(),
  })
  .superRefine((value, ctx) => {
    addLocationProblems(value.generalLocation, value.locationDetail, ctx);
    if (value.reportType === 'LOST') {
      for (const field of ['handedToOffice', 'privateStorageLocation']) {
        if (value[field] !== undefined) {
          ctx.addIssue({ code: 'custom', path: [field], message: 'Only found reports can have this.' });
        }
      }
    }
  });

// PATCH /items/:id: send only what changes. reportType, status and reporterId are NOT here.
// `null` clears an optional field. The location rules for the RESULTING place are checked in
// the service, because they depend on what the report currently says.
const updateItemSchema = z
  .strictObject({
    title: title.optional(),
    category: category.optional(),
    description: description.optional(),
    colour: colour.optional(),
    brand: brand.nullable().optional(),
    generalLocation: generalLocation.optional(),
    locationDetail: locationDetail.nullable().optional(),
    dateOccurred: dateOccurred.optional(),
    approximateTime: approximateTime.optional(),
    privateDetails: privateDetails.nullable().optional(),
    handedToOffice: handedToOffice.optional(),
    privateStorageLocation: privateStorageLocation.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Send at least one field to change.',
    when: (payload) => payload.issues.length === 0,
  });

const closeItemSchema = z.strictObject({ reason: text('Reason', 1, 200).optional() });

const idParams = z.strictObject({
  id: z.string({ error: 'The id must be text.' }).regex(/^[0-9a-fA-F]{24}$/, 'That is not a valid id.'),
});

const listMineQuery = z.strictObject({
  reportType: reportType.optional(),
  status: oneOf(ITEM_STATUS_LIST, 'Status').optional(),
  page: z.coerce.number({ error: 'page must be a number.' }).int('page must be a whole number.').min(1, 'page starts at 1.').max(100000).default(1),
  limit: z.coerce.number({ error: 'limit must be a number.' }).int('limit must be a whole number.').min(1, 'limit starts at 1.').max(50, 'limit can be at most 50.').default(20),
});

// ---- GET /items: browse and search everyone's (public) reports ---------------------------------
const SORTS = Object.freeze(['newest', 'oldest', 'eventNewest', 'eventOldest']);

// A date used as a FILTER: any real calendar date (the "not in the future" rules are for new reports only).
const filterDate = (label) =>
  z
    .string({ error: `${label} must be text in the form YYYY-MM-DD.` })
    .trim()
    // abort: if the format is wrong, say so once and stop (no second "does not exist" message)
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: `${label}: use the date format YYYY-MM-DD, for example 2026-11-14.`, abort: true })
    .refine(isRealCalendarDate, `${label}: that date does not exist.`)
    .transform((value) => new Date(`${value}T00:00:00.000Z`));

const page = z.coerce.number({ error: 'page must be a number.' }).int('page must be a whole number.').min(1, 'page starts at 1.').max(100000).default(1);
const limit = z.coerce.number({ error: 'limit must be a number.' }).int('limit must be a whole number.').min(1, 'limit starts at 1.').max(50, 'limit can be at most 50.').default(20);

const listItemsQuery = z
  .strictObject({
    q: text('Search text', 2, 60).optional(),
    reportType: reportType.optional(),
    category: category.optional(),
    colour: colour.optional(),
    location: generalLocation.optional(),
    // CLOSED is deliberately not allowed: closed reports are never public.
    status: oneOf(BROWSABLE_ITEM_STATUSES, 'Status').optional(),
    dateFrom: filterDate('dateFrom').optional(),
    dateTo: filterDate('dateTo').optional(),
    sort: oneOf(SORTS, 'Sort').default('newest'),
    page,
    limit,
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    path: ['dateTo'],
    error: 'dateTo must not be earlier than dateFrom.',
    when: (payload) => payload.issues.length === 0,
  });

module.exports = { createItemSchema, updateItemSchema, closeItemSchema, idParams, listMineQuery, listItemsQuery, SORTS };
