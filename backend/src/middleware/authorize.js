'use strict';

// "Are you allowed?" Use AFTER `authenticate`:
//
//   router.get('/admin/overview', authenticate, authorize('admin'), controller)
//
// The role checked here comes from the database record loaded by `authenticate`, never from the
// token or from anything the caller sent.

const ApiError = require('../utils/ApiError');

function authorize(...allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.user) throw ApiError.unauthenticated();
    if (!allowedRoles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
}

module.exports = authorize;
