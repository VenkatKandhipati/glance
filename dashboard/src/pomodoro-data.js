// The Time screen's model: time at the desk, as one log of entries. A Pomodoro is a tracked block
// that counts down; plain tracking counts up. The timer is kept as timestamps (so a reload or a
// power cut resumes it); the numbers the screen draws come from the log. No DOM, no storage: unit
// tested.
//
//   state  { phase: 'idle' | 'work' | 'break' | 'track', start: ms, cat }   start: when it began
//   log    [{ start, end, cat, done, kind? }]   kind 'track' for tracked time; none for a Pomodoro
//
// One thing runs at a time, so entries never overlap. `done` is a full Pomodoro; a stopped one
// keeps the minutes it ran. Pomodoros count on the day they started; minutes are split at
// midnight. A streak day is any day with at least one full Pomodoro, weekends included.
import { addDays, dayKey, dayStart, daysBetween } from './time.js';

const MIN = 60000;
const MIN_STOPPED = 1; // a session stopped sooner than this many minutes isn't logged
// A session counts only if the frame was running within this many minutes of its end. One that
// ended while the frame was off or unplugged for longer is dropped: nobody saw it finish.
export const GRACE_MIN = 10;

export const IDLE = { phase: 'idle', start: 0, cat: null };
const idle = (cat) => ({ phase: 'idle', start: 0, cat });

export function phaseEnd(state, cfg) {
  if (state.phase === 'work') return state.start + cfg.work * MIN;
  if (state.phase === 'break') return state.start + cfg.break * MIN;
  return 0;
}

// Can the timer go by this clock? Not before network time (the frame reads its firmware date, a
// year or more back, after a power cut without Wi-Fi), nor while the clock is behind the phase's
// start; either would show thousands of minutes left.
export function clockTrusted(state, now, builtAt) {
  return now >= builtAt && (state.phase === 'idle' || now >= state.start);
}

// Moves the timer on to `now`. Returns { state, logged, cue, dropped }: `logged` is the session
// to add to the log (or null), `cue` 'work-done' or 'break-done' when a phase ended in the last
// minute, and `dropped` true when a session ended more than GRACE_MIN ago and so isn't logged.
// Call it only when clockTrusted().
export function advance(state, now, cfg) {
  let logged = null, cue = null, dropped = false;
  if (state.phase === 'work' && now >= phaseEnd(state, cfg)) {
    const end = phaseEnd(state, cfg);
    if (now - end > GRACE_MIN * MIN) return { state: { phase: 'idle', start: 0, cat: state.cat }, logged, cue, dropped: true };
    logged = { start: state.start, end, cat: state.cat, done: true };
    if (now - end < MIN) cue = 'work-done';
    state = { phase: 'break', start: end, cat: state.cat };
  }
  if (state.phase === 'break' && now >= phaseEnd(state, cfg)) {
    if (now - phaseEnd(state, cfg) < MIN) cue = 'break-done';
    state = { phase: 'idle', start: 0, cat: state.cat };
  }
  return { state, logged, cue, dropped };
}

// Stopping deep work early: the minutes so far, unless it had barely begun.
// Stopped by a clock that can't be trusted, it's dropped rather than logged with made-up minutes.
export function stopWork(state, now, trusted) {
  if (state.phase !== 'work') return { state, logged: null };
  const logged = trusted !== false && now - state.start >= MIN_STOPPED * MIN ? { start: state.start, end: now, cat: state.cat, done: false } : null;
  return { state: { phase: 'idle', start: 0, cat: state.cat }, logged };
}

// ---- tracking: one tap starts a category, another switches to the next, Stop ends it.
// Each returns { state, logged }; an entry under a minute isn't logged, nor one timed by a clock
// that can't be trusted.
function trackEntry(state, end, trusted) {
  return trusted !== false && end - state.start >= MIN_STOPPED * MIN
    ? { start: state.start, end, cat: state.cat, done: false, kind: 'track' } : null;
}

export function startTrack(state, cat, now, trusted) {
  if (state.phase === 'work' || state.phase === 'break') return { state, logged: null }; // a Pomodoro owns the timer
  if (state.phase === 'track' && state.cat === cat) return { state, logged: null };
  const logged = state.phase === 'track' ? trackEntry(state, now, trusted) : null;
  return { state: { phase: 'track', start: now, cat }, logged };
}

export function stopTrack(state, now, trusted) {
  if (state.phase !== 'track') return { state, logged: null };
  return { state: idle(state.cat), logged: trackEntry(state, now, trusted) };
}

// A tracker nobody has touched the frame for in `afterMs` was most likely forgotten: it stops at
// the last touch. Returns null while it should keep going.
export function autoStop(state, now, touchedAt, afterMs) {
  if (state.phase !== 'track' || !afterMs) return null;
  const last = Math.max(touchedAt || 0, state.start);
  if (now - last <= afterMs) return null;
  return Object.assign(stopTrack(state, last, true), { at: last, until: last + afterMs });
}

export const minutes = (s) => Math.round((s.end - s.start) / MIN);

// What's running now as an entry of its own (`live`), for today's numbers; null when idle or on
// a break.
export function liveEntry(state, now) {
  if (state.phase !== 'work' && state.phase !== 'track') return null;
  if (now <= state.start) return null;
  return { start: state.start, end: now, cat: state.cat, done: false, kind: state.phase === 'track' ? 'track' : undefined, live: true };
}

