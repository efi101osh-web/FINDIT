'use strict';

// The rules for creating accounts and logging in.

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ROLES, ACCOUNT_STATUSES } = require('../config/constants');

// MongoDB's error code for "this value already exists in a unique index".
const DUPLICATE_KEY = 11000;

function createAuthService({ config, passwords, tokens }) {
  function emailDomainAllowed(email) {
    if (config.allowedEmailDomains.length === 0) return true;
    return config.allowedEmailDomains.includes(email.split('@').pop());
  }

  function sessionFor(user) {
    return { user, token: tokens.issue(user._id), expiresIn: tokens.expiresIn };
  }

  return {
    /**
     * Create a regular-user account. The role is NEVER taken from the request: every account
     * made here is a plain `user` (administrators are made by the seed script or by an admin).
     */
    async register({ fullName, email, password, phoneNumber, contactPreference }) {
      if (!emailDomainAllowed(email)) {
        throw ApiError.validation([
          { field: 'email', message: `Please use your campus email address (${config.allowedEmailDomains.join(', ')}).` },
        ]);
      }

      const passwordHash = await passwords.hash(password);
      try {
        const user = await User.create({
          fullName,
          email,
          passwordHash,
          role: ROLES.USER,
          ...(phoneNumber !== undefined && { phoneNumber }),
          ...(contactPreference !== undefined && { contactPreference }),
        });
        return sessionFor(user);
      } catch (err) {
        if (err && err.code === DUPLICATE_KEY) {
          throw ApiError.conflict('An account with this email already exists.', [
            { field: 'email', message: 'This email is already registered.' },
          ]);
        }
        throw err;
      }
    },

    /**
     * Check an email and password and return a login token.
     * "No such email" and "wrong password" give the SAME reply and take about the same time.
     * A suspended account is only revealed AFTER the correct password was given, so nobody can
     * learn that an account exists or is suspended without knowing its password.
     */
    async login({ email, password }) {
      const user = await User.findOne({ email }).select('+passwordHash');

      if (!user) {
        await passwords.verifyAgainstDummy(password);
        throw ApiError.invalidCredentials();
      }
      if (!(await passwords.verify(password, user.passwordHash))) {
        throw ApiError.invalidCredentials();
      }
      if (user.accountStatus !== ACCOUNT_STATUSES.ACTIVE) {
        throw ApiError.accountSuspended();
      }
      return sessionFor(user);
    },
  };
}

module.exports = createAuthService;
