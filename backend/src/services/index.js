'use strict';

// Builds every service from the settings it needs, in one place.

const createPasswordService = require('./passwordService');
const createTokenService = require('./tokenService');
const createAuthService = require('./authService');
const createUserService = require('./userService');

function createServices(config) {
  const passwords = createPasswordService({ rounds: config.bcryptRounds });
  const tokens = createTokenService({ secret: config.jwtSecret, expiresIn: config.jwtExpiresIn });
  return {
    passwords,
    tokens,
    auth: createAuthService({ config, passwords, tokens }),
    users: createUserService({ passwords }),
  };
}

module.exports = createServices;
