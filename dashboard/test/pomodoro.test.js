import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDLE, advance, clockTrusted, stopWork, dayTotals, streak, lastDays, weekGrid, categoryTotals, pack, unpack, newer, hoursText } from '../src/pomodoro-data.js';

const cfg = { work: 45, break: 15 };
const MIN = 60000;
const at = (y, mo, d, h, m) => new Date(y, mo - 1, d, h || 0, m || 0).getTime();
// A full session on a day, starting at hour h.
const full = (y, mo, d, h, cat) => ({ start: at(y, mo, d, h), end: at(y, mo, d, h) + 45 * MIN, cat: cat || 'geico', done: true });

test('work turns into a break, then the break into idle, with a cue for each', () => {
  const start = at(2026, 10, 19, 9);
  let r = advance({ phase: 'work', start, cat: 'geico' }, start + 44 * MIN, cfg);
  assert.equal(r.state.phase, 'work');
  assert.equal(r.logged, null);
  r = advance(r.state, start + 45 * MIN + 2000, cfg);
  assert.equal(r.state.phase, 'break');
  assert.equal(r.state.start, start + 45 * MIN);
  assert.deepEqual(r.logged, { start, end: start + 45 * MIN, cat: 'geico', done: true });
  assert.equal(r.cue, 'work-done');
  r = advance(r.state, start + 60 * MIN + 2000, cfg);
  assert.equal(r.state.phase, 'idle');
  assert.equal(r.state.cat, 'geico');
  assert.equal(r.cue, 'break-done');
});

test('a session that ended during a short power cut still counts, silently', () => {
  const start = at(2026, 10, 19, 9);
  const r = advance({ phase: 'work', start, cat: 'chores' }, start + 50 * MIN, cfg);
  assert.equal(r.state.phase, 'break');
  assert.equal(r.logged.done, true);
  assert.equal(r.logged.end, start + 45 * MIN);
  assert.equal(r.cue, null);
  assert.equal(r.dropped, false);
});

test('a session that ended hours before the frame came back is dropped', () => {
  const start = at(2026, 10, 19, 9);
  const r = advance({ phase: 'work', start, cat: 'chores' }, start + 5 * 60 * MIN, cfg);
  assert.equal(r.state.phase, 'idle');
  assert.equal(r.state.cat, 'chores');
  assert.equal(r.logged, null);
  assert.equal(r.dropped, true);
});

test('the clock is not trusted before network time, or behind the session', () => {
  const built = at(2026, 10, 19, 0), start = at(2026, 10, 19, 18);
  const work = { phase: 'work', start, cat: 'other' };
  assert.equal(clockTrusted(work, at(2025, 9, 28, 6), built), false); // firmware date after a power cut
  assert.equal(clockTrusted(work, start - 10 * MIN, built), false);
  assert.equal(clockTrusted(work, start + 10 * MIN, built), true);
  assert.equal(clockTrusted(IDLE, at(2026, 10, 19, 1), built), true);
});

test('stopping on an untrusted clock logs nothing', () => {
  const start = at(2026, 10, 19, 18);
  assert.equal(stopWork({ phase: 'work', start, cat: 'other' }, start + 20 * MIN, false).logged, null);
});

test('a reload mid-session resumes it where it was', () => {
  const start = at(2026, 10, 19, 9);
  const saved = pack({ saved: start + 20 * MIN, state: { phase: 'work', start, cat: 'geico' }, cat: 'geico', log: [] });
  const r = advance(unpack(saved).state, start + 20 * MIN + 500, cfg);
  assert.deepEqual(r.state, { phase: 'work', start, cat: 'geico' });
});

test('stopping early logs the minutes, unless under a minute', () => {
  const start = at(2026, 10, 19, 9);
  const s = { phase: 'work', start, cat: 'interview-prep' };
  assert.equal(stopWork(s, start + 30000).logged, null);
  const r = stopWork(s, start + 20 * MIN);
  assert.equal(r.state.phase, 'idle');
  assert.deepEqual(r.logged, { start, end: start + 20 * MIN, cat: 'interview-prep', done: false });
  assert.equal(stopWork(IDLE, start).logged, null);
});

test('a day counts full and stopped sessions and minutes by category', () => {
  const log = [full(2026, 10, 19, 9, 'geico'), full(2026, 10, 19, 11, 'chores'),
    { start: at(2026, 10, 19, 14), end: at(2026, 10, 19, 14, 20), cat: 'geico', done: false }, full(2026, 10, 18, 9)];
  const t = dayTotals(log, new Date(2026, 9, 19, 20));
  assert.equal(t.done, 2);
  assert.equal(t.stopped, 1);
  assert.equal(t.minutes, 110);
  assert.deepEqual(t.byCat, { geico: 65, chores: 45 });
});

