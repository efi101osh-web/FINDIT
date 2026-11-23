'use strict';

// Password hashing with bcrypt (the `bcryptjs` library: the same algorithm, written in
// plain JavaScript so it installs everywhere; see documentation/DECISIONS.md D-006).
//
// A "hash" is a one-way scramble: from the hash you cannot get the password back, but you
// can check whether a typed password produces the same hash. We store only hashes.

const bcrypt = require('bcryptjs');

function createPasswordService({ rounds }) {
  // A hash of a throwaway value, made once. When someone logs in with an email that does not
  // exist, we still do a full password check against this, so "unknown email" takes as long as
  // "wrong password". Otherwise the response time would reveal which emails have accounts.
  let dummyHash;
  function getDummyHash() {
    if (!dummyHash) dummyHash = bcrypt.hash('not-a-real-password-just-for-timing', rounds);
    return dummyHash;
  }

  return {
    hash: (plain) => bcrypt.hash(plain, rounds),
    verify: (plain, hash) => bcrypt.compare(plain, hash),
    async verifyAgainstDummy(plain) {
      await bcrypt.compare(plain, await getDummyHash());
      return false;
    },
  };
}

module.exports = createPasswordService;
