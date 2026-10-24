import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDLE, advance, startTrack, stopTrack, autoStop, liveEntry, withBreaks, focusDays, nudges, dayTotals, dayBlocks, categoryTotals, lastDays, streak, usualByCat, nextFocus, pack, unpack } from '../src/pomodoro-data.js';

const MIN = 60000, H = 60 * MIN;
const at = (y, mo, d, h, m) => new Date(y, mo - 1, d, h || 0, m || 0).getTime();
const t9 = at(2026, 10, 21, 9);
const focusIds = { geico: true, 'interview-prep': true };
const isFocus = (s) => !!focusIds[s.cat];

test('a tap starts tracking, another switches and logs the first, Stop logs the last', () => {
  let r = startTrack(IDLE, 'geico', t9);
  assert.deepEqual(r.state, { phase: 'track', start: t9, cat: 'geico' });
  assert.equal(r.logged, null);
  r = startTrack(r.state, 'scrolling', t9 + 30 * MIN);
  assert.deepEqual(r.logged, { start: t9, end: t9 + 30 * MIN, cat: 'geico', done: false, kind: 'track' });
  assert.equal(r.state.cat, 'scrolling');
  r = stopTrack(r.state, t9 + 42 * MIN);
  assert.equal(r.state.phase, 'idle');
  assert.equal(r.state.cat, 'scrolling');
  assert.equal(r.logged.end - r.logged.start, 12 * MIN);
});

test('tapping the running category again changes nothing; under a minute is not logged', () => {
  const s = { phase: 'track', start: t9, cat: 'geico' };
  assert.equal(startTrack(s, 'geico', t9 + 5 * MIN).state, s);
  assert.equal(startTrack(s, 'break', t9 + 30000).logged, null);
  assert.equal(stopTrack(s, t9 + 30000).logged, null);
  assert.equal(stopTrack(s, t9 + 20 * MIN, false).logged, null); // untrusted clock
});

test('a running Pomodoro keeps the timer: a category tap does not start tracking', () => {
  const work = { phase: 'work', start: t9, cat: 'geico' };
  assert.equal(startTrack(work, 'scrolling', t9 + 5 * MIN).state, work);
  assert.equal(stopTrack(work, t9 + 5 * MIN).state, work);
});

test('tracking is not a Pomodoro phase: advance leaves it alone', () => {
  const s = { phase: 'track', start: t9, cat: 'geico' };
  assert.equal(advance(s, t9 + 5 * H, { work: 45, break: 15 }).state, s);
});

test('a forgotten tracker stops at the last touch once nobody has touched the frame for 2 h', () => {
  const s = { phase: 'track', start: t9, cat: 'scrolling' };
  assert.equal(autoStop(s, t9 + 2 * H, t9 + 10 * MIN, 2 * H), null);
  const r = autoStop(s, t9 + 10 * MIN + 2 * H + 1000, t9 + 10 * MIN, 2 * H);
  assert.equal(r.state.phase, 'idle');
  assert.deepEqual([r.logged.start, r.logged.end], [t9, t9 + 10 * MIN]);
  assert.equal(r.at, t9 + 10 * MIN);
  assert.equal(r.until, t9 + 10 * MIN + 2 * H);
  // No touch since it started (or a touch saved before it): it counts from the start.
  assert.equal(autoStop(s, t9 + 2 * H + 1000, t9 - H, 2 * H).at, t9);
  assert.equal(autoStop(s, t9 + 9 * H, t9, 0), null); // turned off
  assert.equal(autoStop(IDLE, t9 + 9 * H, 0, 2 * H), null);
});

test("today's numbers include what's running, without counting it as a Pomodoro", () => {
  const log = [{ start: at(2026, 10, 21, 8), end: at(2026, 10, 21, 8, 45), cat: 'geico', done: true }];
  const live = liveEntry({ phase: 'track', start: t9, cat: 'scrolling' }, t9 + 20 * MIN);
  const t = dayTotals(log.concat(live), new Date(t9), isFocus);
  assert.deepEqual([t.done, t.stopped, t.minutes, t.focus], [1, 0, 65, 45]);
  assert.deepEqual(t.byCat, { geico: 45, scrolling: 20 });
  assert.equal(liveEntry({ phase: 'break', start: t9, cat: 'geico' }, t9 + MIN), null);
  assert.equal(liveEntry(IDLE, t9), null);
  // A running Pomodoro counts as time at the desk, still not as a stopped one.
  const w = dayTotals([liveEntry({ phase: 'work', start: t9, cat: 'geico' }, t9 + 10 * MIN)], new Date(t9), isFocus);
  assert.deepEqual([w.stopped, w.minutes, w.focus], [0, 10, 10]);
});

