'use strict';

// EVERY allowed change of a report's status lives in this one file. Nothing else in the code
// assigns a status without asking here first. A change that is not in the table below is
// refused with 409 INVALID_STATE_TRANSITION. (The same table, in words, is in
// documentation/ARCHITECTURE.md section 7.1, and as a picture in documentation/diagrams.)
//
// "actor" says WHO is making the change:
//   owner   the person who wrote the report
//   admin   an administrator
//   system  the backend itself, reacting to something (a match was found, a claim was approved...)
//
// Only the owner's "close" is used in Stage 5. The rest of the table is here so that later stages
// (matching, claims, recovery) use the same single source of truth.

const ApiError = require('../utils/ApiError');
const { ITEM_STATUSES: S } = require('../config/constants');

const ACTOR = Object.freeze({ OWNER: 'owner', ADMIN: 'admin', SYSTEM: 'system' });

// `only` limits a change to LOST or FOUND reports. A found item is the one that gets claimed.
const ITEM_TRANSITIONS = Object.freeze([
  { from: [S.OPEN], to: S.POTENTIAL_MATCH, by: [ACTOR.SYSTEM] },
  { from: [S.POTENTIAL_MATCH], to: S.OPEN, by: [ACTOR.SYSTEM] },
  { from: [S.OPEN, S.POTENTIAL_MATCH], to: S.UNDER_VERIFICATION, by: [ACTOR.SYSTEM], only: 'FOUND' },
  { from: [S.UNDER_VERIFICATION], to: S.APPROVED_FOR_RETURN, by: [ACTOR.SYSTEM], only: 'FOUND' },
  { from: [S.UNDER_VERIFICATION], to: S.OPEN, by: [ACTOR.SYSTEM], only: 'FOUND' },
  { from: [S.APPROVED_FOR_RETURN], to: S.RETURNED, by: [ACTOR.SYSTEM], only: 'FOUND' },
  { from: [S.APPROVED_FOR_RETURN], to: S.OPEN, by: [ACTOR.ADMIN], only: 'FOUND' },
  { from: [S.OPEN, S.POTENTIAL_MATCH], to: S.RETURNED, by: [ACTOR.SYSTEM], only: 'LOST' },
  { from: [S.OPEN, S.POTENTIAL_MATCH], to: S.CLOSED, by: [ACTOR.OWNER, ACTOR.ADMIN] },
  { from: [S.UNDER_VERIFICATION, S.APPROVED_FOR_RETURN], to: S.CLOSED, by: [ACTOR.ADMIN], only: 'FOUND' },
  { from: [S.CLOSED], to: S.OPEN, by: [ACTOR.ADMIN] },
]);

/** True if `actor` may move a report of this type from one status to another. */
function canTransitionItem({ reportType, from, to, actor }) {
  return ITEM_TRANSITIONS.some(
    (rule) =>
      rule.from.includes(from) &&
      rule.to === to &&
      rule.by.includes(actor) &&
      (!rule.only || rule.only === reportType)
  );
}

/** Like canTransitionItem, but throws the standard 409 error when the change is not allowed. */
function assertItemTransition({ reportType, from, to, actor }) {
  if (!canTransitionItem({ reportType, from, to, actor })) {
    throw ApiError.invalidTransition(`A report that is ${from} cannot be changed to ${to} this way.`);
  }
}

// While a report is in one of these statuses its owner may still edit it.
const OWNER_EDITABLE_STATUSES = Object.freeze([S.OPEN, S.POTENTIAL_MATCH]);

module.exports = { ACTOR, ITEM_TRANSITIONS, canTransitionItem, assertItemTransition, OWNER_EDITABLE_STATUSES };
