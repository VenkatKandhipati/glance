// Weather screen: now (temperature, sky, today's high and low, wind, humidity, sunrise and sunset),
// the next 12 hours, and the week. Active alerts run across the top. Drawn from the forecast the
// clock tile already has; nothing extra is fetched.
import { weather } from '../content.js';
import { ICONS, WARNING } from '../tiles/clock.js';
import { summarize, nextHours, forecastDays, sunTimes } from '../tiles/weather-data.js';
import { timeText } from '../tiles/calendar.js';
import { esc } from '../time.js';

const icon = (name) => ICONS[name] || ICONS.cloud;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const hourText = (d) => (d.getHours() % 12 || 12) + (d.getHours() >= 12 ? ' pm' : ' am');

export function renderWeatherScreen(el, now, forecast) {
  const w = forecast && summarize(forecast.daily, forecast.hourly, now);
  let html;
  if (!w) {
    html = '<header class="screen-head"><h1 class="serif">Weather<i>,</i></h1></header>' +
      '<section class="tile wx-now"><p class="tr-quiet">Waiting for the forecast…</p></section>';
  } else {
    const sun = sunTimes(now, weather.lat, weather.lon);
    const facts = [];
    if (w.high !== null) facts.push('High ' + w.high + '°');
    if (w.low !== null) facts.push('Low ' + w.low + '°');
    const details = [];
    if (w.wind) details.push('Wind ' + esc(w.wind));
    if (w.humidity !== null) details.push('Humidity ' + w.humidity + '%');
    const alerts = (forecast.alerts || []).filter((a) => !a.ends || a.ends > now).map((a) =>
      '<li>' + WARNING + '<b>' + esc(a.event) + '</b>' + (a.ends ? '<span>until ' + timeText(a.ends) + '</span>' : '') + '</li>').join('');
    const hours = nextHours(forecast.hourly, now, 12).map((h, i) =>
      '<li><span class="wx-h">' + (i === 0 ? 'Now' : hourText(h.at)) + '</span><span class="wx-i">' + icon(h.icon) + '</span>' +
      '<b>' + h.temp + '°</b><span class="wx-pop">' + (h.pop >= 20 ? h.pop + '%' : '') + '</span></li>').join('');
    const days = forecastDays(forecast.daily, 7).map((d) =>
      '<li><span class="wx-dname">' + d.name + '</span><span class="wx-i">' + icon(d.icon) + '</span>' +
      '<span class="wx-words">' + esc(cap(d.words)) + '</span>' +
      '<span class="wx-hl"><b>' + (d.high !== null ? d.high + '°' : '') + '</b>' + (d.low !== null ? d.low + '°' : '') + '</span>' +
      '<span class="wx-pop">' + (d.pop >= 20 ? d.pop + '% rain' : '') + '</span></li>').join('');
    html = '<header class="screen-head"><h1 class="serif">Weather<i>,</i></h1><span>' + esc(weather.name || '') + '</span></header>' +
      (alerts ? '<ul class="wx-alerts">' + alerts + '</ul>' : '') +
      '<div class="wx-top">' +
      '<section class="tile wx-now"><div class="wx-big"><span class="wx-i">' + icon(w.icon) + '</span>' +
      '<span class="wx-temp serif">' + w.temp + '°</span></div>' +
      '<div class="wx-words-now serif">' + esc(cap(w.words)) + '</div>' +
      '<div class="wx-facts"><b>' + facts.join(' · ') + '</b>' + details.join(' · ') + '</div>' +
      (sun ? '<div class="wx-sun">Sunrise ' + timeText(sun.rise) + ' · Sunset ' + timeText(sun.set) + '</div>' : '') +
      '</section>' +
      '<section class="tile wx-hours"><h2>Next 12 hours</h2><ul>' + hours + '</ul></section></div>' +
      '<section class="tile wx-days"><ul>' + days + '</ul></section>';
  }
  if (el.__html !== html) el.innerHTML = el.__html = html;
}
