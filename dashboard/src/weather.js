// Fetches the National Weather Service forecast for content.js's `weather` spot every 30 minutes,
// and its active alerts every 10, and reports { daily, hourly, alerts }. The page asks
// api.weather.gov itself, from the Mac's copy and the frame alike: no key, and it sends CORS
// headers. A failed fetch keeps the last forecast, saved on the frame so a reload during an outage
// keeps it too, and `at` says when it arrived for the "stale" badge; summarize() stops showing it
// once it no longer covers the current hour.
import { weather } from './content.js';
import { activeAlerts } from './tiles/weather-data.js';
import { DEMO, DEMO_STALE, demoForecast } from './demo.js';
import { save, load } from './stale.js';
import { clockIsSane } from './time.js';

const POLL_MS = 30 * 60000;
const ALERTS_MS = 10 * 60000;
const RETRY_MS = 5 * 60000;
const KEY = 'glance-weather';
const KEEP_MS = 7 * 864e5; // the hourly forecast runs about a week ahead

function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  return fetch(url, { cache: 'no-store', signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('weather.gov answered ' + r.status))))
    .finally(() => clearTimeout(timer));
}

export function watchWeather(onChange) {
  if (DEMO) { onChange(Object.assign(demoForecast(), { at: Date.now() - (DEMO_STALE ? 3 * 3600e3 : 0) })); return; }
  const point = weather.lat.toFixed(4) + ',' + weather.lon.toFixed(4);
  const latest = { daily: null, hourly: null, alerts: [], at: 0 };
  // Alerts aren't saved: an old warning could be over, and they come back within 10 minutes.
  const saved = load(KEY, Date.now(), KEEP_MS);
  if (saved && saved.data.point === point) {
    Object.assign(latest, { daily: saved.data.daily, hourly: saved.data.hourly, at: saved.at });
    onChange(latest);
  }
  let grid = null; // { forecast, forecastHourly } URLs for the spot, looked up once

  function poll() {
    const lookup = grid ? Promise.resolve(grid)
      : getJson('https://api.weather.gov/points/' + point).then((json) => (grid = json.properties));
    lookup
      .then((g) => Promise.all([getJson(g.forecast), getJson(g.forecastHourly)]))
      .then(([daily, hourly]) => {
        latest.daily = daily.properties.periods;
        latest.hourly = hourly.properties.periods;
        // Before network time the clock reads the firmware's date: no age rather than a wrong one.
        latest.at = clockIsSane(new Date(), __BUILT_AT__) ? Date.now() : 0;
        save(KEY, { point, daily: latest.daily, hourly: latest.hourly }, latest.at);
        onChange(latest);
        setTimeout(poll, POLL_MS);
      })
      .catch(() => setTimeout(poll, RETRY_MS));
  }

  function pollAlerts() {
    getJson('https://api.weather.gov/alerts/active?point=' + point)
      .then((json) => {
        latest.alerts = activeAlerts(json, new Date());
        if (latest.hourly) onChange(latest);
      }, () => {});
  }

  poll();
  pollAlerts();
  setInterval(pollAlerts, ALERTS_MS);
}