test('tracked time never counts towards Pomodoros or the streak', () => {
  const log = [{ start: t9, end: t9 + 3 * H, cat: 'geico', done: false, kind: 'track' }];
  const t = dayTotals(log, new Date(t9));
  assert.deepEqual([t.done, t.stopped, t.minutes], [0, 0, 180]);
  assert.equal(streak(log, new Date(t9)).current, 0);
});

test('minutes are split at midnight', () => {
  const log = [{ start: at(2026, 10, 20, 23, 30), end: at(2026, 10, 21, 0, 45), cat: 'projects', done: false, kind: 'track' }];
  assert.equal(dayTotals(log, new Date(at(2026, 10, 20, 12))).minutes, 30);
  assert.equal(dayTotals(log, new Date(t9)).minutes, 45);
  assert.deepEqual(dayBlocks(log, new Date(t9)), [{ start: at(2026, 10, 21), end: at(2026, 10, 21, 0, 45), cat: 'projects', live: false }]);
  const days = lastDays(log, new Date(t9), 2);
  assert.deepEqual(days.map((d) => d.minutes), [30, 45]);
  // the last 7 days stop at the window's edge
  assert.deepEqual(categoryTotals(log, new Date(t9), 1), [{ cat: 'projects', minutes: 45 }]);
});

test("a day's blocks come in order, the running one marked", () => {
  const log = [
    { start: t9 + H, end: t9 + 2 * H, cat: 'b', done: false, kind: 'track' },
    { start: t9, end: t9 + 45 * MIN, cat: 'a', done: true },
    { start: at(2026, 10, 20, 9), end: at(2026, 10, 20, 10), cat: 'old', done: true },
  ];
  const live = liveEntry({ phase: 'track', start: t9 + 2 * H, cat: 'c' }, t9 + 2 * H + 5 * MIN);
  assert.deepEqual(dayBlocks(log.concat(live), new Date(t9)).map((b) => b.cat + (b.live ? '*' : '')), ['a', 'b', 'c*']);
});

test('version 1 logs (Pomodoros only) read unchanged and save as version 2', () => {
  // The shape of the frame's pomodoro.json before tracking: four full 45-minute GEICO sessions.
  const s = Math.round(at(2026, 10, 20, 9) / 1000);
  const v1 = JSON.stringify({ v: 1, saved: 1, state: { phase: 'idle', start: 0, cat: 'geico' }, cat: 'geico',
    log: [0, 1, 2, 3].map((i) => [s + i * 3600, 2700, 'geico', 1]) });
  const data = unpack(v1);
  assert.equal(data.log.length, 4);
  assert.ok(data.log.every((e) => e.done && e.cat === 'geico' && e.kind === undefined && e.end - e.start === 45 * MIN));
  assert.equal(dayTotals(data.log, new Date(at(2026, 10, 20, 12))).minutes, 180);
  const again = JSON.parse(pack(data));
  assert.equal(again.v, 2);
  assert.deepEqual(unpack(pack(data)), data);
});

test('tracked entries, the tracking state, the last touch and the auto-stop note survive packing', () => {
  const data = {
    saved: 9,
    state: { phase: 'track', start: t9, cat: 'scrolling' },
    cat: 'scrolling',
    log: [{ start: t9 - H, end: t9 - 30 * MIN, cat: 'break', done: false, kind: 'track' }],
    touch: t9 + 5 * MIN,
    auto: { cat: 'geico', at: t9 - 2 * H, until: t9 },
  };
  assert.deepEqual(unpack(pack(data)), data);
});

