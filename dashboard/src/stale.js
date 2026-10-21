// Last good data for the feeds that fail when Wi-Fi drops: kept in localStorage so a reload or a
// power cut during an outage still has something to show, with its age for a "stale" badge.

// Older than these, a feed gets a badge: about one and a half missed polls.
export const WEATHER_STALE_MS = 45 * 60000; // polled every 30 min
export const CALENDAR_STALE_MS = 25 * 60000; // polled every 10 min

// "12 min old", "3 h old", or null while the data is fresher than maxMs (or there's none).
export function ageText(at, now, maxMs) {
  if (!at) return null;
  const ms = now - at;
  if (ms <= maxMs) return null;
  const min = Math.round(ms / 60000);
  if (min < 60) return min + ' min old';
  const h = Math.round(min / 60);
  return h < 48 ? h + ' h old' : Math.round(h / 24) + ' days old';
}

// Saves { at, data }; quietly does nothing when storage is unavailable or full.
export function save(key, data, at, store) {
  try {
    (store || localStorage).setItem(key, JSON.stringify({ at, data }));
  } catch (e) { /* ignore */ }
}

// Calendar occurrences come back from JSON with their dates as strings.
export function reviveEvents(list) {
  return list.map((o) => Object.assign({}, o, { start: new Date(o.start), end: new Date(o.end) }));
}

// { at, data }, or null for nothing saved, unreadable, or older than maxMs.
export function load(key, now, maxMs, store) {
  try {
    const saved = JSON.parse((store || localStorage).getItem(key) || 'null');
    if (!saved || typeof saved.at !== 'number' || !saved.data || now - saved.at > maxMs) return null;
    return saved;
  } catch (e) {
    return null;
  }
}
