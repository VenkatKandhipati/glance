// ?demo: made-up events, trains and weather, and a public-domain photo, for screenshots that show
// nothing personal (`?demo&screen=week` opens a screen, `?demo&alert` adds a weather warning, `?demo&stale` shows stale badges; the Time screen takes `&work`, `&idle` and `&auto`). The clock reads 8:42 am the day after
// the build, so screenshots always look the same. Imported first by main.js, before anything
// reads the time.
export const DEMO = /[?&]demo(&|=|$)/.test(location.search);
export const DEMO_SCREEN = DEMO ? new URLSearchParams(location.search).get('screen') : null;
// `?demo&stale`: weather and calendars as if Wi-Fi had been down for a few hours.
export const DEMO_STALE = DEMO && /[?&]stale(&|$)/.test(location.search);

if (DEMO) {
  const Real = Date;
  const start = new Real(__BUILT_AT__);
  start.setDate(start.getDate() + 1);
  start.setHours(8, 42, 0, 0);
  const offset = start - Real.now();
  class DemoDate extends Real {
    constructor(...args) {
      if (args.length) super(...args);
      else super(Real.now() + offset);
    }
    static now() { return Real.now() + offset; }
  }
  window.Date = DemoDate;
}

export const demoPhotos = ['/demo/tidal-basin.jpg'];

