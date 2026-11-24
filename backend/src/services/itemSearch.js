'use strict';

// Turns the browse/search request into a database query. Kept separate from the database code
// so it can be tested without a database.
//
// Safety rules (see documentation/DECISIONS.md D-037):
//   * The typed text is ESCAPED before it goes into a pattern, so characters such as . * ( ) [ ]
//     are plain letters, never a pattern. That also makes slow "catastrophic" patterns impossible.
//   * Only PUBLIC fields are searched: title, description, brand and the place. The private
//     details and the private storage location are never part of a search, so a person cannot
//     guess a secret by searching for it.
//   * CLOSED reports never match, whatever the request says.

const { ACTIVE_ITEM_STATUSES, BROWSABLE_ITEM_STATUSES } = require('../config/constants');
const { LOCATION_ZONES } = require('../config/campusLocations');

const MAX_WORDS = 5; // a search of many words is cut to the first few, to keep the query cheap

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "Black  Headphones" -> ["black", "headphones"] (lower case, no repeats, at most MAX_WORDS) */
function splitWords(text) {
  const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
  return [...new Set(words)].slice(0, MAX_WORDS);
}

/** The zones whose NAME contains the word, e.g. "hall" finds both halls-of-residence zones. */
function zoneCodesMatching(word) {
  return LOCATION_ZONES.filter((zone) => zone.label.toLowerCase().includes(word)).map((zone) => zone.code);
}

/** Every word must match somewhere (title, description, brand, place detail, or the zone's name). */
function buildTextFilter(q) {
  const words = splitWords(q);
  return words.map((word) => {
    const matches = { $regex: escapeRegex(word), $options: 'i' };
    const places = zoneCodesMatching(word);
    return {
      $or: [
        { title: matches },
        { description: matches },
        { brand: matches },
        { locationDetail: matches },
        ...(places.length > 0 ? [{ generalLocation: { $in: places } }] : []),
      ],
    };
  });
}

function buildBrowseFilter({ q, reportType, category, colour, location, status, dateFrom, dateTo } = {}) {
  // The validator already refuses CLOSED. As a second safety belt, a status that may not be browsed
  // (CLOSED, or anything unknown) matches NOTHING rather than being allowed through.
  let statusFilter = { $in: ACTIVE_ITEM_STATUSES };
  if (status) statusFilter = BROWSABLE_ITEM_STATUSES.includes(status) ? status : { $in: [] };
  const filter = { status: statusFilter };
  if (reportType) filter.reportType = reportType;
  if (category) filter.category = category;
  if (colour) filter.colour = colour;
  if (location) filter.generalLocation = location;
  if (dateFrom || dateTo) {
    filter.dateOccurred = {};
    if (dateFrom) filter.dateOccurred.$gte = dateFrom;
    if (dateTo) filter.dateOccurred.$lte = dateTo; // stored at midnight, so this includes that whole day
  }
  const text = q ? buildTextFilter(q) : [];
  if (text.length > 0) filter.$and = text;
  return filter;
}

// The id is the final tie-breaker so that paging never repeats or skips a report.
const SORT_ORDERS = Object.freeze({
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  eventNewest: { dateOccurred: -1, createdAt: -1, _id: -1 },
  eventOldest: { dateOccurred: 1, createdAt: 1, _id: 1 },
});

const sortFor = (sort) => SORT_ORDERS[sort] || SORT_ORDERS.newest;

module.exports = { escapeRegex, splitWords, zoneCodesMatching, buildBrowseFilter, sortFor, MAX_WORDS };
