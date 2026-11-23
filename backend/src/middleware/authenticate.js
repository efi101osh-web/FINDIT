'use strict';

// "Who are you?" Reads the login token from the request, checks it, and loads the user.
//
// The user is loaded from the DATABASE on every request. That is deliberate: if an
// administrator suspends an account or changes a role, it takes effect on the very next request,
// even though the person still holds a token that has not expired.

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ACCOUNT_STATUSES } = require('../config/constants');

function readBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || parts[1] === '') return null;
  return parts[1];
}

function createAuthenticate({ tokens }) {
  return async function authenticate(req, res, next) {
    const token = readBearerToken(req);
    if (!token) throw ApiError.unauthenticated();

    const userId = tokens.verify(token);
    const user = await User.findById(userId);
    if (!user) throw ApiError.unauthenticated('Your login is not valid. Please log in again.');
    if (user.accountStatus !== ACCOUNT_STATUSES.ACTIVE) throw ApiError.accountSuspended();

    req.user = user;
    next();
  };
}

module.exports = createAuthenticate;
