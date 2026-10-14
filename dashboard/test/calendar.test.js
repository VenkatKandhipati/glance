import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datesIn, nextMarked, countdown } from '../src/tiles/calendar.js';

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
