// Turns a report's place into words. The server sends a zone CODE and an optional detail; the
// zone's NAME comes from the server's own list (GET /meta/options), never from a copy in the app.

export function zoneLabel(zones, code) {
  const zone = (zones || []).find((candidate) => candidate.code === code);
  return zone ? zone.label : null;
}

/** "Winslow", "Main library, second floor", or the zone's name when there is no detail. */
export function placeText(zones, code, detail) {
  if (detail && detail !== 'Not sure which') return detail;
  return zoneLabel(zones, code) || 'Somewhere on campus';
}

/** A second line that adds the zone name when the detail is a specific place. */
export function placeZoneLine(zones, code, detail) {
  const label = zoneLabel(zones, code);
  if (!label) return null;
  return detail && detail !== 'Not sure which' ? label : null;
}
