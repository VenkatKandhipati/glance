import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconCode, sky, summarize, weatherLine } from '../src/tiles/weather-data.js';

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
  assert.equal(weatherLine(w), '62° and mostly sunny');
  assert.deepEqual([w.icon, w.high, w.low, w.rainFrom], ['sun', 65, 48, null]);
});

test('after dark only tonight\'s low', () => {
  const w = summarize(daily, [hour(20, 55, 'few', 0, 'night')], at(20, 5));
  assert.deepEqual([w.icon, w.words, w.high, w.low], ['moon', 'mostly clear', null, 48]);
});

test('dry now, rain likely later: when it starts', () => {
  const hourly = [hour(13, 62, 'bkn', 10), hour(14, 61, 'rain', 30), hour(15, 60, 'rain', 40), hour(16, 58, 'rain_showers', 70)];
  assert.equal(weatherLine(summarize(daily, hourly, at(13))), '62°, rain from 4 pm');
  assert.equal(weatherLine(summarize(daily, [hour(13, 33, 'ovc', 0), hour(14, 32, 'rain_fzra', 60)], at(13))), '33°, sleet from 2 pm');
  // Already raining: just say so.
  assert.equal(weatherLine(summarize(daily, [hour(13, 55, 'rain', 80), hour(14, 55, 'tsra', 90)], at(13))), '55° and rain');
});

test('nothing to show when the forecast doesn\'t cover the hour', () => {
  assert.equal(summarize(daily, [hour(13, 62, 'few', 0)], at(15)), null);
  assert.equal(summarize(daily, [], at(13)), null);
  assert.equal(summarize(null, null, at(13)), null);
});
