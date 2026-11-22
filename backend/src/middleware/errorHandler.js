'use strict';

// The single place where every error ends up. Whatever goes wrong, the caller
// gets the standard error format, and never a stack trace or internal detail
// (see documentation/API_CONTRACT.md section 1.2 and SECURITY_PLAN.md S-20).
//
// Express recognises an error handler by it having exactly four parameters,
// so `next` must stay in the signature even though it is rarely used.
//
// Handles the errors that can already happen (bad JSON, oversized body,
// unexpected failures). Validation, permission and conflict errors are added
// from Stage 4 with a shared ApiError class.

function send(res, status, code, message) {
  res.status(status).json({ success: false, error: { code, message } });
}

/** Builds the handler. `config.isTest` silences error logging during automated tests. */
function createErrorHandler(config) {
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(err, req, res, next) {
    // If the response has already started, the only safe option is to let Express close it.
    if (res.headersSent) {
      return next(err);
    }

    // Errors raised by Express's JSON body reader.
    if (err && err.type === 'entity.parse.failed') {
      return send(res, 400, 'VALIDATION_ERROR', 'The request body is not valid JSON.');
    }
    if (err && err.type === 'entity.too.large') {
      return send(res, 413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
    }
    if (err && err.status >= 400 && err.status < 500) {
      return send(res, 400, 'VALIDATION_ERROR', 'The request could not be understood.');
    }

    // Anything else is a bug on our side. Log it for the developer (the server
    // log is private), but tell the caller nothing about it.
    if (!config.isTest) {
      console.error(err);
    }
    return send(res, 500, 'INTERNAL_ERROR', 'Something went wrong on the server.');
  };
}

module.exports = createErrorHandler;
