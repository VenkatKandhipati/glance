import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventsOn, rangeText, colorClass } from '../src/agenda.js';

const d = (day, h, m) => new Date(2026, 9, day, h || 0, m || 0);
const ev = (title, start, end, more) => Object.assign({ title, start, end, allDay: false, calId: 'personal' }, more);

test('a day\'s events: all-day first, things spilling over midnight, marked dates', () => {
  const events = [
    ev('Dinner', d(20, 19), d(20, 21)),
    ev('Trip', d(18), d(23), { allDay: true }),
    ev('Late show', d(19, 22), d(20, 1)),
    ev('Breakfast', d(20, 8), d(20, 9)),
    ev('Tomorrow', d(21, 8), d(21, 9)),
    ev('Reminder', d(20, 12), d(20, 12)),
  ];
  const list = eventsOn(events, [{ date: '10-20', title: 'Anniversary' }], d(20));
  assert.deepEqual(list.map((e) => e.title), ['Trip', 'Anniversary', 'Late show', 'Breakfast', 'Reminder', 'Dinner']);
  assert.deepEqual(list.map((e) => rangeText(e, d(20))),
    ['All day · 3 of 5', 'All day', 'Until 1 am', '8 am – 9 am', '12 pm', '7 pm – 9 pm']);
});

test('colours follow the calendar order in content.js; quiet calendars are muted', () => {
  assert.equal(colorClass({ calId: 'personal' }), 'ev-c0');
  assert.equal(colorClass({ calId: 'friend' }), 'ev-c1');
  assert.equal(colorClass({ calId: 'duckville', quiet: true }), 'ev-quiet');
  assert.equal(colorClass({ calId: '' }), 'ev-c0');
});
