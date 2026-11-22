'use strict';

// CORS ("cross-origin resource sharing") decides which WEBSITES are allowed to call
// this API from inside a browser. Only the admin dashboard needs this.
//
// What it does NOT do: it is not a login system and it does not stop other programs.
// The mobile app, Postman and curl do not use CORS at all. Real protection against
// misuse comes from authentication and permissions (Stage 4 onwards).
//
// Rules here:
//   * a request with no Origin header (mobile app, Postman, curl): allowed through
//   * an Origin on our allow-list: the browser is told it may read the reply
//   * any other Origin: no permission headers are sent, so the browser blocks it

const cors = require('cors');

function createCors(allowedOrigins) {
  return cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });
}

module.exports = createCors;
