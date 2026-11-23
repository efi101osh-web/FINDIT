'use strict';

// Creates the FIRST administrator. There is deliberately no public way to become an admin:
// sign-up only ever creates regular users. This runs from your own machine (npm run seed:admin).
//
// Rules:
//   * the email and password must pass the same checks as a normal sign-up
//   * an existing admin is never modified (running it twice is safe, and never resets a password)
//   * an existing REGULAR user is only turned into an admin if you explicitly ask (--promote),
//     and their password is never changed

const User = require('../models/User');
const { ROLES } = require('../config/constants');
const f = require('../validators/fields');

// "<like this>": text from the example file that was never replaced.
const looksLikePlaceholder = (value) => /^\s*<.*>\s*$/.test(String(value));

function firstProblem(schema, value, label) {
  if (looksLikePlaceholder(value)) {
    throw new Error(`${label}: it still contains a placeholder in < >. Replace the whole thing, including the < and > signs.`);
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${label}: ${result.error.issues[0].message}`);
  }
  return result.data;
}

/**
 * @returns {Promise<{ status: 'created' | 'promoted' | 'already_admin' | 'exists_not_admin', user: object }>}
 */
async function seedAdmin({ email, password, fullName = 'Campus Administrator', passwords, promote = false }) {
  const cleanEmail = firstProblem(f.email, email, 'SEED_ADMIN_EMAIL');
  const cleanName = firstProblem(f.fullName, fullName, 'SEED_ADMIN_NAME');
  firstProblem(f.newPassword, password, 'SEED_ADMIN_PASSWORD');

  const existing = await User.findOne({ email: cleanEmail });

  if (!existing) {
    const user = await User.create({
      fullName: cleanName,
      email: cleanEmail,
      passwordHash: await passwords.hash(password),
      role: ROLES.ADMIN,
    });
    return { status: 'created', user };
  }
  if (existing.role === ROLES.ADMIN) {
    return { status: 'already_admin', user: existing };
  }
  if (!promote) {
    return { status: 'exists_not_admin', user: existing };
  }
  existing.role = ROLES.ADMIN;
  await existing.save();
  return { status: 'promoted', user: existing };
}

module.exports = { seedAdmin };
