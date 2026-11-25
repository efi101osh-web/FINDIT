// PREVIEW VERSION of browse and search. It follows the server's rules (backend/src/services/
// itemSearch.js, documentation/API_CONTRACT.md section 8.2) so the screens behave the same way
// when they are connected in Stage 8: every word must match, partial words work, letter case is
// ignored, only PUBLIC fields are searched, closed reports are never listed, and four sorts.
// Deleted in Stage 8, when the server does this.

const ACTIVE = ['OPEN', 'POTENTIAL_MATCH', 'UNDER_VERIFICATION', 'APPROVED_FOR_RETURN'];
const BROWSABLE = [...ACTIVE, 'RETURNED'];
export const MAX_WORDS = 5;

export function splitWords(text) {
  const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
  return [...new Set(words)].slice(0, MAX_WORDS);
}

const SORTS = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  eventNewest: (a, b) => b.dateOccurred.localeCompare(a.dateOccurred) || SORTS.newest(a, b),
  eventOldest: (a, b) => a.dateOccurred.localeCompare(b.dateOccurred) || SORTS.oldest(a, b),
};

const day = (iso) => String(iso).slice(0, 10);

/** PUBLIC text only: never the private details or the storage location. */
function publicText(record, zones) {
  const zone = (zones || []).find((candidate) => candidate.code === record.generalLocation);
  return [record.title, record.description, record.brand, record.locationDetail, zone ? zone.label : '']
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

export function toCard(record) {
  const { id, reportType, title, category, colour, generalLocation, locationDetail, dateOccurred, status, image, isMine, createdAt } = record;
  return { id, reportType, title, category, colour, generalLocation, locationDetail: locationDetail || null, dateOccurred, status, image: image || null, isMine: Boolean(isMine), createdAt };
}

function paginate(records, { page = 1, limit = 20 }) {
  const total = records.length;
  return {
    items: records.slice((page - 1) * limit, page * limit).map(toCard),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Everyone's reports (public cards). */
export function browse(records, zones, query = {}) {
  const { q, reportType, category, colour, location, status, dateFrom, dateTo, sort = 'newest' } = query;
  const words = splitWords(q);
  const allowed = status ? (BROWSABLE.includes(status) ? [status] : []) : ACTIVE;
  const found = records.filter((record) => {
    if (!allowed.includes(record.status)) return false;
    if (reportType && record.reportType !== reportType) return false;
    if (category && record.category !== category) return false;
    if (colour && record.colour !== colour) return false;
    if (location && record.generalLocation !== location) return false;
    if (dateFrom && day(record.dateOccurred) < day(dateFrom)) return false;
    if (dateTo && day(record.dateOccurred) > day(dateTo)) return false;
    if (words.length > 0) {
      const text = publicText(record, zones);
      if (!words.every((word) => text.includes(word))) return false;
    }
    return true;
  });
  found.sort(SORTS[sort] || SORTS.newest);
  return paginate(found, query);
}

/** My reports: only mine, closed ones included, newest first. */
export function mine(records, query = {}) {
  const { reportType, status } = query;
  const found = records
    .filter((record) => record.isMine && (!reportType || record.reportType === reportType) && (!status || record.status === status))
    .sort(SORTS.newest);
  return paginate(found, query);
}
