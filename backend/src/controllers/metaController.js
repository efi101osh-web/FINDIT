'use strict';

// GET /api/v1/meta/options: the lists of allowed values, so the mobile app and the dashboard
// never hard-code them. Contains no private data, so it needs no login.

const { sendSuccess } = require('../utils/respond');
const { REPORT_TYPES, CATEGORIES, COLOURS, TIME_BANDS, ITEM_STATUS_LIST, CONTACT_PREFERENCES } = require('../config/constants');
const { LOCATION_ZONES } = require('../config/campusLocations');

function getOptions(req, res) {
  sendSuccess(res, {
    reportTypes: REPORT_TYPES,
    categories: CATEGORIES,
    colours: COLOURS,
    timeBands: TIME_BANDS,
    campusLocations: LOCATION_ZONES, // each zone: { code, label, detail: { mode, hint, options? } }
    contactPreferences: CONTACT_PREFERENCES,
    itemStatuses: ITEM_STATUS_LIST,
  });
}

module.exports = { getOptions };
