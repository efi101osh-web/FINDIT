'use strict';

// One place that builds the standard success reply (documentation/API_CONTRACT.md 1.1).

function sendSuccess(res, data, { status = 200, meta } = {}) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

module.exports = { sendSuccess };
