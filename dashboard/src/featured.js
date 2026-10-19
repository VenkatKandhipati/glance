// Fetches the day's pictures from the public sources in content.js's `featured` (see
// featured-data.js) and hands them out one at a time, taking each source in turn. Each source
// is fetched once a day; one that fails keeps yesterday's pictures and tries again in an hour.
// The page asks them directly, from the frame and the Mac's copy alike: none needs a key (NASA's
// shared DEMO_KEY allows 50 calls a day per address; we make one or two) and all send CORS headers.
import { featured } from './content.js';
import { addDays, clockIsSane, dayKey } from './time.js';
import { DEMO } from './demo.js';
import * as F from './featured-data.js';

const PER_SOURCE = 8; // pictures a day from the sources that have many

function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  return fetch(url, { cache: 'no-store', signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(url.split('?')[0] + ' answered ' + r.status))))
    .finally(() => clearTimeout(timer));
}

// A part of a source that fails gives nothing rather than sinking the rest.
const orNone = (p) => p.catch(() => []);

const SOURCES = {
  // One painting a day, the same all day. The search reaches only its first 1,000 results (100
  // pages of 10), so: a page a day, and the next painting on it each time round, about 3 years.
  painting: (day) => getJson(F.AIC_SEARCH + '&limit=10&page=' + (1 + day % 100))
    .then((json) => [F.paintingItem(json, Math.floor(day / 100))]),
  // Today's, or yesterday's while today's isn't up yet (NASA's API fails on a day without one).
  apod: () => {
    const apod = (date) => getJson('https://api.nasa.gov/planetary/apod?thumbs=true&api_key=DEMO_KEY' + (date ? '&date=' + date : ''));
    return apod().catch(() => apod(dayKey(addDays(new Date(), -1)))).then((json) => [F.apodItem(json)]);
  },
  earth: (day) => getJson(F.NASA_EARTH_SEARCH + '&page=' + (1 + day % F.NASA_EARTH_PAGES))
    .then((json) => F.pickSome(F.earthItems(json), PER_SOURCE, day)),
  nature: (day) => commons(F.COMMONS_CATEGORIES[day % F.COMMONS_CATEGORIES.length], day, PER_SOURCE),
  // Paintings from India, Nepal and the Himalaya: a few a day from each museum, mixed.
  'south-asian-art': (day) => Promise.all([
    orNone(getJson(F.clevelandUrl((day * 25) % 1000)).then((json) => F.pickSome(F.clevelandItems(json), 3, day))),
    orNone(getJson(F.metSearchUrl((day * 12) % 744))
      .then((json) => Promise.all(F.pickSome(json.objectIDs || [], 4, day).map((id) => orNone(getJson(F.metObjectUrl(id)))))))
      .then((objects) => objects.map(F.metItem).filter(Boolean).slice(0, 3)),
    orNone(getJson(F.AIC_INDIA_SEARCH + '&limit=10&page=' + (1 + day % 5))
      .then((json) => F.pickSome(F.aicItems(json, '', ' · Art Institute of Chicago'), 2, day))),
  ]).then((parts) => F.pickSome([].concat.apply([], parts), 8, day)),
  // South Asian landscapes from Commons, and the subcontinent from the Space Station.
  'south-asian-nature': (day) => Promise.all([
    orNone(commons(F.COMMONS_SOUTH_ASIA[day % F.COMMONS_SOUTH_ASIA.length], day, 6)),
    orNone(getJson(F.NASA_EARTH_SOUTH_ASIA[day % F.NASA_EARTH_SOUTH_ASIA.length])
      .then((json) => F.pickSome(F.earthItems(json), 2, day))),
  ]).then((parts) => [].concat.apply([], parts)),
};

// `n` landscape-shaped photos from a Commons category, the same ones all day.
function commons(category, day, n) {
  return getJson(F.commonsListUrl(category))
    .then((json) => getJson(F.commonsInfoUrl(F.pickSome(F.commonsTitles(json), n * 2, day))))
    .then((json) => F.pickSome(F.natureItems(json), n, day));
}

// Returns next(): the next picture to show between your photos, or null while there are none.
export function startFeatured() {
  const names = DEMO || !featured.every ? [] : featured.sources.filter((s) => SOURCES[s]);
  const items = {}, fetchedDay = {}, turn = {};
  let source = 0;

  function refresh() {
    const now = new Date();
    if (!clockIsSane(now, __BUILT_AT__)) return; // "the day" means nothing before network time
    const day = F.dayNumber(now);
    // A source listed twice is fetched once.
    names.filter((name, i) => names.indexOf(name) === i).forEach((name) => {
      if (fetchedDay[name] === day) return;
      SOURCES[name](day).then((list) => {
        list = list.filter(Boolean);
        if (!list.length) return;
        items[name] = list;
        fetchedDay[name] = day;
        turn[name] = 0;
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
