'use strict';

// Collects every route group under one router. app.js mounts this at /api/v1, so a route
// declared here as `/health` is reachable at /api/v1/health.

const { Router } = require('express');
const healthRoutes = require('./healthRoutes');
const createAuthRoutes = require('./authRoutes');
const createUserRoutes = require('./userRoutes');
const createItemRoutes = require('./itemRoutes');
const { getOptions } = require('../controllers/metaController');
const createAuthController = require('../controllers/authController');
const createUserController = require('../controllers/userController');
const createItemController = require('../controllers/itemController');

function createRoutes({ services, authenticate, limiters }) {
  const router = Router();
  router.use('/health', healthRoutes);
  router.use('/auth', createAuthRoutes({ controller: createAuthController(services), authenticate, limiters }));
  router.use('/users', createUserRoutes({ controller: createUserController(services), authenticate }));
  router.use('/items', createItemRoutes({ controller: createItemController(services), authenticate }));
  router.get('/meta/options', getOptions);
  return router;
}

module.exports = createRoutes;
