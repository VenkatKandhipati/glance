// Tap feedback: the frame reads taps low (docs/frame.md), so whatever a touch lands on lights up
// the moment the finger is down, and a tap that hit nothing shows nothing. One overlay above
// everything is moved over the target, held a moment and faded: only its opacity animates, and
// the targets themselves are never restyled.
//
// Targets: every button, the Home tiles (`data-tap`), the month grid's day the tap is taken by
// (the same cell as `dayAtGrid`), the Time screen's day columns and today's timeline. On the night
// clock the flash is in its red; the screen-off dark, the scrim and the sheet's backdrop have none.
import { cellAtGrid } from './tiles/calendar.js';

const TARGET = 'button:not(:disabled), [data-tap], [data-day], .pm-today[data-open], .pm-tl';
const HOLD_MS = 80;  // shown at least this long, so a quick tap is seen on a 47 Hz panel
const MOVE_PX = 10;  // further than this and it's a swipe: let go at once

function targetOf(e) {
  const t = e.target;
  if (!t.closest || t.closest('.night.is-off')) return null;
  const grid = t.closest('.cal-grid');
  if (grid) {
    const box = grid.getBoundingClientRect();
    const i = cellAtGrid(new Date(), box.width, e.clientX - box.left, e.clientY - box.top);
    return i >= 0 ? grid.children[i] || null : null;
  }
  return t.closest(TARGET);
}

export function mountTap(el) {
  let downAt = 0, from = null, timer = 0;

  function release() {
    if (!from) return;
    from = null;
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('is-on'), Math.max(0, HOLD_MS - (Date.now() - downAt)));
  }

  document.addEventListener('pointerdown', (e) => {
    const t = targetOf(e);
    if (!t) return;
    const r = t.getBoundingClientRect();
    clearTimeout(timer);
    el.style.width = r.width + 'px';
    el.style.height = r.height + 'px';
    el.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px)';
    el.style.borderRadius = getComputedStyle(t).borderRadius;
    el.classList.toggle('is-night', !!t.closest('.night'));
    el.classList.add('is-on');
    downAt = Date.now();
    from = { x: e.clientX, y: e.clientY };
  }, { capture: true, passive: true });
  document.addEventListener('pointermove', (e) => {
    if (from && Math.abs(e.clientX - from.x) + Math.abs(e.clientY - from.y) > MOVE_PX) release();
  }, { passive: true });
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
}
