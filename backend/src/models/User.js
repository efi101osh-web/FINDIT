'use strict';

// The `users` collection: one document per account. See documentation/DATABASE_SCHEMA.md
// section 4 for the full design.
//
// Notes for beginners:
//   * `select: false` means "never load this field unless I explicitly ask". The password
//     hash has it, so no query returns the hash by accident.
//   * `unique: true` on email makes the DATABASE refuse a second account with the same
//     email, even if two sign-ups arrive at exactly the same moment.

const mongoose = require('mongoose');
const { ROLES, ROLE_LIST, ACCOUNT_STATUSES, ACCOUNT_STATUS_LIST, CONTACT_PREFERENCES } = require('../config/constants');

const profileImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_LIST, default: ROLES.USER, required: true },
    phoneNumber: { type: String, trim: true, minlength: 7, maxlength: 20 },
    profileImage: { type: profileImageSchema, default: undefined }, // set from Stage 9
    contactPreference: { type: String, enum: CONTACT_PREFERENCES, default: 'IN_APP', required: true },
    accountStatus: { type: String, enum: ACCOUNT_STATUS_LIST, default: ACCOUNT_STATUSES.ACTIVE, required: true },
  },
  { timestamps: true }
);

// Speeds up the administrators' user list (Stage 12).
userSchema.index({ role: 1, accountStatus: 1 });

module.exports = mongoose.model('User', userSchema);
