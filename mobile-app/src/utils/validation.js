// Checks on the sign-up and login forms. They give instant feedback and use the SAME rules and
// wording as the server (backend/src/validators/fields.js), but they are only a convenience:
// the server always re-checks everything, and its answer is the one that counts.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// bcrypt (the server's password hasher) reads only the first 72 BYTES, so the server refuses more.
const byteLength = (text) => new TextEncoder().encode(text).length;

export function validateName(value) {
  const name = String(value || '').trim();
  if (name.length < 2) return 'Name must be at least 2 characters.';
  if (name.length > 80) return 'Name must be at most 80 characters.';
  return null;
}

export function validateEmail(value) {
  const email = String(value || '').trim();
  if (email.length === 0) return 'Enter your email address.';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return null;
}

/** For a NEW password (sign-up). */
export function validateNewPassword(value) {
  const password = String(value || '');
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (byteLength(password) > 72) return 'Password is too long (72 bytes at most).';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter.';
  if (!/\d/.test(password)) return 'Password must contain at least one number.';
  return null;
}

/** For an EXISTING password (log in): no strength rules, it just must be there. */
export function validateExistingPassword(value) {
  const password = String(value || '');
  if (password.length === 0) return 'Enter your password.';
  if (password.length > 200) return 'Password is too long.';
  return null;
}

const collect = (checks) => {
  const errors = {};
  for (const [field, message] of Object.entries(checks)) if (message) errors[field] = message;
  return errors;
};

/** Returns an object of { field: message } (empty when everything is fine). */
export const validateLogin = ({ email, password }) =>
  collect({ email: validateEmail(email), password: validateExistingPassword(password) });

export const validateRegister = ({ fullName, email, password }) =>
  collect({ fullName: validateName(fullName), email: validateEmail(email), password: validateNewPassword(password) });
