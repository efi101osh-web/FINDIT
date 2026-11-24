'use strict';

const { sendSuccess } = require('../utils/respond');

function createItemController({ items }) {
  return {
    async create(req, res) {
      sendSuccess(res, { item: await items.create(req.user, req.valid.body) }, { status: 201 });
    },
    async list(req, res) {
      const { items: list, meta } = await items.browse(req.user, req.valid.query);
      sendSuccess(res, list, { meta });
    },
    async get(req, res) {
      sendSuccess(res, { item: await items.getById(req.user, req.valid.params.id) });
    },
    async listMine(req, res) {
      const { items: list, meta } = await items.listMine(req.user, req.valid.query);
      sendSuccess(res, list, { meta });
    },
    async update(req, res) {
      sendSuccess(res, { item: await items.update(req.user, req.valid.params.id, req.valid.body) });
    },
    async close(req, res) {
      sendSuccess(res, { item: await items.close(req.user, req.valid.params.id, req.valid.body) });
    },
  };
}

module.exports = createItemController;
