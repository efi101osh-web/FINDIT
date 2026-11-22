'use strict';

// Collects every route group under one router. app.js mounts this at /api/v1,
// so a route declared here as `/health` is reachable at /api/v1/health.

const { Router } = require('express');
const healthRoutes = require('./healthRoutes');

const router = Router();

router.use('/health', healthRoutes);

module.exports = router;
