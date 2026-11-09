// Metro banner markup from /api/trains data. Kept free of the DOM so it can be unit tested.
import { esc } from '../time.js';
import { troubleText } from './trains-data.js';
import { WARNING } from './clock.js';

export const STALE_MS = 3 * 60000; // older than this, the times are no longer worth trusting
export const TROUBLE_STALE_MS = 30 * 60000; // alerts older than this aren't shown on Home
const SHOW = 3;                     // times per direction

// One time: a dot in the line's colour, then minutes; arriving and boarding read "Now".
function time(t) {
  return '<span class="train"><span class="line line-' + esc(t.line) + '"></span>' +
    (t.min <= 0 ? '<i>Now</i>' : t.min) + '</span>';
}

function direction(dir, trains) {
  const list = trains.filter((t) => t.group === dir.group).slice(0, SHOW);
  return '<div class="trains-dir"><div class="trains-row"><span class="trains-label">' + esc(dir.label) + '</span>' +
    (list.length ? '<span class="trains-times">' + list.map(time).join('') + '</span>'
      : '<span class="trains-note">No trains</span>') + '</div></div>';
}

// state: { data, lastOk, incidents, incidentsAt } where lastOk and incidentsAt are when each
// arrived (ms, frame clock); data and incidents may be null. Trouble at the station (an alert on
// its lines, an elevator or escalator out) puts a red sign under its name; Transit has the rest.
export function trainsHtml(cfg, state, now) {
  const age = state.lastOk ? now - state.lastOk : Infinity;
  const fresh = state.data && age <= STALE_MS;
  // Just the station name while times are live; a quiet second line only when something's off.
  let sub = '';
  if (!state.data) sub = 'Checking…';
  else if (!fresh) sub = 'Times from ' + Math.round(age / 60000) + ' min ago';
  const trouble = state.incidents && now - state.incidentsAt <= TROUBLE_STALE_MS ? troubleText(state.incidents) : '';
  return '<div class="trains-title"><b>' + esc(cfg.name) + '</b>' + (sub ? '<span>' + sub + '</span>' : '') +
    (trouble ? '<em class="trains-trouble">' + WARNING + esc(trouble) + '</em>' : '') + '</div>' +
    (fresh ? cfg.directions.map((d) => direction(d, state.data.trains)).join('')
      : '<div class="trains-dir"><span class="trains-note">' + (state.data ? 'Live times unavailable' : '') + '</span></div>');
}
