'use strict';

const { Router } = require('express');
const validate = require('../middleware/validate');
const { createItemSchema, updateItemSchema, closeItemSchema, idParams, listMineQuery } = require('../validators/itemValidators');

function createItemRoutes({ controller, authenticate }) {
  const router = Router();
  // Everything here needs a login. `/mine` MUST come before `/:id`, or "mine" would be read as an id.
  router.post('/', authenticate, validate({ body: createItemSchema }), controller.create);
  router.get('/mine', authenticate, validate({ query: listMineQuery }), controller.listMine);
  router.get('/:id', authenticate, validate({ params: idParams }), controller.get);
  router.patch('/:id', authenticate, validate({ params: idParams, body: updateItemSchema }), controller.update);
  router.patch('/:id/close', authenticate, validate({ params: idParams, body: closeItemSchema }), controller.close);
  return router;
}

module.exports = createItemRoutes;
