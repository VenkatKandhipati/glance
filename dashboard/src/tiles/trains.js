// Metro banner: live arrivals, refreshed every 30 s, and trouble at the station (WMATA's alerts on
// its lines, its elevator and escalator outages) every 5 minutes, or every 2 while the Transit
// screen is up. Served by the Mac, they come from its /api/trains and /api/incidents; the frame
// build calls WMATA directly with the key baked in at build time.
// Only redraws when the markup changes. A failed fetch keeps the last answer until it's too old.
// Asleep (night clock up, screen off) it stops asking, about a third of the day's calls; waking
// asks at once. The Transit screen hears every answer through onUpdate.
import { metro } from '../content.js';
import { trainsHtml } from './trains-view.js';
import { normalize, normalizeIncidents } from './trains-data.js';
import { DEMO, demoTrains, demoIncidents } from '../demo.js';

function request(signal) {
  if (DEMO) return Promise.resolve(demoTrains());
  if (__FRAME__) {
    return fetch('https://api.wmata.com/StationPrediction.svc/json/GetPrediction/' + encodeURIComponent(metro.station),
      { cache: 'no-store', signal, headers: { api_key: __WMATA_KEY__ } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => json && normalize(json, Date.now()));
  }
  return fetch('/api/trains?station=' + encodeURIComponent(metro.station), { cache: 'no-store', signal })
    .then((r) => (r.ok ? r.json() : null));
}

function wmata(path, signal) {
  return fetch('https://api.wmata.com/Incidents.svc/json/' + path, { cache: 'no-store', signal, headers: { api_key: __WMATA_KEY__ } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('WMATA answered ' + r.status))));
}

function requestIncidents(signal) {
  if (DEMO) return Promise.resolve(demoIncidents);
  if (__FRAME__) {
    return Promise.all([wmata('Incidents', signal), wmata('ElevatorIncidents?StationCode=' + encodeURIComponent(metro.station), signal)])
      .then(([rail, lifts]) => normalizeIncidents(rail, lifts, metro.lines));
  }
  return fetch('/api/incidents?station=' + encodeURIComponent(metro.station) + '&lines=' + metro.lines.join(','), { cache: 'no-store', signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('incidents ' + r.status))));
}

// fetcher(signal) with an 8 s limit.
function timed(fetcher) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  return fetcher(ctrl.signal).finally(() => clearTimeout(timer));
}

const POLL_MS = 30000;
const INCIDENTS_MS = 5 * 60000;

// Returns { setAsleep(on), refreshIncidents() }.
export function mountTrains(el, onUpdate) {
  const state = { data: null, lastOk: 0, incidents: null, incidentsAt: 0 };
  let html = '', asleep = false, asking = false;

  function render() {
    const next = trainsHtml(metro, state, Date.now());
    if (next !== html) el.innerHTML = html = next;
    onUpdate(state);
  }

  function poll() {
    if (asleep) return;
    timed(request)
      .then((data) => {
        if (data && data.trains) { state.data = data; state.lastOk = Date.now(); }
      }, () => {})
      .finally(render);
  }

  function pollIncidents() {
    if (asleep || asking) return;
    asking = true;
    timed(requestIncidents)
      .then((inc) => {
        if (inc && inc.alerts && inc.outages) { state.incidents = inc; state.incidentsAt = Date.now(); }
      }, () => {})
      .finally(() => { asking = false; render(); });
  }

  render();
  poll();
  pollIncidents();
  setInterval(poll, POLL_MS);
  setInterval(pollIncidents, INCIDENTS_MS);

  return {
    setAsleep(on) {
      if (on === asleep) return;
      asleep = on;
      if (on) return;
      state.data = null; // "Checking…" rather than last night's times while the first answer comes in
      render();
      poll();
      pollIncidents();
    },
    refreshIncidents: pollIncidents,
  };
}
