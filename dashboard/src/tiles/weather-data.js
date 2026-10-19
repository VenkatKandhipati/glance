// Weather from the US National Weather Service (api.weather.gov): free, no key, sends CORS
// headers. Turns its 12-hour and hourly forecasts into the few words the clock tile shows.
// Kept free of the DOM and fetch so it can be unit tested.
import { timeText } from './calendar.js';

// NWS icon codes (…/icons/land/day/<code>,<pop>/<code>?size=…) → our icon and words.
const SKY = {
  skc: ['clear', 'sunny', 'clear'],
  few: ['clear', 'mostly sunny', 'mostly clear'],
  sct: ['partly', 'partly cloudy'],
  bkn: ['cloud', 'mostly cloudy'],
  ovc: ['cloud', 'cloudy'],
  rain: ['rain', 'rain'],
  rain_showers: ['rain', 'showers'],
  rain_showers_hi: ['rain', 'showers'],
  tsra: ['storm', 'storms'],
  tsra_sct: ['storm', 'storms'],
  tsra_hi: ['storm', 'storms'],
  snow: ['snow', 'snow'],
  blizzard: ['snow', 'blizzard'],
  rain_snow: ['snow', 'rain and snow'],
  rain_sleet: ['snow', 'sleet'],
  snow_sleet: ['snow', 'sleet'],
  sleet: ['snow', 'sleet'],
  fzra: ['snow', 'freezing rain'],
  rain_fzra: ['snow', 'freezing rain'],
  snow_fzra: ['snow', 'freezing rain'],
  fog: ['fog', 'fog'],
  haze: ['fog', 'hazy'],
  smoke: ['fog', 'smoky'],
  dust: ['fog', 'dusty'],
  hot: ['clear', 'hot'],
  cold: ['cloud', 'cold'],
  tornado: ['storm', 'severe weather'],
  hurricane: ['storm', 'hurricane'],
  tropical_storm: ['storm', 'tropical storm'],
};
const WET = { rain: 1, storm: 1, snow: 1 };
const RAIN_SOON_POP = 50;  // % chance of precipitation that counts as "rain from 4 pm"
const RAIN_SOON_HOURS = 12;

// { code, night } from an NWS icon URL; the first condition when the period has two.
export function iconCode(url) {
  const m = /\/icons\/land\/(day|night)\/([a-z_]+)/.exec(url || '');
  return m ? { code: m[2], night: m[1] === 'night' } : { code: '', night: false };
}

// { icon, words } for a forecast period. Windy codes keep their sky; unknown ones fall back to
// NWS's own short forecast.
export function sky(period) {
  const { code, night } = iconCode(period.icon);
  const windy = code.indexOf('wind_') === 0;
  const s = SKY[windy ? code.slice(5) : code];
  if (!s) return { icon: night ? 'moon' : 'cloud', words: String(period.shortForecast || '').toLowerCase() };
  const icon = s[0] === 'clear' ? (night ? 'moon' : 'sun') : s[0] === 'partly' ? (night ? 'moon-cloud' : 'sun-cloud') : s[0];
  const words = (night && s[2]) || s[1];
  return { icon: windy && !WET[icon] ? 'wind' : icon, words: windy && !WET[icon] ? 'windy' : words };
}

const pop = (p) => (p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value) || 0;

