import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nightMode, nightWant, choose } from '../src/night.js';

const cfg = { clock: 22, off: 0, on: 8, idleSeconds: 120 };
const at = (d, h, m = 0) => new Date(2026, 9, d, h, m);

test('night by the hour: clock from 10 p.m., off from midnight to 8 a.m.', () => {
  assert.equal(nightMode(at(14, 21, 59), cfg), null);
  assert.equal(nightMode(at(14, 22), cfg), 'clock');
  assert.equal(nightMode(at(15, 0), cfg), 'off');
  assert.equal(nightMode(at(15, 7, 59), cfg), 'off');
  assert.equal(nightMode(at(15, 8), cfg), null);
});

test('"Still working" keeps the clock away until midnight, then the screen goes off as usual', () => {
  const c = choose('awake', at(14, 22, 30), cfg);
  assert.equal(c.until, +at(15, 0));
  assert.equal(nightWant(at(14, 23, 59), cfg, c), null);
  assert.equal(nightWant(at(15, 0), cfg, c), 'off');
  assert.equal(nightWant(at(15, 22), cfg, c), 'clock'); // the next evening as usual
});

test('"Going to sleep" means dark until 8 a.m., even before midnight', () => {
  const c = choose('sleep', at(14, 22, 30), cfg);
  assert.equal(c.until, +at(15, 8));
  assert.equal(nightWant(at(14, 22, 31), cfg, c), 'off');
  assert.equal(nightWant(at(15, 3), cfg, c), 'off');
  assert.equal(nightWant(at(15, 8), cfg, c), null);
  assert.equal(nightWant(at(15, 22), cfg, c), 'clock');
});

test('a choice made after midnight lasts until that morning, not the next', () => {
  assert.equal(choose('sleep', at(15, 1), cfg).until, +at(15, 8));
  assert.equal(choose('awake', at(14, 21), cfg).until, +at(15, 0));
});

test('no choice: night by the hour', () => {
  assert.equal(nightWant(at(14, 22), cfg, null), 'clock');
});
