'use strict';

const { Router } = require('express');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/authValidators');

function createAuthRoutes({ controller, authenticate, limiters }) {
  const router = Router();
  router.post('/register', limiters.register, validate({ body: registerSchema }), controller.register);
  router.post('/login', limiters.login, validate({ body: loginSchema }), controller.login);
  router.get('/me', authenticate, controller.me);
  return router;
}

module.exports = createAuthRoutes;
