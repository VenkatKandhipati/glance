import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPicker } from '../src/tiles/photo-picker.js';

const urls = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

test('online: walks through every photo in order, then wraps', () => {
  const p = createPicker(urls.slice(0, 3));
  const shown = [];
  for (let i = 0; i < 4; i++) { const u = p.pick(shown[shown.length - 1]); p.loaded(u); shown.push(u); }
  assert.deepEqual(shown, ['a', 'b', 'c', 'a']);
});

test('offline: reuses photos already loaded and never repeats the one on screen', () => {
  const p = createPicker(urls);
  ['a', 'b', 'c'].forEach((u) => { p.pick(); p.loaded(u); });
  p.pick(); p.failed(); // 'd' fails: the server is asleep
  assert.equal(p.offline, true);
  const picks = [];
  let current = 'c';
  for (let i = 0; i < 6; i++) {
    const u = p.pick(current);
    picks.push(u);
    if (['a', 'b', 'c'].includes(u)) { p.loaded(u); current = u; } else p.failed();
  }
  picks.forEach((u, i) => assert.notEqual(u, i === 0 ? 'c' : picks[i - 1]));
  // Mostly cached photos, with a periodic probe for a new one.
  const probes = picks.filter((u) => !['a', 'b', 'c'].includes(u));
  assert.ok(probes.length >= 1 && probes.length <= 2, 'probes: ' + probes.join(','));
});

test('a cached photo loading does not count as the server being back', () => {
  const p = createPicker(urls);
  ['a', 'b'].forEach((u) => { p.pick(); p.loaded(u); });
  p.pick(); p.failed();
  p.loaded('a');
  assert.equal(p.offline, true);
});

test('a new photo loading means the server is back', () => {
  const p = createPicker(urls);
  ['a', 'b'].forEach((u) => { p.pick(); p.loaded(u); });
  p.pick(); p.failed();
  p.loaded('z');
  assert.equal(p.offline, false);
});

test('offline with only one photo cached keeps trying new ones', () => {
  const p = createPicker(urls);
  p.pick(); p.loaded('a');
  p.pick(); p.failed();
  assert.equal(p.pick('a'), 'c');
});
