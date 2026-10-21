// Month calendar tile: this month's grid with today highlighted and dots on busy days, then "Next
// up": the soonest of your marked dates (content.js) and Google calendar events.
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

// "3:30 pm", or "7 pm" on the hour.
export function timeText(d) {
  const h = d.getHours(), m = d.getMinutes();
  return (h % 12 || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h >= 12 ? ' pm' : ' am');
}

function dayText(day, today) {
  const n = daysBetween(today, day);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return DAYS[day.getDay()].slice(0, 3) + ' ' + day.getDate() + ' ' + MONTHS[day.getMonth()].slice(0, 3);
}

// When line for "Next up": all-day items keep the countdown ("Tue 20 Oct · in 4 days"), timed ones
// give the time ("Today · 3:30 pm", "Now · until 4 pm").
export function whenText(item, now) {
  const today = dayStart(now);
  if (item.allDay) {
    const day = dayStart(item.start);
    const n = daysBetween(today, day);
    return n < 2 ? dayText(day, today) : dayText(day, today) + ' · ' + countdown(n);
  }
  if (item.start <= now) return 'Now · until ' + timeText(item.end);
  return dayText(dayStart(item.start), today) + ' · ' + timeText(item.start);
}

// The soonest of the marked dates and the (non-quiet) calendar events that start today or later
// and haven't finished. Something that began before today, like day 3 of a trip, doesn't count.
export function nextUp(list, events, now) {
  const today = dayStart(now);
  const items = events.filter((e) => !e.quiet && e.start >= today && (e.allDay || e.end > now));
  const marked = nextMarked(list, today);
  if (marked) items.push({ title: marked.title, start: marked.day, allDay: true });
  items.sort((a, b) => a.start - b.start || (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0));
  return items[0] || null;
}

// Quiet calendars: what starts today or tomorrow, as { calendar, when, title, more }, or null.
export function quietLine(events, now) {
  const today = dayStart(now), dayAfter = addDays(today, 2);
  const starting = events.filter((e) => e.quiet && e.start >= today && e.start < dayAfter);
  if (!starting.length) return null;
  const first = starting[0];
  return {
    calendar: first.calendar,
    when: daysBetween(today, dayStart(first.start)) === 0 ? 'Today' : 'Tomorrow',
    title: first.title,
    more: starting.length - 1,
  };
}

// Day keys to put a dot on: marked dates, plus each day a non-quiet event covers.
export function markedDays(list, events, year) {
  const marked = {};
  datesIn(list, year).forEach((d) => { marked[dayKey(d.day)] = true; });
  events.forEach((e) => {
    if (e.quiet) return;
    const last = e.allDay ? addDays(e.end, -1) : e.start;
    for (let d = dayStart(e.start); d <= last; d = addDays(d, 1)) marked[dayKey(d)] = true;
  });
  return marked;
}

// The first day shown on the month grid: the start of the week the 1st falls in.
function gridStart(today) {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return addDays(first, -((first.getDay() - settings.weekStartsOn + 7) % 7));
}

// The day under a tap at (x, y) px from the grid's top left, or null. Every grid row is ROW px,
// weekday names included; a tap is taken by the cell it's closest to, not just the circle drawn.
const ROW = 31;
export function dayAtGrid(now, width, x, y) {
  const row = Math.floor(y / ROW) - 1, col = Math.floor(x / (width / 7));
  if (row < 0 || col < 0 || col > 6) return null;
  const today = dayStart(now);
  const day = addDays(gridStart(today), row * 7 + col);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return day <= addDays(lastOfMonth, 6 - ((lastOfMonth.getDay() - settings.weekStartsOn + 7) % 7)) ? day : null;
}

// Draws the tile; only touches the DOM when something visible changed, so it's cheap to call
// every minute and whenever the calendars refresh.
// stale: the calendars' age once they're overdue ("2 h old"), or null.
export function renderCalendar(el, now, events, stale) {
  events = events || [];
  const today = dayStart(now);
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const lead = (first.getDay() - settings.weekStartsOn + 7) % 7;
  const start = gridStart(today);
  const marked = markedDays(dates, events, today.getFullYear());

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

  const quiet = quietLine(events, now);
  const quietHtml = quiet
    ? '<div class="cal-quiet"><div class="cal-label">' + esc(quiet.calendar) + (quiet.more ? ' · +' + quiet.more : '') +
      '</div><div class="cal-quiet-title"><b>' + quiet.when + '</b> ' + esc(quiet.title) + '</div></div>'
    : '';
  const next = nextUp(dates, events, now);
  const nextHtml = next
    ? '<div class="cal-next"><div class="cal-label">Next up</div>' +
      '<div class="cal-next-title">' + esc(next.title) + '</div>' +
      '<div class="cal-next-when">' + whenText(next, now) + '</div></div>'
    : '';

  const html =
    '<div class="cal-side">' +
    '<div class="cal-month serif">' + MONTHS[today.getMonth()] + '<i>,</i></div>' +
    '<div class="cal-year">' + today.getFullYear() + (stale ? '<span class="stale">Calendar ' + stale + '</span>' : '') + '</div>' +
    '<div class="cal-agenda">' + quietHtml + nextHtml + '</div></div>' +
    '<div class="cal-grid">' + grid + '</div>';
  if (el.__html !== html) el.innerHTML = el.__html = html;
}
