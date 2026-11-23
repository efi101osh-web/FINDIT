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
  .refine((value) => Object.keys(value).length > 0, { error: 'Send at least one field to change.' });

const changePasswordSchema = z
  .strictObject({
    currentPassword: f.existingPassword,
    newPassword: f.newPassword,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    error: 'The new password must be different from the current one.',
  });

module.exports = { updateProfileSchema, changePasswordSchema };
