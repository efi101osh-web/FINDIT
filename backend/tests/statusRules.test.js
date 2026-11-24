'use strict';

// Every allowed status change for a report, checked against an INDEPENDENT list written out here.
// The test tries EVERY combination of type, from-status, to-status and actor, so an extra
// permission added to the rules by mistake (or a missing one) fails immediately.

const { ITEM_TRANSITIONS, canTransitionItem, assertItemTransition, ACTOR, OWNER_EDITABLE_STATUSES } = require('../src/services/statusRules');
const { ITEM_STATUS_LIST } = require('../src/config/constants');

// type | from | to | who may do it
const EXPECTED_ALLOWED = [
  ['BOTH', 'OPEN', 'POTENTIAL_MATCH', 'system'],
  ['BOTH', 'POTENTIAL_MATCH', 'OPEN', 'system'],
  ['FOUND', 'OPEN', 'UNDER_VERIFICATION', 'system'],
  ['FOUND', 'POTENTIAL_MATCH', 'UNDER_VERIFICATION', 'system'],
  ['FOUND', 'UNDER_VERIFICATION', 'APPROVED_FOR_RETURN', 'system'],
  ['FOUND', 'UNDER_VERIFICATION', 'OPEN', 'system'],
  ['FOUND', 'APPROVED_FOR_RETURN', 'RETURNED', 'system'],
  ['FOUND', 'APPROVED_FOR_RETURN', 'OPEN', 'admin'],
  ['LOST', 'OPEN', 'RETURNED', 'system'],
  ['LOST', 'POTENTIAL_MATCH', 'RETURNED', 'system'],
  ['BOTH', 'OPEN', 'CLOSED', 'owner'],
  ['BOTH', 'OPEN', 'CLOSED', 'admin'],
  ['BOTH', 'POTENTIAL_MATCH', 'CLOSED', 'owner'],
  ['BOTH', 'POTENTIAL_MATCH', 'CLOSED', 'admin'],
  ['FOUND', 'UNDER_VERIFICATION', 'CLOSED', 'admin'],
  ['FOUND', 'APPROVED_FOR_RETURN', 'CLOSED', 'admin'],
  ['BOTH', 'CLOSED', 'OPEN', 'admin'],
];

const isExpected = (type, from, to, actor) =>
  EXPECTED_ALLOWED.some(([t, f, to2, a]) => (t === 'BOTH' || t === type) && f === from && to2 === to && a === actor);

describe('item status rules', () => {
  test('exactly the expected changes are allowed, and every other combination is refused', () => {
    let allowed = 0;
    let checked = 0;
    for (const reportType of ['LOST', 'FOUND']) {
      for (const from of ITEM_STATUS_LIST) {
        for (const to of ITEM_STATUS_LIST) {
          for (const actor of Object.values(ACTOR)) {
            const expected = isExpected(reportType, from, to, actor);
            const actual = canTransitionItem({ reportType, from, to, actor });
            checked += 1;
            if (actual) allowed += 1;
            expect([reportType, from, to, actor, actual]).toEqual([reportType, from, to, actor, expected]);
          }
        }
      }
    }
    expect(checked).toBe(2 * 6 * 6 * 3);
    expect(allowed).toBeGreaterThan(20);
  });

  test('RETURNED is final: nothing can leave it', () => {
    for (const reportType of ['LOST', 'FOUND']) {
      for (const to of ITEM_STATUS_LIST) {
        for (const actor of Object.values(ACTOR)) expect(canTransitionItem({ reportType, from: 'RETURNED', to, actor })).toBe(false);
      }
    }
  });

  test('a status can never "change" to itself', () => {
    for (const status of ITEM_STATUS_LIST) {
      for (const actor of Object.values(ACTOR)) expect(canTransitionItem({ reportType: 'FOUND', from: status, to: status, actor })).toBe(false);
    }
  });

  test('only FOUND reports can be under verification or approved for return', () => {
    for (const to of ['UNDER_VERIFICATION', 'APPROVED_FOR_RETURN']) {
      for (const from of ITEM_STATUS_LIST) {
        for (const actor of Object.values(ACTOR)) expect(canTransitionItem({ reportType: 'LOST', from, to, actor })).toBe(false);
      }
    }
  });

  test('an ordinary owner may do exactly one thing: close a report that is still open or a possible match', () => {
    const ownerMoves = [];
    for (const reportType of ['LOST', 'FOUND']) {
      for (const from of ITEM_STATUS_LIST) {
        for (const to of ITEM_STATUS_LIST) {
          if (canTransitionItem({ reportType, from, to, actor: 'owner' })) ownerMoves.push(`${reportType}:${from}->${to}`);
        }
      }
    }
    expect(ownerMoves.sort()).toEqual(['FOUND:OPEN->CLOSED', 'FOUND:POTENTIAL_MATCH->CLOSED', 'LOST:OPEN->CLOSED', 'LOST:POTENTIAL_MATCH->CLOSED']);
  });

  test('assertItemTransition throws the standard 409 INVALID_STATE_TRANSITION error', () => {
    expect(() => assertItemTransition({ reportType: 'FOUND', from: 'UNDER_VERIFICATION', to: 'CLOSED', actor: 'owner' })).toThrow(
      expect.objectContaining({ status: 409, code: 'INVALID_STATE_TRANSITION' })
    );
    expect(() => assertItemTransition({ reportType: 'LOST', from: 'OPEN', to: 'CLOSED', actor: 'owner' })).not.toThrow();
  });

  test('the owner may edit only while a report is open or a possible match', () => {
    expect([...OWNER_EDITABLE_STATUSES].sort()).toEqual(['OPEN', 'POTENTIAL_MATCH']);
  });

  test('the table is frozen', () => {
    expect(Object.isFrozen(ITEM_TRANSITIONS)).toBe(true);
  });
});
