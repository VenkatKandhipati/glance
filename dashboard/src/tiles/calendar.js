// Month calendar tile: this month's grid, today highlighted, dots on marked dates, and the next
// marked date with a countdown. Redrawn when the day changes.
import { dates, settings } from '../content.js';
import { MONTHS, DAYS, addDays, dayKey, dayStart, daysBetween, esc } from '../time.js';

// The marked dates in `list` that fall in `year`, as { day: Date, title }.
export function datesIn(list, year) {
  return list.map((d) => {
    const p = d.date.split('-').map(Number);
    const day = p.length === 3 ? new Date(p[0], p[1] - 1, p[2]) : new Date(year, p[0] - 1, p[1]);
    return { day, title: d.title };
  }).filter((d) => d.day.getFullYear() === year);
}

// The first marked date on or after `today` (yearly dates roll over into next year).
export function nextMarked(list, today) {
  const y = today.getFullYear();
  const upcoming = datesIn(list, y).concat(datesIn(list, y + 1))
    .filter((d) => d.day >= today)
    .sort((a, b) => a.day - b.day);
  return upcoming[0] || null;
}

export function countdown(n) {
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 14) return 'in ' + n + ' days';
  if (n < 60) return 'in ' + Math.round(n / 7) + ' weeks';
  return 'in ' + Math.round(n / 30) + ' months';
}

export function renderCalendar(el, now) {
  const today = dayStart(now);
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const lead = (first.getDay() - settings.weekStartsOn + 7) % 7;
  const start = addDays(first, -lead);
  const marked = {};
  datesIn(dates, today.getFullYear()).forEach((d) => { marked[dayKey(d.day)] = true; });

  let grid = '';
  for (let i = 0; i < 7; i++) {
    grid += '<span class="cal-dow">' + DAYS[(settings.weekStartsOn + i) % 7].slice(0, 2).toUpperCase() + '</span>';
  }
  // Only as many weeks as the month needs (4–6), so short months don't leave an empty row.
  const weeks = Math.ceil((lead + new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()) / 7);
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    const cls = ['cal-day'];
    if (d.getMonth() !== today.getMonth()) cls.push('is-out');
    if (+d === +today) cls.push('is-today');
    if (marked[dayKey(d)]) cls.push('is-marked');
    grid += '<span class="' + cls.join(' ') + '">' + d.getDate() + '</span>';
  }

  const next = nextMarked(dates, today);
  const nextHtml = next
    ? '<div class="cal-next"><div class="cal-next-label">Next up</div>' +
      '<div class="cal-next-title">' + esc(next.title) + '</div>' +
      '<div class="cal-next-when">' + DAYS[next.day.getDay()].slice(0, 3) + ' ' + next.day.getDate() + ' ' +
      MONTHS[next.day.getMonth()].slice(0, 3) + ' · ' + countdown(daysBetween(today, next.day)) + '</div></div>'
    : '';

  el.innerHTML =
    '<div class="cal-side">' +
    '<div class="cal-month serif">' + MONTHS[today.getMonth()] + '<i>,</i></div>' +
    '<div class="cal-year">' + today.getFullYear() + '</div>' +
    nextHtml + '</div>' +
    '<div class="cal-grid">' + grid + '</div>';
}
