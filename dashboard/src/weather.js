// Fetches the National Weather Service forecast for content.js's `weather` spot every 30 minutes,
// and its active alerts every 10, and reports { daily, hourly, alerts }. The page asks
// api.weather.gov itself, from the Mac's copy and the frame alike: no key, and it sends CORS
// headers. A failed fetch keeps the last forecast; summarize() stops showing it once it no longer
// covers the current hour.
import { weather } from './content.js';
import { activeAlerts } from './tiles/weather-data.js';
import { DEMO, demoForecast } from './demo.js';

const POLL_MS = 30 * 60000;
const ALERTS_MS = 10 * 60000;
const RETRY_MS = 5 * 60000;

function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  return fetch(url, { cache: 'no-store', signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('weather.gov answered ' + r.status))))
    .finally(() => clearTimeout(timer));
}

export function watchWeather(onChange) {
  if (DEMO) { onChange(demoForecast()); return; }
  const point = weather.lat.toFixed(4) + ',' + weather.lon.toFixed(4);
  const latest = { daily: null, hourly: null, alerts: [] };
  let grid = null; // { forecast, forecastHourly } URLs for the spot, looked up once

  function poll() {
    const lookup = grid ? Promise.resolve(grid)
      : getJson('https://api.weather.gov/points/' + point).then((json) => (grid = json.properties));
    lookup
      .then((g) => Promise.all([getJson(g.forecast), getJson(g.forecastHourly)]))
      .then(([daily, hourly]) => {
        latest.daily = daily.properties.periods;
        latest.hourly = hourly.properties.periods;
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
