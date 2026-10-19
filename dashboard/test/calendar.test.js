import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datesIn, nextMarked, countdown, nextUp, quietLine, markedDays, whenText, timeText } from '../src/tiles/calendar.js';

const list = [
  { date: '01-01', title: "New Year's Day" },
  { date: '10-26', title: 'Birthday' },
  { date: '2026-11-08', title: 'Diwali' },
];

test('yearly dates land in any year; one-off dates only in theirs', () => {
  assert.deepEqual(datesIn(list, 2026).map((d) => d.title), ["New Year's Day", 'Birthday', 'Diwali']);
  assert.deepEqual(datesIn(list, 2027).map((d) => d.title), ["New Year's Day", 'Birthday']);
});

test('next marked date is today when today is marked', () => {
  const next = nextMarked(list, new Date(2026, 9, 26));
  assert.equal(next.title, 'Birthday');
});

test('next marked date skips past dates', () => {
  assert.equal(nextMarked(list, new Date(2026, 9, 27)).title, 'Diwali');
});

test('yearly dates roll over into next year', () => {
  const next = nextMarked(list, new Date(2026, 11, 31));
  assert.equal(next.title, "New Year's Day");
  assert.equal(next.day.getFullYear(), 2027);
});

test('nothing upcoming returns null', () => {
  assert.equal(nextMarked([{ date: '2020-01-01', title: 'Past' }], new Date(2026, 0, 1)), null);
});

test('countdown wording', () => {
  assert.equal(countdown(0), 'Today');
  assert.equal(countdown(1), 'Tomorrow');
  assert.equal(countdown(6), 'in 6 days');
  assert.equal(countdown(21), 'in 3 weeks');
  assert.equal(countdown(90), 'in 3 months');
});

// Calendar events as calendars.js reports them.
const at = (d, h, m) => new Date(2026, 9, d, h || 0, m || 0);
const timed = (title, d, h, m, mins, quiet) => ({ title, start: at(d, h, m), end: new Date(+at(d, h, m) + mins * 60000), allDay: false, quiet: !!quiet, calendar: quiet ? 'Duckville' : 'personal' });
const allDay = (title, d, days, quiet) => ({ title, start: at(d), end: at(d + days), allDay: true, quiet: !!quiet, calendar: quiet ? 'Duckville' : 'personal' });
const now = at(16, 13, 0); // Fri 16 Oct, 1 pm

test('times read naturally', () => {
  assert.equal(timeText(at(16, 15, 30)), '3:30 pm');
  assert.equal(timeText(at(16, 19)), '7 pm');
  assert.equal(timeText(at(16, 0, 5)), '12:05 am');
});

test('next up is the soonest event that has not finished, ahead of marked dates', () => {
  const events = [timed('Lunch', 16, 12, 0, 30), timed('Dentist', 20, 15, 30, 60), allDay('Trip', 15, 4)];
  const next = nextUp(list, events, now);
  assert.equal(next.title, 'Dentist'); // lunch is over; the trip began before today
  assert.equal(whenText(next, now), 'Tue 20 Oct · 3:30 pm');
});

test('an event under way says so; one later today says when', () => {
  assert.equal(whenText(timed('Call', 16, 12, 30, 60), now), 'Now · until 1:30 pm');
  assert.equal(whenText(timed('Gym', 16, 18, 0, 60), now), 'Today · 6 pm');
  assert.equal(whenText(timed('Gym', 17, 7, 0, 60), now), 'Tomorrow · 7 am');
  assert.equal(whenText(allDay('Holiday', 23, 1), now), 'Fri 23 Oct · in 7 days');
});

test('a marked date wins when it comes first', () => {
  assert.equal(nextUp(list, [timed('Dentist', 30, 9, 0, 30)], now).title, 'Birthday'); // 26 Oct
});

test('quiet calendars never take next up or add dots', () => {
  const events = [allDay('Lake week', 17, 7, true), timed('Dentist', 20, 15, 30, 60)];
  assert.equal(nextUp([], events, now).title, 'Dentist');
  const dots = markedDays([], events, 2026);
  assert.equal(dots['2026-10-18'], undefined);
  assert.equal(dots['2026-10-20'], true);
});

test('a quiet calendar gets one line for what starts today or tomorrow', () => {
  const events = [allDay('Ongoing', 10, 14, true), allDay('Lake week', 17, 7, true), allDay('Movie', 17, 1, true), allDay('Later', 19, 1, true)];
  assert.deepEqual(quietLine(events, now), { calendar: 'Duckville', when: 'Tomorrow', title: 'Lake week', more: 1 });
  assert.equal(quietLine([allDay('Ongoing', 10, 14, true)], now), null);
});

test('multi-day events mark every day they cover', () => {
  const dots = markedDays([], [allDay('Trip', 22, 3)], 2026);
  assert.deepEqual(['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'].map((k) => !!dots[k]), [false, true, true, true, false]);
});

test('night: red clock in the evening, screen off after midnight until morning', async () => {
  const { nightMode } = await import('../src/night.js');
  const cfg = { clock: 22, off: 0, on: 8 };
  const at = (h) => new Date(2026, 9, 19, h, 30);
  assert.deepEqual([21, 22, 23, 0, 3, 7, 8, 12].map((h) => nightMode(at(h), cfg)),
    [null, 'clock', 'clock', 'off', 'off', 'off', null, null]);
  // An evening-only clock that runs past midnight still works when `off` is later.
  assert.equal(nightMode(at(1), { clock: 22, off: 2, on: 8 }), 'clock');
});

test('a tap on the month grid finds its day (Sunday-first October 2026, 7 columns of 40 px)', async () => {
  const { dayAtGrid } = await import('../src/tiles/calendar.js');
  const now = new Date(2026, 9, 19, 12);
  const key = (d) => d && d.getMonth() + 1 + '-' + d.getDate();
  assert.equal(dayAtGrid(now, 280, 10, 10), null);          // weekday names
  assert.equal(key(dayAtGrid(now, 280, 10, 40)), '9-27');    // first row, Sunday
  assert.equal(key(dayAtGrid(now, 280, 45, 31 * 4 + 5)), '10-19');
  assert.equal(key(dayAtGrid(now, 280, 275, 31 * 5 + 30)), '10-31');
  assert.equal(dayAtGrid(now, 280, 10, 31 * 6 + 5), null);   // below the last week
});
