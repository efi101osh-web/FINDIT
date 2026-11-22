'use strict';

// The MongoDB release used for the throwaway test database (a stable release that has
// both a Linux and a Windows build). Kept in one place so every test file agrees.
module.exports = process.env.MONGOMS_VERSION || '8.0.17';
