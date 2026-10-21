import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shiftAt, applyShift } from '../src/shift.js';

const cfg = { px: 6, minutes: 10 };
const STEP = 10 * 60000;
const at = (n) => new Date(n * STEP); // the start of step n

test('off when px or minutes is 0, or no setting', () => {
  assert.deepEqual(shiftAt(at(1), { px: 0, minutes: 10 }), { x: 0, y: 0 });
  assert.deepEqual(shiftAt(at(1), { px: 6, minutes: 0 }), { x: 0, y: 0 });
  assert.deepEqual(shiftAt(at(1), undefined), { x: 0, y: 0 });
});

test('stays put within a step and moves at the next', () => {
  assert.deepEqual(shiftAt(new Date(1 * STEP + STEP - 1), cfg), shiftAt(at(1), cfg));
  assert.notDeepEqual(shiftAt(at(2), cfg), shiftAt(at(1), cfg));
});

test('a full cycle visits nine places within px and averages to zero', () => {
  const seen = new Set();
  let sx = 0, sy = 0;
  for (let n = 0; n < 9; n++) {
    const s = shiftAt(at(n), cfg);
    assert.ok(Math.abs(s.x) <= 6 && Math.abs(s.y) <= 6);
    seen.add(s.x + ',' + s.y);
    sx += s.x; sy += s.y;
  }
  assert.equal(seen.size, 9);
  assert.equal(sx, 0);
  assert.equal(sy, 0);
  assert.deepEqual(shiftAt(at(9), cfg), shiftAt(at(0), cfg));
});

test('neighbouring steps are at most one grid step apart', () => {
  for (let n = 0; n < 9; n++) {
    const a = shiftAt(at(n), cfg), b = shiftAt(at(n + 1), cfg);
    assert.ok(Math.abs(a.x - b.x) <= 6 && Math.abs(a.y - b.y) <= 6, 'step ' + n);
  }
});

test('applyShift writes the style only when the step changes', () => {
  let writes = 0;
  const style = {};
  Object.defineProperty(style, 'transform', { set: (v) => { writes++; style.value = v; }, get: () => style.value });
  const el = { style };
  applyShift(el, at(1), cfg);
  assert.equal(style.value, 'translate(6px,0px)');
  applyShift(el, new Date(1 * STEP + 60000), cfg);
  assert.equal(writes, 1);
  applyShift(el, at(9), cfg); // back home: the transform is cleared
  assert.equal(style.value, '');
  assert.equal(writes, 2);
});
