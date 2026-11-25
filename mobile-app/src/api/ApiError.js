// The shape of every failure from the server (documentation/API_CONTRACT.md section 1.2):
// a readable message, an HTTP status, a short code, and (for 400s) which fields were wrong.
// The preview API throws these too, so the screens already handle the real thing.

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', details = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details; // [{ field, message }]
  }
}
