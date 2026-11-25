// Dates arrive from the server as UTC midnight ("2026-11-24T00:00:00.000Z") because only the DAY
// matters. All the maths below is done in UTC so a report never shifts by a day on a phone.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/** "24 Nov 2026" */
export function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "Today", "Yesterday", "3 days ago", or the date for anything older than a week. */
export function formatRelativeDay(iso, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.round((startOfUtcDay(now) - startOfUtcDay(date)) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

/** "Amina Yusuf" -> "Amina" (for a friendly greeting) */
export function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || '';
}