// A full Pomodoro counts as its work and its break: an hour at the desk with 45 + 15. Returns the
// log with each full Pomodoro's end moved on by `breakMin`, but never past the next entry's
// start (a break cut short) or `now` (a break still running). Entries in log order.
export function withBreaks(log, breakMin, now) {
  return log.map((s, i) => {
    if (!s.done || s.kind === 'track') return s;
    const next = log[i + 1];
    const end = Math.min(s.end + breakMin * MIN, next ? Math.max(s.end, next.start) : Infinity, Math.max(s.end, now));
    return end === s.end ? s : Object.assign({}, s, { end });
  });
}

// The minutes of an entry that fall within [from, to).
function within(s, from, to) {
  return Math.max(0, Math.round((Math.min(s.end, to) - Math.max(s.start, from)) / MIN));
}

const everyFocus = () => true;

// One day: full and stopped Pomodoros (on the day they started), minutes at the desk and of them
// focus (split at midnight), and minutes by category. isFocus(entry) says which minutes are focus.
export function dayTotals(log, day, isFocus) {
  const focus = isFocus || everyFocus;
  const from = dayStart(day).getTime(), to = addDays(dayStart(day), 1).getTime();
  const out = { done: 0, stopped: 0, minutes: 0, focus: 0, byCat: {} };
  log.forEach((s) => {
    if (s.kind !== 'track' && !s.live && s.start >= from && s.start < to) {
      if (s.done) out.done++;
      else out.stopped++;
    }
    const m = within(s, from, to);
    if (!m) return;
    out.minutes += m;
    if (focus(s)) out.focus += m;
    out.byCat[s.cat] = (out.byCat[s.cat] || 0) + m;
  });
  return out;
}

// One day's entries in order, cut to the day: [{ start, end, cat, live }], for a timeline.
export function dayBlocks(log, day) {
  const from = dayStart(day).getTime(), to = addDays(dayStart(day), 1).getTime();
  return log.filter((s) => s.end > from && s.start < to)
    .map((s) => ({ start: Math.max(s.start, from), end: Math.min(s.end, to), cat: s.cat, live: !!s.live }))
    .sort((a, b) => a.start - b.start);
}

// Days with a full session, as a set of day keys.
function doneDays(log) {
  const days = {};
  log.forEach((s) => { if (s.done) days[dayKey(new Date(s.start))] = true; });
  return days;
}

// { current, best } in days. Today without a session yet doesn't break the streak: it runs
// until yesterday, and today can still extend it.
export function streak(log, now) {
  const days = doneDays(log);
  let current = 0;
  let d = days[dayKey(now)] ? dayStart(now) : addDays(dayStart(now), -1);
  while (days[dayKey(d)]) { current++; d = addDays(d, -1); }
  const keys = Object.keys(days).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach((k) => {
    const day = new Date(k.slice(0, 4), k.slice(5, 7) - 1, k.slice(8, 10));
    run = prev && daysBetween(prev, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  });
  return { current, best: Math.max(best, current), today: !!days[dayKey(now)] };
}

// The last `n` days, oldest first: { day, done, minutes, focus, byCat }.
export function lastDays(log, now, n, isFocus) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = addDays(dayStart(now), -i);
    out.push(Object.assign({ day }, dayTotals(log, day, isFocus)));
  }
  return out;
}

// Minutes by category over the last `n` days, biggest first: [{ cat, minutes }].
export function categoryTotals(log, now, n) {
  const from = addDays(dayStart(now), -(n - 1)).getTime(), to = addDays(dayStart(now), 1).getTime();
  const by = {};
  log.forEach((s) => { const m = within(s, from, to); if (m) by[s.cat] = (by[s.cat] || 0) + m; });
  return Object.keys(by).map((cat) => ({ cat, minutes: by[cat] })).sort((a, b) => b.minutes - a.minutes);
}

// ---- storage format: compact, versioned. Each entry is [start in seconds, seconds, cat, flag],
// flag 1 a full Pomodoro, 0 a stopped one, 2 tracked time. Version 1 (Pomodoros only) reads as is.
// `touch` is the last touch while tracking, so a power cut can't hide a forgotten tracker; `auto`
// is the note about one that stopped by itself.
export const VERSION = 2;

const FLAG = (s) => (s.kind === 'track' ? 2 : s.done ? 1 : 0);

export function pack(data) {
  const out = {
    v: VERSION,
    saved: data.saved,
    state: data.state,
    cat: data.cat,
    log: data.log.map((s) => [Math.round(s.start / 1000), Math.round((s.end - s.start) / 1000), s.cat, FLAG(s)]),
  };
  if (data.touch) out.touch = data.touch;
  if (data.auto) out.auto = data.auto;
  return JSON.stringify(out);
}

// null for anything unreadable or from a newer version.
export function unpack(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return null; }
  if (!raw || (raw.v !== 1 && raw.v !== VERSION) || !Array.isArray(raw.log)) return null;
  const state = raw.state && /^(idle|work|break|track)$/.test(raw.state.phase) ? raw.state : IDLE;
  const out = {
    saved: raw.saved || 0,
    state,
    cat: raw.cat || null,
    log: raw.log.map((s) => {
      const e = { start: s[0] * 1000, end: (s[0] + s[1]) * 1000, cat: s[2], done: s[3] === 1 };
      if (s[3] === 2) e.kind = 'track';
      return e;
    }),
  };
  if (raw.touch) out.touch = raw.touch;
  if (raw.auto) out.auto = raw.auto;
  return out;
}

// Of two saved copies (the page's own and the kiosk's backup file), the newer one.
export function newer(a, b) {
  if (!a) return b;
  if (!b) return a;
  return b.saved > a.saved ? b : a;
}

// "1 h 30 m", "45 m", "7.5 h"
export function hoursText(mins) {
  if (mins < 60) return mins + ' m';
  if (mins >= 600) return Math.round(mins / 60) + ' h';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h + ' h' + (m ? ' ' + m + ' m' : '');
}
