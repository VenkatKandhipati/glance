// Transit screen: the station's full board (destination, cars, minutes) in both directions, then
// WMATA's alerts for the station's lines and its elevator and escalator outages. Trains come from
// the Metro banner's polling; alerts are fetched every 2 minutes while the screen is up.
import { metro } from '../content.js';
import { normalizeIncidents } from '../tiles/trains-data.js';
import { STALE_MS } from '../tiles/trains-view.js';
import { esc } from '../time.js';
import { DEMO, demoIncidents } from '../demo.js';

const ROWS = 4; // WMATA predicts about three trains per platform
const INCIDENTS_MS = 2 * 60000;
const LINE_NAMES = { RD: 'Red', OR: 'Orange', SV: 'Silver', BL: 'Blue', YL: 'Yellow', GR: 'Green' };

function wmata(path) {
  return fetch('https://api.wmata.com/Incidents.svc/json/' + path, { cache: 'no-store', headers: { api_key: __WMATA_KEY__ } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('WMATA answered ' + r.status))));
}

function requestIncidents() {
  if (DEMO) return Promise.resolve(demoIncidents);
  if (__FRAME__) {
    return Promise.all([wmata('Incidents'), wmata('ElevatorIncidents?StationCode=' + encodeURIComponent(metro.station))])
      .then(([rail, lifts]) => normalizeIncidents(rail, lifts, metro.lines));
  }
  return fetch('/api/incidents?station=' + encodeURIComponent(metro.station) + '&lines=' + metro.lines.join(','), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('incidents ' + r.status))));
}

function board(dir, trains) {
  const list = trains.filter((t) => t.group === dir.group).slice(0, ROWS);
  const rows = list.length ? list.map((t, i) =>
    '<li class="tr-row' + (i === 0 ? ' is-next' : '') + '"><span class="line line-' + esc(t.line) + '"></span>' +
    '<span class="tr-dest">' + esc(t.dest) + (t.cars ? '<small>' + t.cars + ' cars</small>' : '') + '</span>' +
    '<span class="tr-min">' + (t.min <= 0 ? '<i>' + (t.min < 0 ? 'Boarding' : 'Arriving') + '</i>' : t.min + '<small>min</small>') + '</span></li>').join('')
    : '<li class="tr-empty">No trains</li>';
  return '<section class="tr-board tile"><h2>' + esc(dir.label) + '</h2><ul>' + rows + '</ul></section>';
}

function service(inc) {
  const lines = metro.lines.map((l) => LINE_NAMES[l] || l).join(' and ');
  if (!inc) return '<p class="tr-quiet">Checking service…</p>';
  const alerts = inc.alerts.length ? inc.alerts.map((a) =>
    '<li class="tr-alert"><b>' + esc(a.type) + '</b>' + esc(a.text) + '</li>').join('')
    : '<li class="tr-ok">No alerts on the ' + lines + ' lines.</li>';
  const outages = inc.outages.length ? inc.outages.map((o) =>
    '<li class="tr-alert"><b>' + o.unit + ' out</b>' + esc(o.where) + '</li>').join('')
    : '<li class="tr-ok">Elevators and escalators working.</li>';
  return '<ul class="tr-service">' + alerts + outages + '</ul>';
}

export function mountTransit(el) {
  let trains = null, incidents = null, timer = null, html = '';

  function render() {
    const fresh = trains && trains.data && Date.now() - trains.lastOk <= STALE_MS;
    const lines = metro.lines.map((l) => '<span class="line line-' + l + '"></span>').join('');
    const next = '<header class="screen-head"><h1 class="serif">' + esc(metro.name) + '<i>,</i></h1><span>' + lines + '</span></header>' +
      '<div class="tr-boards">' + (fresh ? metro.directions.map((d) => board(d, trains.data.trains)).join('')
        : '<section class="tr-board tile"><p class="tr-quiet">' + (trains && trains.data ? 'Live times unavailable' : 'Checking…') + '</p></section>') + '</div>' +
      '<section class="tr-status tile"><h2>Service</h2>' + service(incidents) + '</section>';
    if (next !== html) el.innerHTML = html = next;
  }

  function poll() {
    requestIncidents().then((inc) => { incidents = inc; render(); }, () => {});
  }

  return {
    trains(state) { trains = state; if (!el.hidden) render(); },
    show() { render(); poll(); timer = setInterval(poll, INCIDENTS_MS); },
    hide() { clearInterval(timer); },
  };
}
