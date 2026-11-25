// PREVIEW VERSION (Stage 7): returns the sample reports. Stage 8 calls GET /items.
// The reply has the real shape: { items: [...cards], meta: { page, limit, total, totalPages } }.

import { delay } from './delay';
import { sampleItems } from './sampleData';

export async function listItems({ reportType, page = 1, limit = 20 } = {}) {
  await delay(500);
  const matching = sampleItems.filter((item) => !reportType || item.reportType === reportType);
  const items = matching.slice((page - 1) * limit, page * limit);
  return { items, meta: { page, limit, total: matching.length, totalPages: Math.ceil(matching.length / limit) } };
}
