// A small iCalendar (RFC 5545) reader for Google Calendar's secret-address feeds: enough for what
// those feeds contain, not the whole spec. Kept free of the DOM so it can be unit tested.
//
//   occurrences(parseIcs(text), from, to) → [{ title, start, end, allDay }] sorted by start
//
// Handles RRULE (DAILY / WEEKLY / MONTHLY / YEARLY with INTERVAL, COUNT, UNTIL, BYDAY,
// BYMONTHDAY, BYMONTH), EXDATE, edited occurrences (RECURRENCE-ID), cancelled events, all-day and
// multi-day events, and TZID times (converted with Intl, so DST is right). Anything stranger (e.g.
// BYSETPOS) is shown on its first date only rather than guessed.

const DAY = 864e5;
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MAX_STEPS = 20000; // per series; a daily event from 1970 to 2030 is ~22k

// ------------------------------------------------------------------ parsing

function unescapeText(v) {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

// "DTSTART;TZID=America/New_York:20261020T153000" → { name, params: { TZID }, value }
function property(line) {
  let quoted = false, colon = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ':' && !quoted) { colon = i; break; }
  }
  if (colon < 0) return null;
  const head = line.slice(0, colon).split(';');
  const params = {};
  for (let i = 1; i < head.length; i++) {
    const eq = head[i].indexOf('=');
    if (eq > 0) params[head[i].slice(0, eq).toUpperCase()] = head[i].slice(eq + 1).replace(/"/g, '');
  }
  return { name: head[0].toUpperCase(), params, value: line.slice(colon + 1) };
}

// A wall-clock time as written in the file: { y, m (1–12), d, h, mi, s, allDay, utc, tz }.
function wallTime(value, params) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const allDay = params.VALUE === 'DATE' || !m[4];
  return {
    y: +m[1], m: +m[2], d: +m[3],
    h: allDay ? 0 : +m[4], mi: allDay ? 0 : +m[5], s: allDay ? 0 : +m[6],
    allDay, utc: !!m[7], tz: allDay || m[7] ? null : params.TZID || null,
  };
}

function parseRule(value) {
  const r = { freq: '', interval: 1, count: 0, until: null, byday: [], bymonthday: [], bymonth: [], other: false };
  for (const part of value.split(';')) {
    const [k, v] = part.split('=');
    if (k === 'FREQ') r.freq = v;
    else if (k === 'INTERVAL') r.interval = Math.max(1, +v || 1);
    else if (k === 'COUNT') r.count = +v || 0;
    else if (k === 'UNTIL') r.until = wallTime(v, {});
    else if (k === 'BYDAY') {
      r.byday = v.split(',').map((x) => {
        const b = /^([+-]?\d+)?([A-Z]{2})$/.exec(x);
        return b ? { n: b[1] ? +b[1] : 0, wd: WEEKDAYS.indexOf(b[2]) } : null;
      }).filter((b) => b && b.wd >= 0);
    } else if (k === 'BYMONTHDAY') r.bymonthday = v.split(',').map(Number);
    else if (k === 'BYMONTH') r.bymonth = v.split(',').map(Number);
    else if (k !== 'WKST') r.other = true; // BYSETPOS, BYHOUR, …: not supported
  }
  return r;
}

export function parseIcs(text) {
  const events = [];
  let cur = null;
  for (const line of text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
    if (line === 'BEGIN:VEVENT') { cur = { exdates: [] }; continue; }
    if (line === 'END:VEVENT') { if (cur && cur.start) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const p = property(line);
    if (!p) continue;
    if (p.name === 'UID') cur.uid = p.value;
    else if (p.name === 'SUMMARY') cur.title = unescapeText(p.value);
    else if (p.name === 'DTSTART') cur.start = wallTime(p.value, p.params);
    else if (p.name === 'DTEND') cur.end = wallTime(p.value, p.params);
    else if (p.name === 'DURATION') cur.duration = p.value;
    else if (p.name === 'RRULE') cur.rule = parseRule(p.value);
    else if (p.name === 'EXDATE') p.value.split(',').forEach((v) => cur.exdates.push(wallTime(v, p.params)));
    else if (p.name === 'RECURRENCE-ID') cur.recurrenceId = wallTime(p.value, p.params);
    else if (p.name === 'STATUS') cur.cancelled = p.value === 'CANCELLED';
  }
  return events;
}

// ------------------------------------------------------------------ time zones

const formats = {};
// Offset of `tz` from UTC at the instant `ms`, in ms. Throws for an unknown zone.
function tzOffset(ms, tz) {
  const f = formats[tz] || (formats[tz] = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }));
  const p = {};
  f.formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}

