// PREVIEW VERSION: works on the phone's memory (previewStore). Stage 8 replaces the bodies with
// real calls (GET /items, GET /items/mine, GET /items/:id, POST /items, PATCH /items/:id,
// PATCH /items/:id/close). The names, inputs and replies stay the same.

import { delay } from './delay';
import { previewZones } from './previewZones';
import { browse, mine } from './previewSearch';
import { allRecords, closeRecord, createRecord, getRecord, updateRecord } from './previewStore';

/** Everyone's active reports. Reply: { items: [cards], meta }. */
export async function listItems(query = {}) {
  await delay(500);
  return browse(allRecords(), previewZones, query);
}

/** My reports, closed ones included. */
export async function listMine(query = {}) {
  await delay(400);
  return mine(allRecords(), query);
}

export async function getItem(id) {
  await delay(300);
  return getRecord(id);
}

export async function createItem(body) {
  await delay(600);
  return createRecord(body);
}

export async function updateItem(id, changes) {
  await delay(500);
  return updateRecord(id, changes);
}

export async function closeItem(id, { reason } = {}) {
  await delay(500);
  return closeRecord(id, reason);
}
