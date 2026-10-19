// Measures a picture before the photo tile shows it: is it sharp at the size it will be shown, and
// how dark, how blue, how warm and how bright is it? Works on RGBA pixels (a canvas's getImageData,
// or sharp's raw output in the preview script), so it has no DOM and can be unit tested.

// Luma, 0–1, of pixel i.
const luma = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

function lumaPlane(rgba, w, h) {
  const out = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) out[p] = luma(rgba, p * 4);
  return out;
}

// Mean |Laplacian| of a luma plane, skipping a 1 px border.
function detail(y, w, h) {
  let sum = 0, n = 0;
  for (let r = 1; r < h - 1; r++) {
    for (let c = 1; c < w - 1; c++) {
      const p = r * w + c;
      sum += Math.abs(4 * y[p] - y[p - 1] - y[p + 1] - y[p - w] - y[p + w]);
      n++;
    }
  }
  return n ? sum / n : 0;
}

// Halves a luma plane by averaging 2 × 2 blocks.
function half(y, w, h) {
  const hw = w >> 1, hh = h >> 1, out = new Float32Array(hw * hh);
  for (let r = 0; r < hh; r++) {
    for (let c = 0; c < hw; c++) {
      const p = 2 * r * w + 2 * c;
      out[r * hw + c] = (y[p] + y[p + 1] + y[p + w] + y[p + w + 1]) / 4;
    }
  }
  return { y: out, w: hw, h: hh };
}

// Sharpness of pixels drawn at the size they'll be shown: fine detail compared with detail one
// octave coarser. A sharp photo or painting keeps roughly half its detail at the finest scale; one
// that was enlarged from a small scan (blur already in the file) keeps far less. Content-neutral,
// so a calm sky and a busy forest score alike when both are in focus.
export function sharpness(rgba, w, h) {
  const y = lumaPlane(rgba, w, h);
  const fine = detail(y, w, h);
  const coarse = half(y, w, h);
  const broad = detail(coarse.y, coarse.w, coarse.h);
  return broad > 0.004 ? fine / broad : 0; // a nearly flat picture has nothing to judge
}

// Colour make-up from (a small copy of) the picture, each 0–1:
//   luma    average brightness
//   bright  share of near-white pixels (paper, snow, haze)
//   cool    share of clearly blue or teal pixels
//   warm    share of clearly red, orange or yellow pixels
export function colours(rgba, w, h) {
  let l = 0, bright = 0, cool = 0, warm = 0;
  const n = w * h;
  for (let p = 0; p < n; p++) {
    const i = p * 4, r = rgba[i] / 255, g = rgba[i + 1] / 255, b = rgba[i + 2] / 255;
    const y = luma(rgba, i);
    l += y;
    if (y > 0.82) bright++;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max ? (max - min) / max : 0;
    if (sat < 0.2 || max < 0.12) continue;
    let hue;
    if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
    hue *= 60;
    if (hue >= 170 && hue <= 260) cool++;
    else if (hue < 65 || hue >= 330) warm++;
  }
  return { luma: l / n, bright: bright / n, cool: cool / n, warm: warm / n };
}

// The tile: 713 × 631 at DPR 1.
export const TILE = { w: 713, h: 631 };

// The size a picture is drawn at: `cover` fills the tile; `contain` (shown with scale-down) fits
// inside it and is never enlarged.
export function shownSize(w, h, fit) {
  const s = fit === 'cover' ? Math.max(TILE.w / w, TILE.h / h) : Math.min(1, TILE.w / w, TILE.h / h);
  return { w: Math.round(w * s), h: Math.round(h * s), scale: s };
}

// Quality, from the picture's own size and the sharpness of its pixels as shown:
//   too small  enlarged more than 1.25× to fill the tile (cover), or, shown whole (contain),
//              filling under 85% of both its height and width
//   too thin   shown whole but covering under 40% of the tile: a scroll or a frieze, drawn as a
//              sliver
//   soft       sharpness under SOFT: a scan that was already blurry (the Met's 12th-century
//              manuscript pages measured 0.39–0.43; sharp work measures 0.6–1.3)
export const SOFT = 0.45;
export function qualityProblem(natural, fit, sharp) {
  const shown = shownSize(natural.w, natural.h, fit);
  if (fit === 'cover' ? shown.scale > 1.25 : shown.w < TILE.w * 0.85 && shown.h < TILE.h * 0.85) return 'too small';
  if (fit !== 'cover' && shown.w * shown.h < TILE.w * TILE.h * 0.4) return 'too thin';
  if (sharp < SOFT) return 'soft';
  return null;
}

// Styles for content.js's `featured.style`:
//   any   every picture that passes the quality check
//   dark  mostly dark and almost no white, so it sits with the dashboard's deep navy: night skies,
//         forests, dark paintings. Daylight mountains (Ama Dablam, 0.43) and manuscript pages on
//         cream paper miss it. About one good picture in five.
//   blue  dark, and more blue or teal than red or gold
// RULES goes up whenever these or the quality limits change, so remembered verdicts are redone.
export const RULES = 2;
export function fitsStyle(c, style) {
  const dark = c.luma < 0.38 && c.bright < 0.08;
  if (style === 'dark') return dark;
  if (style === 'blue') return c.luma < 0.5 && c.bright < 0.15 && c.cool >= 0.25 && c.cool > c.warm;
  return true;
}
