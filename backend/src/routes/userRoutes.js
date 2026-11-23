'use strict';

const { Router } = require('express');
const validate = require('../middleware/validate');
const { updateProfileSchema, changePasswordSchema } = require('../validators/userValidators');

function createUserRoutes({ controller, authenticate }) {
  const router = Router();
  router.get('/me', authenticate, controller.me);
  router.patch('/me', authenticate, validate({ body: updateProfileSchema }), controller.updateMe);
  router.patch('/me/password', authenticate, validate({ body: changePasswordSchema }), controller.changePassword);
  return router;
}

module.exports = createUserRoutes;
