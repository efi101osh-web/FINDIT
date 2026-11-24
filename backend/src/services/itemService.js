'use strict';

// The rules for lost and found reports: creating, viewing, listing your own, editing, closing.
//
// Who may do what (see documentation/REQUIREMENTS.md section 4):
//   * any logged-in user may create a report, list their own, and browse and search everyone's
//     PUBLIC cards (never closed reports, never private fields)
//   * anyone logged in may view a report, but only its OWNER or an ADMINISTRATOR sees the
//     private fields, and only an administrator sees the reporter's contact details
//   * a CLOSED report is invisible to everyone except its owner and administrators
//   * only the OWNER may edit or close a report in Stage 5. Administrator editing and closing
//     arrive with the audit log (Stage 12), because administrators' actions must be recorded.

const Item = require('../models/Item');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { toItemCard, toItemDetail } = require('../utils/serializers');
const { checkLocation } = require('../config/campusLocations');
const { ITEM_STATUSES, ROLES } = require('../config/constants');
const { ACTOR, assertItemTransition, OWNER_EDITABLE_STATUSES } = require('./statusRules');
const { buildBrowseFilter, sortFor } = require('./itemSearch');

const PRIVATE_FIELDS = '+privateDetails +privateStorageLocation +closeReason';
const EDITABLE_FIELDS = [
  'title', 'category', 'description', 'colour', 'brand', 'dateOccurred', 'approximateTime',
  'privateDetails', 'handedToOffice', 'privateStorageLocation',
];
const FOUND_ONLY_FIELDS = ['handedToOffice', 'privateStorageLocation'];

const isOwner = (user, item) => String(item.reporterId) === String(user._id);
const isAdmin = (user) => user.role === ROLES.ADMIN;
const notFound = () => ApiError.notFound('Report not found.');

function createItemService() {
  /** Loads a report, or throws 404. */
  async function loadOrFail(id, select) {
    const query = Item.findById(id);
    const item = await (select ? query.select(select) : query);
    if (!item) throw notFound();
    return item;
  }

  /** For edit/close: the owner may proceed; everyone else is refused (404 if they could not even see it). */
  function requireOwner(user, item) {
    if (isOwner(user, item)) return;
    throw item.status === ITEM_STATUSES.CLOSED ? notFound() : ApiError.forbidden('Only the person who wrote this report can do that.');
  }

  return {
    async create(user, data) {
      const item = await Item.create({ ...data, reporterId: user._id, status: ITEM_STATUSES.OPEN });
      return toItemDetail(item, user._id, { includePrivate: true });
    },

    async getById(user, id) {
      const item = await loadOrFail(id);
      const owner = isOwner(user, item);
      const admin = isAdmin(user);

      // A closed report is hidden from everyone but its owner and administrators.
      if (item.status === ITEM_STATUSES.CLOSED && !owner && !admin) throw notFound();

      if (!owner && !admin) {
        return toItemDetail(item, user._id); // the public view: no private fields at all
      }
      // Only now are the private fields loaded from the database.
      const full = await loadOrFail(id, PRIVATE_FIELDS);
      const reporter = admin ? await User.findById(item.reporterId).select('fullName email phoneNumber contactPreference') : null;
      return toItemDetail(full, user._id, { includePrivate: true, reporter });
    },

    /** Browse and search everyone's reports: public cards only. CLOSED reports are never included. */
    async browse(user, query) {
      const filter = buildBrowseFilter(query);
      const { page, limit, sort } = query;
      const [items, total] = await Promise.all([
        Item.find(filter).sort(sortFor(sort)).skip((page - 1) * limit).limit(limit),
        Item.countDocuments(filter),
      ]);
      return {
        items: items.map((item) => toItemCard(item, user._id)),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    async listMine(user, { reportType, status, page, limit }) {
      const filter = { reporterId: user._id };
      if (reportType) filter.reportType = reportType;
      if (status) filter.status = status;

      const [items, total] = await Promise.all([
        Item.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
        Item.countDocuments(filter),
      ]);
      return {
        items: items.map((item) => toItemCard(item, user._id)),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    async update(user, id, changes) {
      const item = await loadOrFail(id, PRIVATE_FIELDS);
      requireOwner(user, item);
      if (!OWNER_EDITABLE_STATUSES.includes(item.status)) {
        throw ApiError.conflict('This report can no longer be edited.');
      }

      if (item.reportType === 'LOST') {
        const wrong = FOUND_ONLY_FIELDS.filter((field) => changes[field] !== undefined);
        if (wrong.length > 0) {
          throw ApiError.validation(wrong.map((field) => ({ field, message: 'Only found reports can have this.' })));
        }
      }

      // The place is checked as a WHOLE (zone + detail), using what the report will say afterwards.
      const locationTouched = changes.generalLocation !== undefined || changes.locationDetail !== undefined;
      if (locationTouched) {
        const zone = changes.generalLocation ?? item.generalLocation;
        let detail;
        if (changes.locationDetail !== undefined) detail = changes.locationDetail; // may be null (clear)
        else if (zone !== item.generalLocation) detail = undefined; // the zone changed, so the old detail no longer applies
        else detail = item.locationDetail;

        const problems = checkLocation(zone, detail);
        if (problems.length > 0) throw ApiError.validation(problems);
        item.generalLocation = zone;
        item.locationDetail = detail === null || detail === '' ? undefined : detail;
      }

      for (const field of EDITABLE_FIELDS) {
        if (changes[field] === undefined) continue;
        item[field] = changes[field] === null ? undefined : changes[field]; // null clears the field
      }
      await item.save();
      return toItemDetail(item, user._id, { includePrivate: true });
    },

    async close(user, id, { reason } = {}) {
      const item = await loadOrFail(id, PRIVATE_FIELDS);
      requireOwner(user, item);
      assertItemTransition({ reportType: item.reportType, from: item.status, to: ITEM_STATUSES.CLOSED, actor: ACTOR.OWNER });

      item.status = ITEM_STATUSES.CLOSED;
      item.closedAt = new Date();
      if (reason) item.closeReason = reason;
      await item.save();
      return toItemDetail(item, user._id, { includePrivate: true });
    },
  };
}

module.exports = createItemService;
