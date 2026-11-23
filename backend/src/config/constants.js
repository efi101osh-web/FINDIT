'use strict';

// Fixed lists of allowed values, defined once so every part of the backend agrees.
// (See documentation/DATABASE_SCHEMA.md section 3. More lists are added as their
// stages arrive.)

const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
  RECOVERY_OFFICER: 'recovery_officer',
});
const ROLE_LIST = Object.freeze(Object.values(ROLES));

const ACCOUNT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
});
const ACCOUNT_STATUS_LIST = Object.freeze(Object.values(ACCOUNT_STATUSES));

// How staff should contact a user. This never exposes contact details to other users.
const CONTACT_PREFERENCES = Object.freeze(['IN_APP', 'EMAIL', 'PHONE']);

module.exports = {
  ROLES,
  ROLE_LIST,
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LIST,
  CONTACT_PREFERENCES,
};
