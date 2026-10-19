import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconCode, sky, summarize, weatherLine, nextHours, forecastDays, activeAlerts, sunTimes } from '../src/tiles/weather-data.js';

// Shaped like api.weather.gov's /forecast and /forecast/hourly periods (LWX 94,70, 2026-10-19).
const icon = (dn, code) => 'https://api.weather.gov/icons/land/' + dn + '/' + code + '?size=small';
const hour = (h, temp, code, pop, dn) => ({
  startTime: '2026-10-19T' + String(h).padStart(2, '0') + ':00:00-04:00',
  endTime: '2026-10-19T' + String(h + 1).padStart(2, '0') + ':00:00-04:00',
  temperature: temp, icon: icon(dn || 'day', code), shortForecast: 'x',
  probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: pop },
});
const daily = [
  { startTime: '2026-10-19T13:00:00-04:00', endTime: '2026-10-19T18:00:00-04:00', isDaytime: true, temperature: 65 },
  { startTime: '2026-10-19T18:00:00-04:00', endTime: '2026-10-20T06:00:00-04:00', isDaytime: false, temperature: 48 },
  { startTime: '2026-10-20T06:00:00-04:00', endTime: '2026-10-20T18:00:00-04:00', isDaytime: true, temperature: 68 },
];
const at = (h, m) => new Date(2026, 9, 19, h, m || 0);

test('icon codes, including two-part and windy ones', () => {
  assert.deepEqual(iconCode(icon('night', 'few')), { code: 'few', night: true });
  assert.deepEqual(iconCode('https://api.weather.gov/icons/land/day/rain,40/tsra,60?size=medium'), { code: 'rain', night: false });
  assert.deepEqual(sky({ icon: icon('day', 'skc') }), { icon: 'sun', words: 'sunny' });
  assert.deepEqual(sky({ icon: icon('night', 'skc') }), { icon: 'moon', words: 'clear' });
  assert.deepEqual(sky({ icon: icon('night', 'sct') }), { icon: 'moon-cloud', words: 'partly cloudy' });
  assert.deepEqual(sky({ icon: icon('day', 'wind_bkn') }), { icon: 'wind', words: 'windy' });
  assert.deepEqual(sky({ icon: icon('day', 'mystery'), shortForecast: 'Volcanic Ash' }), { icon: 'cloud', words: 'volcanic ash' });
});

test('daytime: the hour now, today\'s high and tonight\'s low', () => {
  const w = summarize(daily, [hour(13, 62, 'few', 0), hour(14, 63, 'skc', 0)], at(13, 40));
  assert.equal(weatherLine(w), 'Mostly sunny.');
  assert.equal(w.temp, 62);
  assert.deepEqual([w.icon, w.high, w.low, w.rainFrom], ['sun', 65, 48, null]);
});

test('after dark only tonight\'s low', () => {
  const w = summarize(daily, [hour(20, 55, 'few', 0, 'night')], at(20, 5));
  assert.deepEqual([w.icon, w.words, w.high, w.low], ['moon', 'mostly clear', null, 48]);
});

test('dry now, rain likely later: when it starts', () => {
  const hourly = [hour(13, 62, 'bkn', 10), hour(14, 61, 'rain', 30), hour(15, 60, 'rain', 40), hour(16, 58, 'rain_showers', 70)];
  assert.equal(weatherLine(summarize(daily, hourly, at(13))), 'Rain from 4 pm.');
  assert.equal(weatherLine(summarize(daily, [hour(13, 33, 'ovc', 0), hour(14, 32, 'rain_fzra', 60)], at(13))), 'Sleet from 2 pm.');
  // Already raining: just say so.
  assert.equal(weatherLine(summarize(daily, [hour(13, 55, 'rain', 80), hour(14, 55, 'tsra', 90)], at(13))), 'Rain.');
});

test('nothing to show when the forecast doesn\'t cover the hour', () => {
  assert.equal(summarize(daily, [hour(13, 62, 'few', 0)], at(15)), null);
  assert.equal(summarize(daily, [], at(13)), null);
  assert.equal(summarize(null, null, at(13)), null);
});

test('the next hours, from the current one', () => {
  const list = nextHours([hour(12, 60, 'few', 0), hour(13, 62, 'few', 0), hour(14, 63, 'rain', 40)], at(13, 30), 12);
  assert.deepEqual(list.map((h) => [h.at.getHours(), h.temp, h.icon, h.pop]), [[13, 62, 'sun', 0], [14, 63, 'rain', 40]]);
});

test('days pair a daytime period with the night after it', () => {
  const p = (start, day, temp, code, pp) => ({ startTime: start, isDaytime: day, temperature: temp, icon: icon(day ? 'day' : 'night', code), probabilityOfPrecipitation: { value: pp } });
  const days = forecastDays([
    p('2026-10-19T13:00:00-04:00', true, 65, 'skc', 0), p('2026-10-19T18:00:00-04:00', false, 48, 'few', 10),
    p('2026-10-20T06:00:00-04:00', true, 68, 'rain', 60), p('2026-10-20T18:00:00-04:00', false, 50, 'rain', 70),
  ], 7);
  assert.deepEqual(days.map((d) => [d.name, d.icon, d.high, d.low, d.pop]), [['Today', 'sun', 65, 48, 10], ['Tue', 'rain', 68, 50, 70]]);
  const night = forecastDays([p('2026-10-19T18:00:00-04:00', false, 48, 'few', 0), p('2026-10-20T06:00:00-04:00', true, 68, 'skc', 0)], 7);
  assert.deepEqual(night.map((d) => [d.name, d.high, d.low]), [['Tonight', null, 48], ['Tue', 68, null]]);
});

test('alerts: current ones only, one per kind', () => {
  const f = (event, ends) => ({ properties: { event, ends } });
  const list = activeAlerts({ features: [f('Heat Advisory', '2026-10-19T20:00:00-04:00'), f('Heat Advisory', '2026-10-19T20:00:00-04:00'),
    f('Wind Advisory', '2026-10-19T10:00:00-04:00'), f('Flood Watch', null)] }, at(13));
  assert.deepEqual(list.map((a) => a.event), ['Heat Advisory', 'Flood Watch']);
});

test('sunrise and sunset in Arlington match published times within two minutes', () => {
  const near = (d, h, m) => assert.ok(Math.abs(d.getHours() * 60 + d.getMinutes() - (h * 60 + m)) <= 2, d.toString());
  const june = sunTimes(new Date(2026, 5, 21), 38.88, -77.11);
  near(june.rise, 5, 43); near(june.set, 20, 37);
  const dec = sunTimes(new Date(2026, 11, 21), 38.88, -77.11);
  near(dec.rise, 7, 23); near(dec.set, 16, 49);
});
