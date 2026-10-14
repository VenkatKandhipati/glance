// Date helpers shared by the tiles. Plain Date maths; no Intl needed.

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

export function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// 'YYYY-MM-DD' in local time, used as a day key.
export function dayKey(d) {
  const m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

// Whole days from `from` to `to`, ignoring the time of day (DST-safe via rounding).
export function daysBetween(from, to) {
  return Math.round((dayStart(to) - dayStart(from)) / 864e5);
}

export function clockParts(d) {
  const h = d.getHours(), m = d.getMinutes();
  return { time: (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m, ampm: h >= 12 ? 'pm' : 'am' };
}

export function greeting(d) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Good morning.';
  if (h >= 12 && h < 17) return 'Good afternoon.';
  if (h >= 17 && h < 21) return 'Good evening.';
  return 'Good night.';
}

// Before network time arrives after a power cut, the frame's clock can read 1970.
export function clockIsSane(d) {
  return d.getFullYear() >= 2025;
}

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
