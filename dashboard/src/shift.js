// Burn-in protection for Home: every few minutes the board steps to the next point of a 3 × 3 grid
// of offsets around where it belongs, so no edge or label sits on the same pixels all day. Taken
// from the clock, so a reload lands on the same step; over a full cycle it averages to zero.
const STEPS = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

// cfg: { px, minutes } from content.js; px 0 turns it off. Returns the offset in px.
export function shiftAt(now, cfg) {
  if (!cfg || !cfg.px || !cfg.minutes) return { x: 0, y: 0 };
  const step = STEPS[Math.floor(now.getTime() / (cfg.minutes * 60000)) % STEPS.length];
  return { x: step[0] * cfg.px, y: step[1] * cfg.px };
}

// Moves el to now's offset; only touches the style when the step changed.
export function applyShift(el, now, cfg) {
  const s = shiftAt(now, cfg);
  const t = s.x || s.y ? 'translate(' + s.x + 'px,' + s.y + 'px)' : '';
  if (el.__shift !== t) el.style.transform = el.__shift = t;
}
