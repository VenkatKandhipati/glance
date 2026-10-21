// Fetches the day's candidate pictures from the public sources in content.js's `featured` (see
// featured-data.js), has each one measured (picture-check.js), and hands out the good ones one at
// a time, taking the sources in turn. Each source is fetched once a day; one that fails keeps
// yesterday's pictures and tries again in an hour. Sources offer more candidates than are shown,
// because the check turns many away (blurry, too small, too bright for the style).
// The page asks them directly, from the frame and the Mac's copy alike: none needs a key (NASA's
// shared DEMO_KEY allows 50 calls a day per address; we make one or two) and all send CORS headers.
import { featured } from './content.js';
import { addDays, clockIsSane, dayKey } from './time.js';
import { DEMO } from './demo.js';
import { check } from './picture-check.js';
import * as F from './featured-data.js';

function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  return fetch(url, { cache: 'no-store', signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(url.split('?')[0] + ' answered ' + r.status))))
    .finally(() => clearTimeout(timer));
}

// A part of a source that fails gives nothing rather than sinking the rest.
const orNone = (p) => p.catch(() => []);

// Candidates per source per day, before the check.
const SOURCES = {
  // Dark paintings from the Art Institute, and paintings from anywhere in Cleveland's collection.
  painting: (day) => Promise.all([
    orNone(getJson(F.AIC_DARK_SEARCH + '&limit=12&page=' + (1 + day % F.AIC_DARK_PAGES)).then(F.aicItems)),
    orNone(getJson(F.clevelandUrl((day * 37) % (F.CLEVELAND_PAINTINGS - 30), 30)).then((json) => F.clevelandItems(json, false))),
  ]).then((parts) => F.pickSome([].concat.apply([], parts), 42, day)),
  // Paintings from India, Nepal and the Himalaya.
  'south-asian-art': (day) => Promise.all([
    orNone(getJson(F.clevelandUrl((day * 25) % 975, 25, F.CLEVELAND_SOUTH_ASIA)).then((json) => F.clevelandItems(json, true))),
    orNone(getJson(F.AIC_INDIA_SEARCH + '&limit=10&page=' + (1 + day % 5)).then(F.aicItems)),
  ]).then((parts) => F.pickSome([].concat.apply([], parts), 35, day)),
  // Today's, or yesterday's while today's isn't up yet (NASA's API fails on a day without one).
  apod: () => {
    const apod = (date) => getJson('https://api.nasa.gov/planetary/apod?thumbs=true&api_key=DEMO_KEY' + (date ? '&date=' + date : ''));
    return apod().catch(() => apod(dayKey(addDays(new Date(), -1)))).then((json) => [F.apodItem(json)]);
  },
  earth: (day) => getJson(F.NASA_EARTH_SEARCH + '&page=' + (1 + day % F.NASA_EARTH_PAGES))
    .then((json) => F.pickSome(F.earthItems(json), 20, day)),
  // Two categories a day.
  nature: (day) => Promise.all([0, 1].map((k) =>
    orNone(commons(F.COMMONS_CATEGORIES[(day * 2 + k) % F.COMMONS_CATEGORIES.length], day, 12))))
    .then((parts) => [].concat.apply([], parts)),
  // South Asian landscapes from Commons, and the subcontinent from the Space Station.
  'south-asian-nature': (day) => Promise.all([
    orNone(commons(F.COMMONS_SOUTH_ASIA[day % F.COMMONS_SOUTH_ASIA.length], day, 16)),
    orNone(getJson(F.NASA_EARTH_SOUTH_ASIA[day % F.NASA_EARTH_SOUTH_ASIA.length])
      .then((json) => F.pickSome(F.earthItems(json), 4, day))),
  ]).then((parts) => [].concat.apply([], parts)),
};

// `n` landscape-shaped photos from a Commons category, the same ones all day.
function commons(category, day, n) {
  return getJson(F.commonsListUrl(category))
    .then((json) => getJson(F.commonsInfoUrl(F.pickSome(F.commonsTitles(json), Math.min(50, n * 2), day))))
    .then((json) => F.pickSome(F.natureItems(json), n, day));
}

// Returns next(): the next picture to show between your photos, or null while there are none.
export function startFeatured() {
  const names = DEMO || !featured.every ? [] : featured.sources.filter((s) => SOURCES[s]);
  const unique = names.filter((name, i) => names.indexOf(name) === i); // a source listed twice is fetched once
  const items = {}, fetchedDay = {}, turn = {};
  let source = 0;

  function refresh() {
    const now = new Date();
    if (!clockIsSane(now, __BUILT_AT__)) return; // "the day" means nothing before network time
    const day = F.dayNumber(now);
    unique.forEach((name) => {
      if (fetchedDay[name] === day) return;
      SOURCES[name](day).then((list) => {
        list = list.filter(Boolean);
        if (!list.length) return;
        fetchedDay[name] = day;
        // Yesterday's good pictures stay up until today's first one passes.
        let fresh = false;
        check(list, (item) => {
          if (!fresh) { items[name] = []; turn[name] = 0; fresh = true; }
          items[name].push(item);
        });
      }, () => {});
    });
  }

  if (names.length) {
    refresh();
    setInterval(refresh, 3600e3);
  }

  return function next() {
    for (let k = 0; k < names.length; k++) {
      const name = names[source++ % names.length];
      const list = items[name];
      if (list && list.length) return list[turn[name]++ % list.length];
    }
    return null;
  };
}
