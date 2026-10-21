// Run with the frame's zone so local dates are deterministic (package.json sets TZ).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIcs, occurrences, toDate } from '../src/ics.js';

const cal = (...events) => 'BEGIN:VCALENDAR\r\n' + events.map((e) => 'BEGIN:VEVENT\r\n' + e.join('\r\n') + '\r\nEND:VEVENT\r\n').join('') + 'END:VCALENDAR\r\n';
const between = (text, from, to) => occurrences(parseIcs(text), new Date(from), new Date(to));
const days = (list) => list.map((o) => o.start.getFullYear() + '-' + (o.start.getMonth() + 1) + '-' + o.start.getDate());
const hhmm = (d) => d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');

test('runs in New York time', () => {
  assert.equal(new Date(2026, 6, 1).getTimezoneOffset(), 240);
});

test('one-off timed event in UTC and folded long summary', () => {
  const o = between(cal(['UID:a', 'SUMMARY:Dentist with a very long name that Google folds onto', '  a second line', 'DTSTART:20261020T193000Z', 'DTEND:20261020T203000Z']),
    '2026-10-01', '2026-11-01');
  assert.equal(o.length, 1);
  assert.equal(o[0].title, 'Dentist with a very long name that Google folds onto a second line');
  assert.equal(hhmm(o[0].start), '15:30');
  assert.equal(o[0].allDay, false);
});

test('TZID times convert across DST', () => {
  // 9:00 in Los Angeles is 12:00 in New York both in summer and in winter.
  const o = between(cal(['UID:b', 'SUMMARY:Standup', 'RRULE:FREQ=WEEKLY;BYDAY=MO', 'DTSTART;TZID=America/Los_Angeles:20261026T090000', 'DTEND;TZID=America/Los_Angeles:20261026T091500']),
    '2026-10-25', '2026-11-10');
  assert.deepEqual(days(o), ['2026-10-26', '2026-11-2', '2026-11-9']);
  o.forEach((x) => assert.equal(hhmm(x.start), '12:00'));
  assert.equal(o[1].end - o[1].start, 15 * 60000);
});

test('weekly on several days, with COUNT counted from the first date', () => {
  const o = between(cal(['UID:c', 'SUMMARY:Gym', 'RRULE:FREQ=WEEKLY;COUNT=5;BYDAY=TU,TH', 'DTSTART;TZID=America/New_York:20261006T070000']),
    '2026-10-12', '2026-12-31');
  assert.deepEqual(days(o), ['2026-10-13', '2026-10-15', '2026-10-20']); // 6th, 8th were the first two
});

test('UNTIL, every other week, and a skipped date', () => {
  const o = between(cal(['UID:d', 'SUMMARY:Class', 'RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261120T235959Z', 'EXDATE;TZID=America/New_York:20261023T180000', 'DTSTART;TZID=America/New_York:20261009T180000']),
    '2026-10-01', '2026-12-31');
  assert.deepEqual(days(o), ['2026-10-9', '2026-11-6', '2026-11-20']);
});

test('an edited occurrence replaces the original; a cancelled one disappears', () => {
  const o = between(cal(
    ['UID:e', 'SUMMARY:Call', 'RRULE:FREQ=DAILY', 'DTSTART:20261019T140000Z', 'DTEND:20261019T143000Z'],
    ['UID:e', 'SUMMARY:Call (moved)', 'RECURRENCE-ID:20261020T140000Z', 'DTSTART:20261020T200000Z', 'DTEND:20261020T203000Z'],
    ['UID:e', 'SUMMARY:Call', 'STATUS:CANCELLED', 'RECURRENCE-ID:20261021T140000Z', 'DTSTART:20261021T140000Z'],
  ), '2026-10-19', '2026-10-23');
  assert.deepEqual(o.map((x) => x.title + ' ' + days([x])[0] + ' ' + hhmm(x.start)),
    ['Call 2026-10-19 10:00', 'Call (moved) 2026-10-20 16:00', 'Call 2026-10-22 10:00']);
});

test('all-day multi-day events keep local midnights and overlap the window', () => {
  const o = between(cal(['UID:f', 'SUMMARY:Trip', 'DTSTART;VALUE=DATE:20261014', 'DTEND;VALUE=DATE:20261019']), '2026-10-16', '2026-10-17');
  assert.equal(o.length, 1);
  assert.equal(o[0].allDay, true);
  assert.equal(+o[0].start, +new Date(2026, 9, 14));
  assert.equal(+o[0].end, +new Date(2026, 9, 19));
});

test('yearly birthdays from years ago, and Feb 29 only in leap years', () => {
  const o = between(cal(
    ['UID:g', 'SUMMARY:Mom', 'RRULE:FREQ=YEARLY', 'DTSTART;VALUE=DATE:19650310', 'DTEND;VALUE=DATE:19650311'],
    ['UID:h', 'SUMMARY:Leap', 'RRULE:FREQ=YEARLY', 'DTSTART;VALUE=DATE:20240229'],
  ), '2026-01-01', '2028-12-31');
  assert.deepEqual(o.map((x) => x.title + ' ' + days([x])[0]), ['Mom 2026-3-10', 'Mom 2027-3-10', 'Leap 2028-2-29', 'Mom 2028-3-10']);
});

test('monthly on the second Monday and on the last Friday', () => {
  const o = between(cal(
    ['UID:i', 'SUMMARY:Book club', 'RRULE:FREQ=MONTHLY;BYDAY=2MO', 'DTSTART;TZID=America/New_York:20260914T190000'],
    ['UID:j', 'SUMMARY:Payday', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR', 'DTSTART;VALUE=DATE:20260925'],
  ), '2026-10-01', '2026-11-30');
  assert.deepEqual(o.map((x) => x.title + ' ' + days([x])[0]), ['Book club 2026-10-12', 'Payday 2026-10-30', 'Book club 2026-11-9', 'Payday 2026-11-27']);
});

test('unsupported rules show the first date only, and junk lines are ignored', () => {
  const o = between(cal(['UID:k', 'SUMMARY:Odd', 'RRULE:FREQ=MONTHLY;BYDAY=MO,TU;BYSETPOS=-1', 'DTSTART:20261005T150000Z', 'X-GARBAGE']), '2026-10-01', '2026-12-31');
  assert.deepEqual(days(o), ['2026-10-5']);
});

test('unknown time zones fall back to local time', () => {
  assert.equal(hhmm(toDate({ y: 2026, m: 10, d: 20, h: 9, mi: 0, s: 0, allDay: false, utc: false, tz: 'Mars/Olympus' })), '9:00');
});
