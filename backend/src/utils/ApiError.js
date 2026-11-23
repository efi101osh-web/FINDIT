'use strict';

// An error that the API knows how to report to the caller: an HTTP status, a stable
// machine-readable `code`, and a message that is safe to show to a user.
// (The full list of codes is in documentation/API_CONTRACT.md section 1.3.)
// Services throw these; the error handler turns them into the standard JSON reply.

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details; // only used for validation errors: [{ field, message }]
  }

  static validation(details, message = 'Some fields are invalid.') {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthenticated(message = 'Please log in to continue.') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }

  static invalidCredentials() {
    // One message for both "no such email" and "wrong password" on purpose.
    return new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  static accountSuspended() {
    return new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended. Please contact the administrators.');
  }

  static forbidden(message = 'You are not allowed to do that.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message, details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  static rateLimited(message = 'Too many requests. Please wait a while and try again.') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
}

module.exports = ApiError;
