import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockParts, greeting, dayKey, daysBetween, clockIsSane, esc } from '../src/time.js';

const at = (h, m) => new Date(2026, 9, 14, h, m);

test('12-hour clock with am/pm', () => {
  assert.deepEqual(clockParts(at(0, 5)), { time: '12:05', ampm: 'am' });
  assert.deepEqual(clockParts(at(12, 0)), { time: '12:00', ampm: 'pm' });
  assert.deepEqual(clockParts(at(14, 55)), { time: '2:55', ampm: 'pm' });
});

test('greeting follows the time of day', () => {
  assert.equal(greeting(at(4, 59)), 'Good night.');
  assert.equal(greeting(at(5, 0)), 'Good morning.');
  assert.equal(greeting(at(12, 0)), 'Good afternoon.');
  assert.equal(greeting(at(17, 0)), 'Good evening.');
  assert.equal(greeting(at(21, 0)), 'Good night.');
});

test('day keys are local and zero-padded', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('days between ignores the time of day', () => {
  assert.equal(daysBetween(at(23, 59), new Date(2026, 9, 15, 0, 1)), 1);
  assert.equal(daysBetween(at(9, 0), new Date(2026, 9, 20)), 6);
});

test('a 1970 clock (no network time yet) is not trusted', () => {
  assert.equal(clockIsSane(new Date(0)), false);
  assert.equal(clockIsSane(at(9, 0)), true);
});

test('escapes HTML', () => {
  assert.equal(esc('<b>"Tom & Jerry"</b>'), '&lt;b&gt;&quot;Tom &amp; Jerry&quot;&lt;/b&gt;');
});
