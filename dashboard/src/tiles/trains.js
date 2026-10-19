// Metro banner: live arrivals, refreshed every 30 s. Served by the Mac, they come from its
// /api/trains; the frame build calls WMATA directly with the key baked in at build time.
// Only redraws when the markup changes. A failed fetch keeps the last times until they're too old.
// Asleep (night clock up) it stops asking, about a third of the day's calls; waking asks at once.
import { metro } from '../content.js';
import { trainsHtml } from './trains-view.js';
import { normalize } from './trains-data.js';

function request(signal) {
  if (__FRAME__) {
    return fetch('https://api.wmata.com/StationPrediction.svc/json/GetPrediction/' + encodeURIComponent(metro.station),
      { cache: 'no-store', signal, headers: { api_key: __WMATA_KEY__ } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => json && normalize(json, Date.now()));
  }
  return fetch('/api/trains?station=' + encodeURIComponent(metro.station), { cache: 'no-store', signal })
    .then((r) => (r.ok ? r.json() : null));
}

const POLL_MS = 30000;

export function mountTrains(el) {
  const state = { data: null, lastOk: 0 };
  let html = '', asleep = false;

  function render() {
    const next = trainsHtml(metro, state, Date.now());
    if (next !== html) el.innerHTML = html = next;
  }

  function poll() {
    if (asleep) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    request(ctrl.signal)
      .then((data) => {
        if (data && data.trains) { state.data = data; state.lastOk = Date.now(); }
      }, () => {})
      .finally(() => { clearTimeout(timer); render(); });
  }

  render();
  poll();
  setInterval(poll, POLL_MS);

  return function setAsleep(on) {
    if (on === asleep) return;
    asleep = on;
    if (on) return;
    state.data = null; // "Checking…" rather than last night's times while the first answer comes in
    render();
    poll();
  };
}