// The real instant of a wall-clock time: UTC, in a named zone, or (floating, all-day) local.
export function toDate(w) {
  if (w.allDay) return new Date(w.y, w.m - 1, w.d);
  const naive = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
  if (w.utc) return new Date(naive);
  if (w.tz) {
    try {
      let t = naive - tzOffset(naive, w.tz);
      const again = tzOffset(t, w.tz); // the guess may sit across a DST change
      if (naive - again !== t) t = naive - again;
      return new Date(t);
    } catch (e) { /* unknown zone: fall back to the frame's own */ }
  }
  return new Date(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
}

// ------------------------------------------------------------------ recurrence

// Calendar maths on day numbers (days since 1970-01-01), independent of any time zone.
const dayNum = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
function fromDayNum(n) {
  const t = new Date(n * DAY);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
const weekday = (n) => (n + 4) % 7; // 1970-01-01 was a Thursday
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// The nth (1-based, negative from the end) weekday `wd` of a month, as a day number, or null.
function nthWeekday(y, m, n, wd) {
  if (n > 0) {
    const first = dayNum(y, m, 1);
    const day = first + ((wd - weekday(first) + 7) % 7) + (n - 1) * 7;
    return fromDayNum(day).m === m ? day : null;
  }
  const last = dayNum(y, m, daysInMonth(y, m));
  const day = last - ((weekday(last) - wd + 7) % 7) + (n + 1) * 7;
  return fromDayNum(day).m === m ? day : null;
}

// The day numbers a rule produces in one period (a day, a week, a month or a year), sorted.
function periodDays(rule, start, period) {
  const s = fromDayNum(start);
  if (rule.freq === 'DAILY') return [start + period * rule.interval];
  if (rule.freq === 'WEEKLY') {
    const monday = start - ((weekday(start) + 6) % 7) + period * rule.interval * 7;
    const wds = rule.byday.length ? rule.byday.map((b) => b.wd) : [weekday(start)];
    return wds.map((wd) => monday + ((wd + 6) % 7)).sort((a, b) => a - b);
  }
  if (rule.freq === 'MONTHLY') {
    const total = s.y * 12 + (s.m - 1) + period * rule.interval;
    const y = Math.floor(total / 12), m = (total % 12) + 1;
    if (rule.byday.length) return rule.byday.map((b) => nthWeekday(y, m, b.n || 1, b.wd)).filter((d) => d !== null).sort((a, b) => a - b);
    const mdays = rule.bymonthday.length ? rule.bymonthday : [s.d];
    return mdays.map((md) => (md < 0 ? daysInMonth(y, m) + md + 1 : md))
      .filter((md) => md >= 1 && md <= daysInMonth(y, m)).map((md) => dayNum(y, m, md)).sort((a, b) => a - b);
  }
  if (rule.freq === 'YEARLY') {
    const y = s.y + period * rule.interval;
    const months = rule.bymonth.length ? rule.bymonth : [s.m];
    const out = [];
    for (const m of months) {
      if (rule.byday.length && rule.byday[0].n) {
        rule.byday.forEach((b) => { const d = nthWeekday(y, m, b.n, b.wd); if (d !== null) out.push(d); });
      } else {
        const mdays = rule.bymonthday.length ? rule.bymonthday : [s.d];
        mdays.forEach((md) => { if (md >= 1 && md <= daysInMonth(y, m)) out.push(dayNum(y, m, md)); }); // no Feb 29 in other years
      }
    }
    return out.sort((a, b) => a - b);
  }
  return [];
}

const key = (w) => w.y * 1e10 + w.m * 1e8 + w.d * 1e6 + w.h * 1e4 + w.mi * 100 + w.s;

// First day of a rule's period, so the loop knows when it has passed `toDay` even if a period
// produces no dates (a 31st in a 30-day month).
function periodStart(rule, first, period) {
  const s = fromDayNum(first);
  if (rule.freq === 'MONTHLY') {
    const total = s.y * 12 + (s.m - 1) + period * rule.interval;
    return dayNum(Math.floor(total / 12), (total % 12) + 1, 1);
  }
  if (rule.freq === 'YEARLY') return dayNum(s.y + period * rule.interval, 1, 1);
  if (rule.freq === 'WEEKLY') return first - ((weekday(first) + 6) % 7) + period * rule.interval * 7;
  return first + period * rule.interval;
}

const FREQS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

// Start wall-times of a series, from its first date up to `toDay` (a day number). COUNT is
// counted from the first date, so dates before the window still use up the count.
function seriesStarts(ev, toDay) {
  const rule = ev.rule;
  const s = ev.start;
  if (!rule || rule.other || FREQS.indexOf(rule.freq) < 0) return [s];
  const first = dayNum(s.y, s.m, s.d);
  // An all-day UNTIL includes that whole day.
  const until = rule.until && toDate(rule.until.allDay
    ? { y: rule.until.y, m: rule.until.m, d: rule.until.d, h: 23, mi: 59, s: 59, allDay: false, utc: false, tz: null }
    : rule.until);
  const out = [];
  for (let period = 0; period < MAX_STEPS && periodStart(rule, first, period) <= toDay; period++) {
    for (const day of periodDays(rule, first, period)) {
      if (day < first) continue;
      if (day > toDay) return out;
      const w = Object.assign({}, s, fromDayNum(day));
      if (until && toDate(w) > until) return out;
      out.push(w);
      if (rule.count && out.length >= rule.count) return out;
    }
  }
  return out;
}

// Length of an event: all-day in whole days, timed in ms.
function length(ev) {
  if (ev.start.allDay) {
    if (ev.end) return { days: Math.max(1, dayNum(ev.end.y, ev.end.m, ev.end.d) - dayNum(ev.start.y, ev.start.m, ev.start.d)) };
    return { days: 1 };
  }
  if (ev.end) return { ms: toDate(ev.end) - toDate(ev.start) };
  const d = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(ev.duration || '');
  return { ms: d ? ((+d[1] || 0) * 24 * 60 + (+d[2] || 0) * 60 + (+d[3] || 0)) * 60000 : 0 };
}

function occurrence(ev, w, len) {
  const start = toDate(w);
  let end;
  if (len.days) end = new Date(w.y, w.m - 1, w.d + len.days);
  else end = new Date(+start + len.ms);
  return { title: ev.title || '', start, end, allDay: !!w.allDay };
}

// Every occurrence overlapping [from, to), sorted by start.
export function occurrences(events, from, to) {
  const toDay = dayNum(to.getFullYear(), to.getMonth() + 1, to.getDate()) + 1;
  const edits = {}; // uid → { start key → edited event }
  events.forEach((ev) => {
    if (ev.recurrenceId && ev.uid) (edits[ev.uid] || (edits[ev.uid] = {}))[key(ev.recurrenceId)] = ev;
  });
  const out = [];
  const keep = (o) => { if (o.end > from && o.start < to) out.push(o); };
  for (const ev of events) {
    if (ev.recurrenceId) {
      if (!ev.cancelled) keep(occurrence(ev, ev.start, length(ev)));
      continue;
    }
    if (ev.cancelled) continue;
    const len = length(ev);
    const skip = {};
    ev.exdates.forEach((x) => { if (x) skip[ev.start.allDay ? key(Object.assign({}, x, { h: 0, mi: 0, s: 0 })) : +toDate(x)] = true; });
    const edited = (ev.uid && edits[ev.uid]) || {};
    for (const w of seriesStarts(ev, toDay)) {
      if (edited[key(w)]) continue;
      if (skip[w.allDay ? key(w) : +toDate(w)]) continue;
      keep(occurrence(ev, w, len));
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
