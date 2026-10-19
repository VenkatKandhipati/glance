// Fetches the National Weather Service forecast for content.js's `weather` spot every 30 minutes
// and reports { daily, hourly } periods. The page asks api.weather.gov itself, from the Mac's copy
// and the frame alike: no key, and it sends CORS headers. A failed fetch keeps the last forecast;
// summarize() stops showing it once it no longer covers the current hour.
import { weather } from './content.js';

const POLL_MS = 30 * 60000;
const RETRY_MS = 5 * 60000;

function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  return fetch(url, { cache: 'no-store', signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('weather.gov answered ' + r.status))))
    .finally(() => clearTimeout(timer));
}

export function watchWeather(onChange) {
  let grid = null; // { forecast, forecastHourly } URLs for the spot, looked up once

  function poll() {
    const lookup = grid ? Promise.resolve(grid)
      : getJson('https://api.weather.gov/points/' + weather.lat.toFixed(4) + ',' + weather.lon.toFixed(4))
        .then((json) => (grid = json.properties));
    lookup
      .then((g) => Promise.all([getJson(g.forecast), getJson(g.forecastHourly)]))
      .then(([daily, hourly]) => {
        onChange({ daily: daily.properties.periods, hourly: hourly.properties.periods });
        setTimeout(poll, POLL_MS);
      })
      .catch(() => setTimeout(poll, RETRY_MS));
  }

  poll();
}