// Days from the demo's today at a given time.
function at(days, h, m) {
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

export function demoEvents() {
  const cal = (calId, calendar, quiet) => ({ calId, calendar, quiet: !!quiet });
  const timed = (title, day, h, m, mins, c) => Object.assign({ title, start: at(day, h, m), end: at(day, h, m + mins), allDay: false }, c);
  const allDay = (title, day, days, c) => Object.assign({ title, start: at(day), end: at(day + days), allDay: true }, c);
  const me = cal('personal', 'personal'), friend = cal('friend', 'friend'), club = cal('duckville', 'Book club', true);
  return [
    timed('Coffee with Priya', 0, 10, 30, 60, me),
    timed('Dinner at Rasika', 0, 19, 0, 90, friend),
    timed('Chapter 9 discussion', 1, 19, 30, 60, club),
    timed('Dentist', 2, 9, 0, 45, me),
    timed('Yoga', 2, 18, 0, 60, me),
    timed('Pick up dry cleaning', 3, 17, 30, 15, me),
    allDay('Weekend in Shenandoah', 4, 3, friend),
    timed('Farmers market', 5, 9, 0, 120, me),
    allDay("Mom's birthday", 9, 1, me),
    timed('Team offsite', 12, 9, 0, 480, me),
    allDay('Halloween party', 15, 1, friend),
  ];
}

export function demoTrains() {
  const t = (line, dest, group, min) => ({ line, dest, group, min, cars: 8 });
  return { updated: Date.now(), trains: [
    t('SV', 'Downtown Largo', '1', -1), t('OR', 'Vienna', '2', 2), t('OR', 'New Carrollton', '1', 6),
    t('SV', 'Ashburn', '2', 9), t('SV', 'Downtown Largo', '1', 13), t('OR', 'Vienna', '2', 14),
    t('OR', 'New Carrollton', '1', 18), t('SV', 'Ashburn', '2', 21), t('SV', 'Downtown Largo', '1', 24),
    t('OR', 'Vienna', '2', 27),
  ] };
}

export const demoIncidents = { alerts: [], outages: [] };

// Shaped like weather.gov's /forecast and /forecast/hourly: a cool, clearing autumn day with
// showers in two days' time.
export function demoForecast() {
  const iso = (d) => d.toISOString();
  const icon = (night, code) => 'https://api.weather.gov/icons/land/' + (night ? 'night' : 'day') + '/' + code;
  const hourly = [];
  const temps = [58, 61, 63, 65, 66, 67, 67, 66, 64, 61, 58, 56, 54, 53, 52, 51];
  const now = at(0, new Date().getHours());
  for (let i = 0; i < temps.length; i++) {
    const s = new Date(now.getTime() + i * 3600e3);
    const night = s.getHours() >= 18 || s.getHours() < 7;
    hourly.push({ startTime: iso(s), endTime: iso(new Date(s.getTime() + 3600e3)), temperature: temps[i],
      icon: icon(night, i < 3 ? 'sct' : 'few'), probabilityOfPrecipitation: { value: i < 2 ? 10 : 0 },
      relativeHumidity: { value: 64 - i * 2 }, windSpeed: '7 mph', windDirection: 'NW' });
  }
  const days = [[67, 51, 'few', 'few', 0], [70, 54, 'skc', 'few', 0], [64, 52, 'rain_showers', 'rain', 60],
    [59, 45, 'bkn', 'sct', 20], [62, 46, 'few', 'skc', 0], [66, 50, 'sct', 'few', 0], [68, 52, 'skc', 'few', 0]];
  const daily = [];
  days.forEach((d, i) => {
    const dayStart = at(i, 6), nightStart = at(i, 18), next = at(i + 1, 6);
    daily.push({ startTime: iso(dayStart), endTime: iso(nightStart), isDaytime: true, temperature: d[0], icon: icon(false, d[2]), probabilityOfPrecipitation: { value: d[4] } });
    daily.push({ startTime: iso(nightStart), endTime: iso(next), isDaytime: false, temperature: d[1], icon: icon(true, d[3]), probabilityOfPrecipitation: { value: d[4] } });
  });
  const alerts = /[?&]alert(&|$)/.test(location.search) ? [{ event: 'Wind Advisory', severity: 'Minor', ends: at(0, 18) }] : [];
  return { daily, hourly, alerts };
}

// Twelve weeks of made-up Pomodoro sessions, every one of the last nine days among them, and deep
// work under way since 8:20.
export function demoPomodoro() {
  const cats = ['interview-prep', 'geico', 'geico', 'interview-prep', 'chores', 'learning', 'projects'];
  const between = ['break', 'scrolling', 'bathroom', 'break', 'chores', 'scrolling', 'other'];
  const log = [];
  let s = 7;
  const rand = (n) => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) % n; };
  for (let day = -83; day < 0; day++) {
    const count = day >= -9 ? 2 + rand(4) : rand(6) - 1;
    for (let k = 0; k < count; k++) {
      const start = at(day, 9 + k * 2, 30 * rand(2));
      const done = rand(9) > 0;
      const end = start.getTime() + (done ? 45 : 15 + rand(25)) * 60000;
      log.push({ start: start.getTime(), end, cat: cats[rand(cats.length)], done });
      // the last week also has tracked time between Pomodoros
      if (day >= -7) log.push({ start: end + 60000, end: end + (6 + rand(40)) * 60000, cat: between[rand(between.length)], done: false, kind: 'track' });
    }
  }
  log.push({ start: at(0, 7, 20).getTime(), end: at(0, 8, 5).getTime(), cat: 'geico', done: true });
  log.push({ start: at(0, 8, 5).getTime(), end: at(0, 8, 14).getTime(), cat: 'break', done: false, kind: 'track' });
  log.push({ start: at(0, 8, 14).getTime(), end: at(0, 8, 21).getTime(), cat: 'scrolling', done: false, kind: 'track' });
  // `?demo&work` shows a Pomodoro running, `&idle` nothing, `&auto` a tracker that stopped by
  // itself; otherwise tracking
  const q = (k) => new RegExp('[?&]' + k + '(&|$)').test(location.search);
  const state = q('work') ? { phase: 'work', start: at(0, 8, 21).getTime(), cat: 'interview-prep' }
    : q('idle') || q('auto') ? { phase: 'idle', start: 0, cat: 'scrolling' }
    : { phase: 'track', start: at(0, 8, 21).getTime(), cat: 'projects' };
  const auto = q('auto') ? { cat: 'scrolling', start: at(0, 8, 14).getTime(), at: at(0, 8, 21).getTime(), until: at(0, 10, 21).getTime() } : null;
  return { saved: 0, cat: 'geico', state, log, touch: Date.now(), auto };
}