test('a full Pomodoro counts as an hour with its break; 2 of them and an hour tracked make 3 h of focus', () => {
  const p = (h) => ({ start: at(2026, 10, 21, h), end: at(2026, 10, 21, h, 45), cat: 'geico', done: true });
  const log = [p(9), p(10), { start: at(2026, 10, 21, 13), end: at(2026, 10, 21, 14), cat: 'geico', done: false, kind: 'track' }];
  const t = dayTotals(withBreaks(log, 15, at(2026, 10, 21, 20)), new Date(t9), isFocus);
  assert.equal(t.focus, 180);
  assert.equal(t.done, 2);
});

test('the break counted for a Pomodoro stops at whatever came next, at now, and only for full ones', () => {
  const full = { start: t9, end: t9 + 45 * MIN, cat: 'geico', done: true };
  const next = { start: t9 + 50 * MIN, end: t9 + 70 * MIN, cat: 'scrolling', done: false, kind: 'track' };
  assert.equal(withBreaks([full, next], 15, t9 + 5 * H)[0].end, t9 + 50 * MIN); // break cut short
  assert.equal(withBreaks([full], 15, t9 + 52 * MIN)[0].end, t9 + 52 * MIN); // break still running
  assert.equal(withBreaks([full], 15, t9 + 5 * H)[0].end, t9 + 60 * MIN);
  const stopped = Object.assign({}, full, { done: false });
  assert.equal(withBreaks([stopped], 15, t9 + 5 * H)[0], stopped);
  assert.equal(withBreaks([next], 15, t9 + 5 * H)[0], next);
});

test('the streak counts days with an hour of focus, from Pomodoros or tracking alike', () => {
  const d = (day, h, m, cat, kind) => ({ start: at(2026, 10, day, h), end: at(2026, 10, day, h) + m * MIN, cat, done: !kind && m === 45, kind });
  const log = withBreaks([
    d(18, 9, 45, 'geico'), // a full Pomodoro: an hour with its break
    d(19, 9, 60, 'interview-prep', 'track'), // an hour tracked
    d(20, 9, 50, 'geico', 'track'), // 50 minutes: not enough
    d(20, 11, 120, 'scrolling', 'track'), // not focus
    d(21, 9, 30, 'geico', 'track'), d(21, 14, 30, 'learning', 'track'), // two halves make an hour
  ], 15, at(2026, 10, 21, 20));
  const isF = (s) => s.cat !== 'scrolling' && s.cat !== 'break';
  const days = focusDays(log, isF, 60);
  assert.deepEqual(Object.keys(days).sort(), ['2026-10-18', '2026-10-19', '2026-10-21']);
  const r = streak(log, new Date(at(2026, 10, 21, 20)), days);
  assert.deepEqual([r.current, r.best, r.today], [1, 2, true]);
});

test('doom scrolling and breaks earn a reminder every 10 minutes; nothing else does', () => {
  const cats = ['scrolling', 'break'];
  const s = { phase: 'track', start: t9, cat: 'scrolling' };
  assert.equal(nudges(s, t9 + 9 * MIN, cats, 10), 0);
  assert.equal(nudges(s, t9 + 10 * MIN, cats, 10), 1);
  assert.equal(nudges(s, t9 + 35 * MIN, cats, 10), 3);
  assert.equal(nudges({ phase: 'track', start: t9, cat: 'geico' }, t9 + H, cats, 10), 0);
  assert.equal(nudges({ phase: 'work', start: t9, cat: 'break' }, t9 + H, cats, 10), 0);
  assert.equal(nudges(s, t9 + H, cats, 0), 0);
});

// ---- the last 7 days: a day's usual, and which category to give time to next
// A week shaped like the owner's: nothing Sun and Mon (before tracking began), GEICO on weekdays.
const day = (byCat) => ({ byCat, minutes: Object.keys(byCat).reduce((n, k) => n + byCat[k], 0) });
const week = [
  day({}), day({}),                                                           // Sun, Mon
  day({ geico: 120 }),                                                        // Tue
  day({ geico: 120, projects: 106, 'interview-prep': 15, learning: 45, scrolling: 10 }), // Wed
  day({ geico: 226, learning: 60, bathroom: 13 }),                            // Thu
  day({ geico: 77, projects: 49, 'interview-prep': 120, scrolling: 45, bathroom: 14 }),  // Fri
  day({}),                                                                    // today, Sat
];
const balance = [{ id: 'interview-prep' }, { id: 'learning' }, { id: 'chores', daily: 15 }];

