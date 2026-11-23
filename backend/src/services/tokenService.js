'use strict';

// Login tokens (JWT = JSON Web Token): a signed "ticket" the app shows with every request.
//
// What is inside: ONLY the user's id (the "subject"), when it was issued and when it expires.
// Deliberately NOT inside: the role or account status. Those are read from the database on every
// request, so suspending someone or changing their role takes effect immediately.
//
// The signature is made with JWT_SECRET. Anyone who changes the token, or signed it with a
// different key, fails verification. We pin the algorithm (HS256) so an attacker cannot ask us
// to "verify" with a weaker one, such as the notorious "none" algorithm.

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const ALGORITHM = 'HS256';
const ISSUER = 'findit-api';

function createTokenService({ secret, expiresIn }) {
  if (!secret) {
    throw new Error('JWT_SECRET is required to create the token service.');
  }

  return {
    expiresIn,

    issue(userId) {
      return jwt.sign({}, secret, { algorithm: ALGORITHM, expiresIn, issuer: ISSUER, subject: String(userId) });
    },

    /** Returns the user id inside a valid token. Throws ApiError 401 for anything wrong. */
    verify(token) {
      let payload;
      try {
        payload = jwt.verify(token, secret, { algorithms: [ALGORITHM], issuer: ISSUER });
      } catch (err) {
        if (err && err.name === 'TokenExpiredError') {
          throw ApiError.unauthenticated('Your session has expired. Please log in again.');
        }
        throw ApiError.unauthenticated('Your login is not valid. Please log in again.');
      }
      if (!payload.sub || !mongoose.isValidObjectId(payload.sub)) {
        throw ApiError.unauthenticated('Your login is not valid. Please log in again.');
      }
      return String(payload.sub);
    },
  };
}

module.exports = createTokenService;