test('a session that runs past midnight belongs to the day it started', () => {
  const log = [{ start: at(2026, 10, 19, 23, 40), end: at(2026, 10, 20, 0, 25), cat: 'geico', done: true }];
  assert.equal(dayTotals(log, new Date(2026, 9, 19)).done, 1);
  assert.equal(dayTotals(log, new Date(2026, 9, 20)).done, 0);
});

test('streaks count days with a full session, weekends included', () => {
  // Fri 16 to Mon 19 Oct 2026, with a gap before.
  const log = [full(2026, 10, 12, 9), full(2026, 10, 13, 9), full(2026, 10, 14, 9),
    full(2026, 10, 16, 9), full(2026, 10, 17, 9), full(2026, 10, 18, 9), full(2026, 10, 19, 9)];
  assert.deepEqual(streak(log, new Date(2026, 9, 19, 20)), { current: 4, best: 4, today: true });
});

test('today without a session yet keeps the streak; a missed day ends it', () => {
  const log = [full(2026, 10, 17, 9), full(2026, 10, 18, 9)];
  assert.deepEqual(streak(log, new Date(2026, 9, 19, 8)), { current: 2, best: 2, today: false });
  assert.equal(streak(log, new Date(2026, 9, 20, 8)).current, 0);
  assert.equal(streak(log, new Date(2026, 9, 20, 8)).best, 2);
});

test('stopped sessions do not keep a streak going', () => {
  const log = [full(2026, 10, 17, 9), { start: at(2026, 10, 18, 9), end: at(2026, 10, 18, 9, 30), cat: 'geico', done: false }];
  assert.equal(streak(log, new Date(2026, 9, 18, 20)).current, 1);
  assert.equal(streak(log, new Date(2026, 9, 19, 8)).current, 0);
});

test('a streak runs through the end of daylight saving time (1 Nov 2026)', () => {
  const log = [full(2026, 10, 31, 9), full(2026, 11, 1, 9), full(2026, 11, 2, 9)];
  assert.deepEqual(streak(log, new Date(2026, 10, 2, 20)), { current: 3, best: 3, today: true });
  // and the spring change (8 Mar 2026)
  const spring = [full(2026, 3, 7, 9), full(2026, 3, 8, 9), full(2026, 3, 9, 9)];
  assert.equal(streak(spring, new Date(2026, 2, 9, 20)).current, 3);
});

test('the last days run oldest first and end today', () => {
  const days = lastDays([full(2026, 10, 19, 9, 'chores')], new Date(2026, 9, 19, 20), 7);
  assert.equal(days.length, 7);
  assert.equal(days[0].day.getDate(), 13);
  assert.equal(days[6].done, 1);
  assert.deepEqual(days[6].byCat, { chores: 45 });
});

test('the week grid ends this week and leaves the days to come empty', () => {
  // Mon 19 Oct 2026, weeks from Sunday
  const g = weekGrid([full(2026, 10, 19, 9), full(2026, 10, 19, 11), full(2026, 10, 5, 9)], new Date(2026, 9, 19, 20), 12, 0);
  assert.equal(g.cols.length, 12);
  assert.equal(g.first.getDay(), 0);
  const last = g.cols[11];
  assert.deepEqual(last, [0, 2, null, null, null, null, null]);
  assert.equal(g.cols[9][1], 1); // Mon 5 Oct
});

test('category totals cover the last n days, biggest first', () => {
  const log = [full(2026, 10, 19, 9, 'geico'), full(2026, 10, 18, 9, 'chores'), full(2026, 10, 18, 11, 'chores'), full(2026, 10, 1, 9, 'geico')];
  assert.deepEqual(categoryTotals(log, new Date(2026, 9, 19, 20), 7), [{ cat: 'chores', minutes: 90 }, { cat: 'geico', minutes: 45 }]);
});

test('the log survives packing; unreadable or newer data is refused', () => {
  const data = { saved: 5, state: IDLE, cat: 'geico', log: [full(2026, 10, 19, 9), { start: at(2026, 10, 19, 14), end: at(2026, 10, 19, 14, 20), cat: 'chores', done: false }] };
  assert.deepEqual(unpack(pack(data)), data);
  assert.equal(unpack('not json'), null);
  assert.equal(unpack('{"v":2,"log":[]}'), null);
  assert.equal(newer(unpack(pack(data)), null).saved, 5);
  assert.equal(newer({ saved: 5 }, { saved: 9 }).saved, 9);
});

test('hours read naturally', () => {
  assert.equal(hoursText(45), '45 m');
  assert.equal(hoursText(90), '1 h 30 m');
  assert.equal(hoursText(120), '2 h');
  assert.equal(hoursText(725), '12 h');
});
