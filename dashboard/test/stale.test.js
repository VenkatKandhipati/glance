import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageText, save, load, reviveEvents, WEATHER_STALE_MS, CALENDAR_STALE_MS } from '../src/stale.js';

const MIN = 60000, H = 3600e3;
const now = Date.UTC(2026, 9, 21, 12);

// A stand-in for localStorage; `full` makes setItem throw like a full quota.
function store(full) {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { if (full) throw new Error('QuotaExceededError'); data[k] = String(v); },
    raw: data,
  };
}

test('no badge while data is fresh or missing', () => {
  assert.equal(ageText(0, now, WEATHER_STALE_MS), null);
  assert.equal(ageText(now - 30 * MIN, now, WEATHER_STALE_MS), null);
  assert.equal(ageText(now - 45 * MIN, now, WEATHER_STALE_MS), null);
  assert.equal(ageText(now - 20 * MIN, now, CALENDAR_STALE_MS), null);
});

test('age in minutes, hours, then days', () => {
  assert.equal(ageText(now - 46 * MIN, now, WEATHER_STALE_MS), '46 min old');
  assert.equal(ageText(now - 26 * MIN, now, CALENDAR_STALE_MS), '26 min old');
  assert.equal(ageText(now - 59 * MIN, now, CALENDAR_STALE_MS), '59 min old');
  assert.equal(ageText(now - 60 * MIN, now, CALENDAR_STALE_MS), '1 h old');
  assert.equal(ageText(now - 3.2 * H, now, CALENDAR_STALE_MS), '3 h old');
  assert.equal(ageText(now - 47 * H, now, CALENDAR_STALE_MS), '47 h old');
  assert.equal(ageText(now - 72 * H, now, CALENDAR_STALE_MS), '3 days old');
});

test('a clock behind the data (before network time) shows no badge', () => {
  assert.equal(ageText(now, now - 365 * 24 * H, WEATHER_STALE_MS), null);
});

test('save and load round-trip, with the time it arrived', () => {
  const s = store();
  save('k', { a: 1 }, now - H, s);
  assert.deepEqual(load('k', now, 7 * 24 * H, s), { at: now - H, data: { a: 1 } });
});

test('load: nothing, unreadable, or too old gives null', () => {
  const s = store();
  assert.equal(load('k', now, H, s), null);
  s.raw.k = '{not json';
  assert.equal(load('k', now, H, s), null);
  s.raw.k = JSON.stringify({ data: { a: 1 } });
  assert.equal(load('k', now, H, s), null);
  save('k', { a: 1 }, now - 2 * H, s);
  assert.equal(load('k', now, H, s), null);
});

test('storage that throws is ignored', () => {
  assert.doesNotThrow(() => save('k', { a: 1 }, now, store(true)));
  const broken = { getItem: () => { throw new Error('SecurityError'); } };
  assert.equal(load('k', now, H, broken), null);
});

test('saved calendar events get their dates back', () => {
  const ev = { title: 'Dentist', start: new Date(now), end: new Date(now + H), allDay: false, calId: 'personal' };
  const [back] = reviveEvents(JSON.parse(JSON.stringify([ev])));
  assert.ok(back.start instanceof Date && back.end instanceof Date);
  assert.equal(+back.start, now);
  assert.equal(+back.end, now + H);
  assert.equal(back.title, 'Dentist');
});
