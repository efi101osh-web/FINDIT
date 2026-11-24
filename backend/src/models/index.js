'use strict';

// Collects every model, and `initModels()` waits until the database has built each
// collection's indexes. That matters for the "unique email" rule: it only protects us once
// its index exists, so we wait for it before accepting any requests.

const User = require('./User');
const Item = require('./Item');

const models = { User, Item };

async function initModels() {
  await Promise.all(Object.values(models).map((model) => model.init()));
}

module.exports = { ...models, initModels };