// The weather to show at `now`, or null when the forecast doesn't cover it (too old, or not loaded).
// daily: the /forecast periods (12 h each); hourly: the /forecast/hourly periods.
export function summarize(daily, hourly, now) {
  const t = now.getTime();
  const covers = (p) => Date.parse(p.startTime) <= t && t < Date.parse(p.endTime);
  const i = hourly ? hourly.findIndex(covers) : -1;
  if (i < 0) return null;
  const hour = hourly[i];
  const s = sky(hour);
  const out = {
    temp: hour.temperature, icon: s.icon, words: s.words, high: null, low: null, rainFrom: null,
    humidity: hour.relativeHumidity ? hour.relativeHumidity.value : null,
    wind: hour.windSpeed ? (hour.windDirection ? hour.windDirection + ' ' : '') + hour.windSpeed : '',
  };

  // Today's high and tonight's low from the 12-hour periods; after dark only tonight's low is left.
  const d = daily ? daily.findIndex((p) => t < Date.parse(p.endTime)) : -1;
  if (d >= 0 && daily[d].isDaytime) {
    out.high = daily[d].temperature;
    if (daily[d + 1]) out.low = daily[d + 1].temperature;
  } else if (d >= 0) {
    out.low = daily[d].temperature;
  }

  // Dry now but wet later: when it starts, if within the next 12 hours.
  if (!WET[s.icon] || pop(hour) < RAIN_SOON_POP) {
    for (let j = i + 1; j < hourly.length && j <= i + RAIN_SOON_HOURS; j++) {
      const w = sky(hourly[j]);
      if (WET[w.icon] && pop(hourly[j]) >= RAIN_SOON_POP) {
        out.rainFrom = { at: new Date(hourly[j].startTime), what: w.icon === 'storm' ? 'storms' : w.icon !== 'snow' ? 'rain' : /^(snow|blizzard)$/.test(w.words) ? 'snow' : 'sleet' };
        break;
      }
    }
  }
  return out;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The greeting's second line: "Mostly sunny.", or "Rain from 4 pm." when it's dry now and wet soon.
export function weatherLine(w) {
  if (w.rainFrom) return cap(w.rainFrom.what) + ' from ' + timeText(w.rainFrom.at) + '.';
  return cap(w.words) + '.';
}

// The `n` hours from the current one: { at, temp, icon, pop }.
export function nextHours(hourly, now, n) {
  const t = now.getTime();
  return (hourly || []).filter((p) => Date.parse(p.endTime) > t).slice(0, n).map((p) =>
    ({ at: new Date(p.startTime), temp: p.temperature, icon: sky(p).icon, pop: pop(p) }));
}

// Day and night periods paired into days: { name, icon, words, high, low, pop }. When the
// forecast starts at night, the first day is just tonight, with no high.
export function forecastDays(daily, n) {
  const out = [];
  const list = daily || [];
  for (let i = 0; i < list.length && out.length < n; i++) {
    const p = list[i];
    const s = sky(p);
    if (!p.isDaytime) {
      if (i === 0) out.push({ name: 'Tonight', icon: s.icon, words: s.words, high: null, low: p.temperature, pop: pop(p) });
      continue;
    }
    const night = list[i + 1] && !list[i + 1].isDaytime ? list[i + 1] : null;
    const day = new Date(p.startTime);
    out.push({
      name: out.length === 0 ? 'Today' : DAY_NAMES[day.getDay()],
      icon: s.icon, words: s.words, high: p.temperature, low: night ? night.temperature : null,
      pop: Math.max(pop(p), night ? pop(night) : 0),
    });
  }
  return out;
}
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Active warnings, watches and advisories from /alerts/active: { event, ends }, soonest-ending
// first, one per kind.
export function activeAlerts(json, now) {
  const seen = {};
  return ((json && json.features) || []).map((f) => f.properties || {})
    .map((p) => ({ event: p.event || '', ends: p.ends || p.expires ? new Date(p.ends || p.expires) : null }))
    .filter((a) => a.event && (!a.ends || a.ends > now) && !seen[a.event] && (seen[a.event] = true))
    .sort((a, b) => (a.ends || Infinity) - (b.ends || Infinity));
}

// Sunrise and sunset on `day` at lat/lon (NOAA's simplified equations, within a minute or two).
export function sunTimes(day, lat, lon) {
  const rad = Math.PI / 180, sin = (x) => Math.sin(x * rad), cos = (x) => Math.cos(x * rad);
  const n = Math.round(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12) / 864e5 - 10957.5);
  const J = n - lon / 360;                                   // mean solar noon, days since J2000
  const M = (357.5291 + 0.98560028 * J) % 360;               // solar mean anomaly
  const L = (M + 1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M) + 282.9372) % 360;
  const transit = J + 0.0053 * sin(M) - 0.0069 * sin(2 * L);
  const decl = Math.asin(sin(L) * sin(23.44));
  const cosH = (sin(-0.833) - sin(lat) * Math.sin(decl)) / (cos(lat) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return null;
  const half = Math.acos(cosH) / rad / 360;
  const J2000 = 946728000000;
  return { rise: new Date(J2000 + (transit - half) * 864e5), set: new Date(J2000 + (transit + half) * 864e5) };
}
