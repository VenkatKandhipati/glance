// Metro banner markup from /api/trains data. Kept free of the DOM so it can be unit tested.
import { esc } from '../time.js';

export const STALE_MS = 3 * 60000; // older than this, the times are no longer worth trusting
const NEXT = 2;                     // smaller entries after the first train in each direction

function bullet(line, big) {
  return '<span class="line line-' + esc(line) + (big ? '' : ' is-small') + '">' + (big ? esc(line) : '') + '</span>';
}

export function minLabel(min) {
  if (min < 0) return '<b class="train-now">Boarding</b>';
  if (min === 0) return '<b class="train-now">Arriving</b>';
  return '<span class="train-min serif">' + min + '<i>min</i></span>';
}

function direction(dir, trains) {
  const list = trains.filter((t) => t.group === dir.group);
  let body;
  if (!list.length) {
    body = '<span class="train-empty">No trains listed</span>';
  } else {
    const first = list[0];
    body =
      '<span class="train-main">' + bullet(first.line, true) +
      '<span class="train-dest">' + esc(first.dest) + '</span>' + minLabel(first.min) + '</span>' +
      list.slice(1, 1 + NEXT).map((t) =>
        '<span class="train-next">' + bullet(t.line, false) + (t.min <= 0 ? 'now' : t.min) + '</span>').join('');
  }
  return '<div class="trains-dir"><div class="trains-label">' + esc(dir.label) + '</div>' +
    '<div class="trains-row">' + body + '</div></div>';
}

// state: { data, lastOk } where lastOk is when data arrived (ms, frame clock); data may be null.
export function trainsHtml(cfg, state, now) {
  const age = state.lastOk ? now - state.lastOk : Infinity;
  let sub;
  if (!state.data) sub = 'Checking…';
  else if (age > STALE_MS) sub = 'Times from ' + Math.round(age / 60000) + ' min ago';
  else sub = 'Next trains';
  const dirs = state.data && age <= STALE_MS
    ? cfg.directions.map((d) => direction(d, state.data.trains)).join('')
    : '<div class="trains-off">' + (state.data ? 'Live times unavailable' : '') + '</div>';
  return '<div class="trains-title"><b>' + esc(cfg.name) + ',</b><span' + (age > STALE_MS && state.data ? ' class="is-stale"' : '') +
    '>' + sub + '</span></div><div class="trains-dirs">' + dirs + '</div>';
}
