'use strict';

// Runs when no route matched the URL. Replies in the standard error format
// (see documentation/API_CONTRACT.md section 1.2).
// The message deliberately does not repeat the requested URL back to the caller.

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist.',
    },
  });
}

module.exports = notFound;
