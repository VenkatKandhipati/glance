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
  nature: (day) => getJson(F.commonsListUrl(F.COMMONS_CATEGORIES[day % F.COMMONS_CATEGORIES.length]))
    .then((json) => getJson(F.commonsInfoUrl(F.pickSome(F.commonsTitles(json), PER_SOURCE * 2, day))))
    .then((json) => F.pickSome(F.natureItems(json), PER_SOURCE, day)),
};

// Returns next(): the next picture to show between your photos, or null while there are none.
export function startFeatured() {
  const names = DEMO || !featured.every ? [] : featured.sources.filter((s) => SOURCES[s]);
  const items = {}, fetchedDay = {}, turn = {};
  let source = 0;

  function refresh() {
    const now = new Date();
    if (!clockIsSane(now, __BUILT_AT__)) return; // "the day" means nothing before network time
    const day = F.dayNumber(now);
    names.forEach((name) => {
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
