'use strict';

// Routes only connect a URL to its controller. No logic lives here.

const { Router } = require('express');
const { getHealth } = require('../controllers/healthController');

const router = Router();

router.get('/', getHealth);

module.exports = router;
