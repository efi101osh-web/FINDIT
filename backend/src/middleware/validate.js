'use strict';

// The "validation checkpoint": checks the request body (and optionally query and URL
// parameters) against a Zod schema BEFORE any real code runs.
//
//   router.post('/register', validate({ body: registerSchema }), controller)
//
// On success the cleaned data is placed in `req.valid.body` (and `.query`, `.params`),
// and controllers use ONLY that. They never read the raw `req.body`. On failure the
// caller gets a 400 VALIDATION_ERROR listing each problem field.
//
// Schemas are "strict": any field the endpoint does not expect is rejected. That is
// what stops someone sending `"role":"admin"` to a sign-up form.

const ApiError = require('../utils/ApiError');

/** Turn Zod's issues into [{ field, message }], one entry per problem. */
function toDetails(error) {
  const details = [];
  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        details.push({ field: key, message: 'This field is not accepted.' });
      }
    } else {
      details.push({ field: issue.path.join('.') || 'body', message: issue.message });
    }
  }
  return details;
}

function validate({ body, query, params }) {
  return function validateRequest(req, res, next) {
    const valid = {};
    const problems = [];

    const sources = [
      ['body', body, req.body === undefined ? {} : req.body],
      ['query', query, req.query],
      ['params', params, req.params],
    ];

    for (const [name, schema, value] of sources) {
      if (!schema) continue;
      const result = schema.safeParse(value);
      if (result.success) {
        valid[name] = result.data;
      } else {
        problems.push(...toDetails(result.error));
      }
    }

    if (problems.length > 0) {
      return next(ApiError.validation(problems));
    }
    req.valid = valid;
    return next();
  };
}

module.exports = validate;
