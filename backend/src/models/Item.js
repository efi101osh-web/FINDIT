'use strict';

// The `items` collection: one document per LOST or FOUND report. See
// documentation/DATABASE_SCHEMA.md section 5 for the full design.
//
// PRIVATE fields use `select: false`, which means "never load this unless I explicitly ask":
//   privateDetails, privateStorageLocation, closeReason
// `reporterId` is never sent to other users either (serializers decide; see utils/serializers.js).

const mongoose = require('mongoose');
const {
  REPORT_TYPES,
  CATEGORIES,
  COLOURS,
  TIME_BANDS,
  ITEM_STATUS_LIST,
  ITEM_STATUSES,
} = require('../config/constants');
const { ZONE_CODES, MAX_DETAIL_LENGTH } = require('../config/campusLocations');

const itemSchema = new mongoose.Schema(
  {
    // `immutable`: once saved, these can never be changed through the model.
    reportType: { type: String, enum: REPORT_TYPES, required: true, immutable: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    colour: { type: String, enum: COLOURS, required: true },
    brand: { type: String, trim: true, maxlength: 40 },
    privateDetails: { type: String, trim: true, maxlength: 1000, select: false },
    generalLocation: { type: String, enum: ZONE_CODES, required: true },
    locationDetail: { type: String, trim: true, maxlength: MAX_DETAIL_LENGTH },
    dateOccurred: { type: Date, required: true },
    approximateTime: { type: String, enum: TIME_BANDS, default: 'UNKNOWN', required: true },
    status: { type: String, enum: ITEM_STATUS_LIST, default: ITEM_STATUSES.OPEN, required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    handedToOffice: { type: Boolean, default: false }, // FOUND reports only
    privateStorageLocation: { type: String, trim: true, maxlength: 200, select: false }, // FOUND only
    closedAt: { type: Date },
    closeReason: { type: String, trim: true, maxlength: 200, select: false },
  },
  { timestamps: true }
);

// The two "found only" fields make no sense on a lost report, so the database layer refuses them too.
itemSchema.pre('validate', function checkFoundOnlyFields() {
  if (this.reportType === 'LOST') {
    if (this.handedToOffice === true) this.invalidate('handedToOffice', 'Only found reports can be handed to an office.');
    if (this.privateStorageLocation) this.invalidate('privateStorageLocation', 'Only found reports have a storage location.');
  }
});

// Indexes (what each is for is in DATABASE_SCHEMA.md): browsing, matching, "my reports", dates, places.
itemSchema.index({ reportType: 1, status: 1, createdAt: -1 });
itemSchema.index({ category: 1, reportType: 1, status: 1 });
itemSchema.index({ reporterId: 1, createdAt: -1 });
itemSchema.index({ dateOccurred: -1 });
itemSchema.index({ generalLocation: 1 });

module.exports = mongoose.model('Item', itemSchema);
