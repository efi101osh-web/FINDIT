'use strict';

// `npm run make:secret`: prints a strong random value to use as JWT_SECRET.
// It is generated on your own machine and is not stored or sent anywhere.

const crypto = require('crypto');

console.log(crypto.randomBytes(48).toString('hex'));