test('usual: the average over past days with anything tracked, not over empty ones or today', () => {
  const u = usualByCat(week);
  // Tue–Fri: four days
  assert.equal(u.geico, Math.round(543 / 4));
  assert.equal(u['interview-prep'], Math.round(135 / 4));
  assert.equal(u.learning, Math.round(105 / 4));
  assert.equal(u.chores, undefined);
  assert.deepEqual(usualByCat([day({}), day({ geico: 30 })]), {}); // only today: no usual yet
});

test('next focus: the longest since, with its minutes over the last 3 days', () => {
  // Chores never; Masters last Thu (2 days); Recruiting Fri (1 day)
  assert.deepEqual(nextFocus(week, balance, 3), { cat: 'chores', since: null, recent: 0, today: 0 });
  const done = week.slice(0, 6).concat(day({ chores: 20 }));
  assert.deepEqual(nextFocus(done, balance, 3), { cat: 'learning', since: 2, recent: 60, today: 0 });
});

test('next focus: a daily category counts a day only with its minutes, and drops out once today has them', () => {
  const w = week.slice(0, 5).concat(day({ chores: 10, 'interview-prep': 120 }), day({ chores: 10 }));
  // 10 m of chores isn't a chores day, so chores still has none: it comes first
  assert.equal(nextFocus(w, balance, 3).cat, 'chores');
  assert.equal(nextFocus(w, balance, 3).today, 10);
  const w2 = w.slice(0, 6).concat(day({ chores: 15 }));
  assert.equal(nextFocus(w2, balance, 3).cat, 'learning');
});

test('next focus: on a tie a daily category goes last, then the fewest recent minutes, then the order given', () => {
  // all three last done yesterday
  const w = [day({}), day({}), day({}), day({}), day({ learning: 30 }), day({ 'interview-prep': 20, learning: 30, chores: 15 }), day({})];
  assert.equal(nextFocus(w, balance, 3).cat, 'interview-prep'); // 20 m beats Masters' 60 m; chores waits
  const even = [day({}), day({}), day({}), day({}), day({}), day({ 'interview-prep': 30, learning: 30 }), day({})];
  assert.equal(nextFocus(even, balance, 3).cat, 'chores'); // never done: longest since
  const evenDone = even.slice(0, 6).concat(day({ chores: 15 }));
  assert.equal(nextFocus(evenDone, balance, 3).cat, 'interview-prep'); // listed first
});

test('next focus: nothing when every category has had time today; an empty log names the most behind', () => {
  const all = week.slice(0, 6).concat(day({ 'interview-prep': 5, learning: 5, chores: 15 }));
  assert.equal(nextFocus(all, balance, 3), null);
  const empty = [0, 1, 2, 3, 4, 5, 6].map(() => day({}));
  assert.deepEqual(nextFocus(empty, balance, 3), { cat: 'interview-prep', since: null, recent: 0, today: 0 });
});

test('next focus from the log: minutes split at midnight count on each day', () => {
  const now = new Date(2026, 9, 24, 9);
  // Masters from 11 pm Thu to 1 am Fri: 60 m Thu, 60 m Fri
  const log = [{ start: at(2026, 10, 22, 23), end: at(2026, 10, 23, 1), cat: 'learning', done: false, kind: 'track' },
    { start: at(2026, 10, 23, 10), end: at(2026, 10, 23, 11), cat: 'interview-prep', done: false, kind: 'track' },
    { start: at(2026, 10, 23, 12), end: at(2026, 10, 23, 12, 20), cat: 'chores', done: false, kind: 'track' }];
  const days = lastDays(log, now, 7, isFocus);
  assert.equal(days[4].byCat.learning, 60);
  assert.equal(days[5].byCat.learning, 60);
  // all three last on Fri; chores waits; Recruiting (60) and Masters (120): Recruiting
  assert.deepEqual(nextFocus(days, balance, 3), { cat: 'interview-prep', since: 1, recent: 60, today: 0 });
});
