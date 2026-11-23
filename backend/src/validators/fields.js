'use strict';

// Reusable rules for single fields, so every endpoint treats an email or a password
// the same way. Written with Zod (https://zod.dev). Messages are shown to users.

const { z } = require('zod');
const { CONTACT_PREFERENCES } = require('../config/constants');

// Clean first (trim spaces, lower-case), THEN check the format. The order matters:
// ` Bob@Example.COM ` becomes `bob@example.com` and is accepted.
const email = z
  .string({ error: 'Email must be text.' })
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long.')
  .pipe(z.email({ error: 'Enter a valid email address.' }));

// Password rules for NEW passwords: 8 to 72 characters, with a letter and a number.
// The 72 limit is real: bcrypt only reads the first 72 BYTES of a password, so a longer
// one would be silently cut short. We refuse it instead.
const newPassword = z
  .string({ error: 'Password must be text.' })
  .min(8, 'Password must be at least 8 characters.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long (72 bytes at most).')
  .refine((value) => /[A-Za-z]/.test(value), 'Password must contain at least one letter.')
  .refine((value) => /\d/.test(value), 'Password must contain at least one number.');

// An EXISTING password being typed (login, "current password"): no strength rules,
// only a sane size limit so nobody can make us hash a gigantic string.
const existingPassword = z
  .string({ error: 'Password must be text.' })
  .min(1, 'Password is required.')
  .max(200, 'Password is too long.');

const fullName = z
  .string({ error: 'Name must be text.' })
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(80, 'Name must be at most 80 characters.')
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), 'Name contains characters that are not allowed.');

const phoneNumber = z
  .string({ error: 'Phone number must be text.' })
  .trim()
  .regex(/^[0-9+()\-\s]{7,20}$/, 'Enter a phone number of 7 to 20 digits (you may use + - ( ) and spaces).');

const contactPreference = z.enum(CONTACT_PREFERENCES, {
  error: `Contact preference must be one of: ${CONTACT_PREFERENCES.join(', ')}.`,
});

module.exports = { email, newPassword, existingPassword, fullName, phoneNumber, contactPreference };
