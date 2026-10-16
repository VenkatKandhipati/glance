// Metro banner: live arrivals from the Mac's /api/trains, refreshed every 30 s. Only redraws when
// the markup changes. A failed fetch keeps the last times until they're too old to trust.
import { metro } from '../content.js';
import { trainsHtml } from './trains-view.js';

const POLL_MS = 30000;

export function mountTrains(el) {
  const state = { data: null, lastOk: 0 };
  let html = '';

  function render() {
    const next = trainsHtml(metro, state, Date.now());
    if (next !== html) el.innerHTML = html = next;
  }

  function poll() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetch('/api/trains?station=' + encodeURIComponent(metro.station), { cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.trains) { state.data = data; state.lastOk = Date.now(); }
      }, () => {})
      .finally(() => { clearTimeout(timer); render(); });
  }

  render();
  poll();
  setInterval(poll, POLL_MS);
}
