import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharpness, colours, shownSize, qualityProblem, fitsStyle } from '../src/picture-score.js';

// A w × h RGBA picture from f(x, y) → [r, g, b].
function picture(w, h, f) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = f(x, y), i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  return d;
}
// Stripes with hard edges, and the same stripes with edges blurred over 5 px (what a soft scan
// looks like once shown big).
const stripes = (x) => ((x % 32) < 16 ? 40 : 210);
const sharpPic = picture(200, 200, (x) => { const v = stripes(x + 64); return [v, v, v]; });
const softPic = picture(200, 200, (x) => {
  let v = 0;
  for (let k = -2; k <= 2; k++) v += stripes(x + k + 64);
  return [v / 5, v / 5, v / 5];
});

test('sharpness: hard edges score high, blurred edges low, flat scores 0', () => {
  assert.ok(sharpness(sharpPic, 200, 200) > 0.45, 'sharp ' + sharpness(sharpPic, 200, 200));
  assert.ok(sharpness(softPic, 200, 200) < 0.3, 'soft ' + sharpness(softPic, 200, 200));
  assert.equal(sharpness(picture(50, 50, () => [90, 90, 90]), 50, 50), 0);
});

test('colours: navy night sky is dark and cool; a manuscript page is bright and warm', () => {
  const navy = colours(picture(20, 20, () => [18, 28, 60]), 20, 20);
  assert.ok(navy.luma < 0.15 && navy.cool === 1 && navy.warm === 0);
  assert.deepEqual(['any', 'dark', 'blue'].map((st) => fitsStyle(navy, st)), [true, true, true]);
  const page = colours(picture(20, 20, (x) => (x < 4 ? [200, 60, 40] : [245, 235, 210])), 20, 20);
  assert.ok(page.bright > 0.7 && page.warm >= 0.2);
  assert.deepEqual(['any', 'dark', 'blue'].map((st) => fitsStyle(page, st)), [true, false, false]);
  // Ama Dablam by day: dark rock, bright sky; not dark enough.
  assert.equal(fitsStyle({ luma: 0.43, bright: 0.01, cool: 0.3, warm: 0.2 }, 'dark'), false);
});

test('size: shown whole and never enlarged, or filling the tile', () => {
  assert.deepEqual(shownSize(843, 1203, 'contain'), { w: 442, h: 631, scale: 631 / 1203 });
  assert.deepEqual(shownSize(400, 300, 'contain'), { w: 400, h: 300, scale: 1 });
  assert.deepEqual(shownSize(1280, 851, 'cover'), { w: 949, h: 631, scale: 631 / 851 });
});

test('quality problems', () => {
  assert.equal(qualityProblem({ w: 843, h: 1203 }, 'contain', 0.7), null);
  assert.equal(qualityProblem({ w: 600, h: 355 }, 'contain', 0.8), 'too small');
  assert.equal(qualityProblem({ w: 843, h: 2402 }, 'contain', 0.8), 'too thin');
  assert.equal(qualityProblem({ w: 600, h: 553 }, 'contain', 0.40), 'soft');
  assert.equal(qualityProblem({ w: 1280, h: 282 }, 'cover', 0.9), 'too small');
  assert.equal(qualityProblem({ w: 1280, h: 853 }, 'cover', 0.9), null);
});
