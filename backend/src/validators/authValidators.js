'use strict';

// The exact shape each authentication endpoint accepts. `strictObject` means any other
// field is REFUSED, which is how "role" can never be sent from a sign-up form.

const { z } = require('zod');
const f = require('./fields');

const registerSchema = z.strictObject({
  fullName: f.fullName,
  email: f.email,
  password: f.newPassword,
  phoneNumber: f.phoneNumber.optional(),
  contactPreference: f.contactPreference.optional(),
});

const loginSchema = z.strictObject({
  email: f.email,
  password: f.existingPassword,
});

module.exports = { registerSchema, loginSchema };
