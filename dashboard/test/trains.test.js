import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minutes, normalize } from '../src/tiles/trains-data.js';
import { trainsHtml, STALE_MS } from '../src/tiles/trains-view.js';

// Shape of a real GetPrediction/K04 response (2026-10-16), plus the odd rows WMATA sends.
const wmata = { Trains: [
  { Car: '6', DestinationName: 'Ashburn', Group: '2', Line: 'SV', Min: '8' },
  { Car: '8', DestinationName: 'New Crlton', Group: '1', Line: 'OR', Min: '2' },
  { Car: '8', DestinationName: 'Downtown Largo', Group: '1', Line: 'SV', Min: 'BRD' },
  { Car: '8', DestinationName: 'Vienna/Fairfax-GMU', Group: '2', Line: 'OR', Min: 'ARR' },
  { Car: '-', DestinationName: 'No Passenger', Group: '1', Line: 'No', Min: '5' },
  { Car: '8', DestinationName: 'Largo', Group: '1', Line: 'SV', Min: '---' },
  { Car: '8', DestinationName: 'Largo', Group: '1', Line: 'SV', Min: '' },
] };

const metro = { name: 'Ballston', directions: [{ group: '1', label: 'To DC' }, { group: '2', label: 'To Vienna' }] };

test('WMATA minute codes', () => {
  assert.equal(minutes('BRD'), -1);
  assert.equal(minutes('ARR'), 0);
  assert.equal(minutes('12'), 12);
  assert.equal(minutes('---'), null);
  assert.equal(minutes(''), null);
});

test('keeps passenger trains with a time, soonest first, with readable names', () => {
  const { trains } = normalize(wmata, 1);
  assert.deepEqual(trains.map((t) => [t.line, t.dest, t.group, t.min]), [
    ['SV', 'Downtown Largo', '1', -1],
    ['OR', 'Vienna', '2', 0],
    ['OR', 'New Carrollton', '1', 2],
    ['SV', 'Ashburn', '2', 8],
  ]);
});

test('banner shows up to three times per direction, with no destinations or units', () => {
  const now = 1e12;
  const html = trainsHtml(metro, { data: normalize(wmata, now), lastOk: now }, now);
  assert.match(html, /<b>Ballston<\/b><\/div>/); // no second line while times are live
  assert.match(html, /To DC.*line-SV"><\/span><i>Now<\/i>.*line-OR"><\/span>2<\/span>/);
  assert.match(html, /To Vienna.*line-OR"><\/span><i>Now<\/i>.*line-SV"><\/span>8<\/span>/);
  assert.doesNotMatch(html, /Downtown Largo|Ashburn|min</);
});

test('old times are hidden rather than shown wrong', () => {
  const now = 1e12;
  const html = trainsHtml(metro, { data: normalize(wmata, 0), lastOk: now - STALE_MS - 60000 }, now);
  assert.match(html, /Times from 4 min ago/);
  assert.doesNotMatch(html, /Now/);
});

test('an empty platform says so', () => {
  const html = trainsHtml(metro, { data: { trains: [] }, lastOk: 5 }, 5);
  assert.equal((html.match(/No trains/g) || []).length, 2);
});
