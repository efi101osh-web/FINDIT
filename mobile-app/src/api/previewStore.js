// PREVIEW VERSION of the server's report storage: reports live in the phone's memory and are
// forgotten when the app closes. It follows the server's rules (who may see, edit and close what;
// documentation/API_CONTRACT.md section 8) so the screens already behave correctly. Deleted in Stage 8.

import { ApiError } from './ApiError';
import { sampleDetails } from './sampleData';

const PRIVATE_KEYS = ['privateDetails', 'privateStorageLocation', 'closedAt', 'closeReason'];
const EDITABLE_STATUSES = ['OPEN', 'POTENTIAL_MATCH'];
const FOUND_ONLY = ['handedToOffice', 'privateStorageLocation'];
const PLAIN_FIELDS = ['title', 'category', 'description', 'colour', 'brand', 'approximateTime', 'privateDetails', 'handedToOffice', 'privateStorageLocation'];

let records = [];
let counter = 0;

export function resetPreviewStore() {
  records = sampleDetails.map((record) => ({ ...record }));
  counter = 0;
}
resetPreviewStore();

export const allRecords = () => records;
const nowIso = () => new Date().toISOString();
const notFound = () => new ApiError('Report not found.', { status: 404, code: 'NOT_FOUND' });

/** What the server would send to THIS viewer: someone else's report never shows private fields. */
function view(record) {
  const copy = { ...record };
  if (!record.isMine) for (const key of PRIVATE_KEYS) delete copy[key];
  return copy;
}

function find(id) {
  const record = records.find((candidate) => candidate.id === id);
  if (!record || (record.status === 'CLOSED' && !record.isMine)) throw notFound();
  return record;
}

export function getRecord(id) {
  return view(find(id));
}

export function createRecord(body) {
  counter += 1;
  const now = nowIso();
  const found = body.reportType === 'FOUND';
  const record = {
    id: `p${counter}`,
    reportType: body.reportType,
    title: body.title,
    category: body.category,
    colour: body.colour,
    brand: body.brand || null,
    description: body.description,
    generalLocation: body.generalLocation,
    locationDetail: body.locationDetail || null,
    dateOccurred: `${body.dateOccurred}T00:00:00.000Z`,
    approximateTime: body.approximateTime || 'UNKNOWN',
    status: 'OPEN',
    image: null,
    images: [],
    isMine: true,
    createdAt: now,
    updatedAt: now,
    privateDetails: body.privateDetails || null,
    closedAt: null,
    closeReason: null,
  };
  if (found) {
    record.handedToOffice = Boolean(body.handedToOffice);
    record.privateStorageLocation = body.privateStorageLocation || null;
  }
  records.unshift(record);
  return view(record);
}

function requireEditable(record) {
  if (!record.isMine) throw new ApiError('Only the person who wrote this report can do that.', { status: 403, code: 'FORBIDDEN' });
  if (!EDITABLE_STATUSES.includes(record.status)) throw new ApiError('This report can no longer be edited.', { status: 409, code: 'CONFLICT' });
}

export function updateRecord(id, changes) {
  const record = find(id);
  requireEditable(record);
  if (record.reportType === 'LOST') {
    const wrong = FOUND_ONLY.filter((field) => changes[field] !== undefined);
    if (wrong.length > 0) {
      throw new ApiError('Some fields are invalid.', { status: 400, code: 'VALIDATION_ERROR', details: wrong.map((field) => ({ field, message: 'Only found reports can have this.' })) });
    }
  }
  for (const field of PLAIN_FIELDS) if (changes[field] !== undefined) record[field] = changes[field];
  if (changes.dateOccurred !== undefined) record.dateOccurred = `${changes.dateOccurred}T00:00:00.000Z`;
  if (changes.generalLocation !== undefined && changes.generalLocation !== record.generalLocation) {
    record.generalLocation = changes.generalLocation;
    record.locationDetail = null; // the old detail means nothing in a different zone
  }
  if (changes.locationDetail !== undefined) record.locationDetail = changes.locationDetail;
  record.updatedAt = nowIso();
  return view(record);
}

export function closeRecord(id, reason) {
  const record = find(id);
  if (!record.isMine) throw new ApiError('Only the person who wrote this report can do that.', { status: 403, code: 'FORBIDDEN' });
  if (!EDITABLE_STATUSES.includes(record.status)) {
    throw new ApiError('This report cannot be closed in its current state.', { status: 409, code: 'INVALID_STATE_TRANSITION' });
  }
  record.status = 'CLOSED';
  record.closedAt = nowIso();
  record.closeReason = reason || null;
  record.updatedAt = nowIso();
  return view(record);
}
