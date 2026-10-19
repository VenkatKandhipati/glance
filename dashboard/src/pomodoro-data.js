// The Pomodoro screen's model: a timer kept as timestamps (so a reload or a power cut resumes it),
// the session log, and the numbers the screen draws from it. No DOM, no storage: unit tested.
//
//   state  { phase: 'idle' | 'work' | 'break', start: ms, cat }   start: when the phase began
//   log    [{ start, end, cat, done }]                             one per deep-work session
//
// A session belongs to the day it started on. `done` is a full session; a stopped one keeps the
// minutes it ran. A streak day is any day with at least one full session, weekends included.
import { addDays, dayKey, dayStart, daysBetween } from './time.js';

const MIN = 60000;
const MIN_STOPPED = 1; // a session stopped sooner than this many minutes isn't logged

export const IDLE = { phase: 'idle', start: 0, cat: null };

export function phaseEnd(state, cfg) {
  if (state.phase === 'work') return state.start + cfg.work * MIN;
  if (state.phase === 'break') return state.start + cfg.break * MIN;
  return 0;
}

// Moves the timer on to `now`. Returns { state, logged, cue }: `logged` is the session to add to
// the log (or null) and `cue` 'work-done' or 'break-done' when a phase ended in the last minute.
// One that ended long ago (the frame was off) still counts, but says nothing.
export function advance(state, now, cfg) {
  let logged = null, cue = null;
  if (state.phase === 'work' && now >= phaseEnd(state, cfg)) {
    const end = phaseEnd(state, cfg);
    logged = { start: state.start, end, cat: state.cat, done: true };
    if (now - end < MIN) cue = 'work-done';
    state = { phase: 'break', start: end, cat: state.cat };
  }
  if (state.phase === 'break' && now >= phaseEnd(state, cfg)) {
    if (now - phaseEnd(state, cfg) < MIN) cue = 'break-done';
    state = { phase: 'idle', start: 0, cat: state.cat };
  }
  return { state, logged, cue };
}

// Stopping deep work early: the minutes so far, unless it had barely begun.
export function stopWork(state, now) {
  if (state.phase !== 'work') return { state, logged: null };
  const logged = now - state.start >= MIN_STOPPED * MIN ? { start: state.start, end: now, cat: state.cat, done: false } : null;
  return { state: { phase: 'idle', start: 0, cat: state.cat }, logged };
}

export const minutes = (s) => Math.round((s.end - s.start) / MIN);

// One day: full sessions, stopped ones, minutes of deep work, and minutes by category.
export function dayTotals(log, day) {
  const key = dayKey(day);
  const out = { done: 0, stopped: 0, minutes: 0, byCat: {} };
  log.forEach((s) => {
    if (dayKey(new Date(s.start)) !== key) return;
    if (s.done) out.done++;
    else out.stopped++;
    out.minutes += minutes(s);
    out.byCat[s.cat] = (out.byCat[s.cat] || 0) + minutes(s);
  });
  return out;
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

// The last `n` days, oldest first: { day, done, minutes, byCat }.
export function lastDays(log, now, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = addDays(dayStart(now), -i);
    out.push(Object.assign({ day }, dayTotals(log, day)));
  }
  return out;
}

// `weeks` columns of 7 days, the last one this week, starting on `weekStartsOn` (0 Sunday): each
// cell the day's full sessions, or null for days still to come.
export function weekGrid(log, now, weeks, weekStartsOn) {
  const counts = {};
  log.forEach((s) => { if (s.done) { const k = dayKey(new Date(s.start)); counts[k] = (counts[k] || 0) + 1; } });
  const today = dayStart(now);
  const back = (today.getDay() - weekStartsOn + 7) % 7;
  const first = addDays(today, -back - 7 * (weeks - 1));
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(first, w * 7 + i);
      col.push(day > today ? null : counts[dayKey(day)] || 0);
    }
    cols.push(col);
  }
  return { first, cols };
}

// Minutes by category over the last `n` days, biggest first: [{ cat, minutes }].
export function categoryTotals(log, now, n) {
  const from = addDays(dayStart(now), -(n - 1)).getTime();
  const by = {};
  log.forEach((s) => { if (s.start >= from) by[s.cat] = (by[s.cat] || 0) + minutes(s); });
  return Object.keys(by).map((cat) => ({ cat, minutes: by[cat] })).sort((a, b) => b.minutes - a.minutes);
}

// ---- storage format: compact, versioned. Each session is [start in seconds, minutes, cat, done].
export const VERSION = 1;

export function pack(data) {
  return JSON.stringify({
    v: VERSION,
    saved: data.saved,
    state: data.state,
    cat: data.cat,
    log: data.log.map((s) => [Math.round(s.start / 1000), Math.round((s.end - s.start) / 1000), s.cat, s.done ? 1 : 0]),
  });
}

// null for anything unreadable or from a newer version.
export function unpack(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return null; }
  if (!raw || raw.v !== VERSION || !Array.isArray(raw.log)) return null;
  const state = raw.state && /^(idle|work|break)$/.test(raw.state.phase) ? raw.state : IDLE;
  return {
    saved: raw.saved || 0,
    state,
    cat: raw.cat || null,
    log: raw.log.map((s) => ({ start: s[0] * 1000, end: (s[0] + s[1]) * 1000, cat: s[2], done: s[3] === 1 })),
  };
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
