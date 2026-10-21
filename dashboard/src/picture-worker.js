// Measures one picture off the page's main thread (picture-check.js sends it here): decoding a
// 1,280 px JPEG and reading its pixels took 130–770 ms on the frame, enough to stall the clock,
// photo fades and taps. Gets { id, blob, fit, style }, answers { id, ok, why }.
import { TILE, shownSize, sharpness, colours, qualityProblem, fitsStyle } from './picture-score.js';

const SAMPLE = 320; // px square measured for sharpness, from the middle of the picture as shown

// The middle of the picture as shown (SAMPLE px at its shown scale), or, for `whole`, the part
// inside the tile scaled to `side` px wide, as RGBA.
function pixels(bmp, shown, side, whole) {
  const s = shown.scale;
  const vw = Math.min(shown.w, TILE.w) / s, vh = Math.min(shown.h, TILE.h) / s;
  const sw = whole ? vw : Math.min(vw, side / s), sh = whole ? vh : Math.min(vh, side / s);
  const w = whole ? side : Math.max(1, Math.round(sw * s));
  const h = whole ? Math.max(1, Math.round(side * sh / sw)) : Math.max(1, Math.round(sh * s));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h };
}

self.onmessage = (e) => {
  const { id, blob, fit, style } = e.data;
  createImageBitmap(blob).then((bmp) => {
    const natural = { w: bmp.width, h: bmp.height };
    const shown = shownSize(natural.w, natural.h, fit);
    let why = qualityProblem(natural, fit, 1);
    if (!why) {
      const sample = pixels(bmp, shown, SAMPLE, false);
      why = qualityProblem(natural, fit, sharpness(sample.data, sample.w, sample.h));
    }
    if (!why) {
      const small = pixels(bmp, shown, 64, true);
      if (!fitsStyle(colours(small.data, small.w, small.h), style)) why = 'style';
    }
    bmp.close();
    self.postMessage({ id, ok: !why, why });
  }, (err) => self.postMessage({ id, ok: false, why: String(err), retry: true }));
};
