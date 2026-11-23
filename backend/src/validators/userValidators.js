'use strict';

const { z } = require('zod');
const f = require('./fields');

// PATCH /users/me: send only what changes. Email, role and account status are NOT here,
// so sending them is refused. (A profile photo is added in Stage 9 with image upload.)
const updateProfileSchema = z
  .strictObject({
    fullName: f.fullName.optional(),
    phoneNumber: f.phoneNumber.nullable().optional(), // null clears it
    contactPreference: f.contactPreference.optional(),
  })
  // `when`: only run this check if nothing else is already wrong, so a forbidden field is
  // reported as that, not also as "send at least one field".
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Send at least one field to change.',
    when: (payload) => payload.issues.length === 0,
  });

const changePasswordSchema = z
  .strictObject({
    currentPassword: f.existingPassword,
    newPassword: f.newPassword,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    error: 'The new password must be different from the current one.',
    when: (payload) => payload.issues.length === 0,
  });

module.exports = { updateProfileSchema, changePasswordSchema };
