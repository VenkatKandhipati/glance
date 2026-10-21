import { DEMO, DEMO_SCREEN } from './demo.js'; // first: in ?demo it sets the clock before anything reads it
import './style.css';
import { renderClock } from './tiles/clock.js';
import { renderCalendar, dayAtGrid } from './tiles/calendar.js';
import { startPhotos } from './tiles/photo.js';
import { mountTrains } from './tiles/trains.js';
import { summarize } from './tiles/weather-data.js';
import { watchCalendars } from './calendars.js';
import { watchWeather } from './weather.js';
import { mountNight } from './night.js';
import { mountSheet } from './sheet.js';
import { mountNav } from './nav.js';
import { renderWeek, weekDayAt } from './screens/week.js';
import { mountTransit } from './screens/transit.js';
import { renderWeatherScreen } from './screens/weather.js';
import { mountPomodoro } from './screens/pomodoro.js';
import { mountTelugu } from './screens/telugu.js';
import { startDiag } from './diag.js';
import { clockIsSane } from './time.js';
import { applyShift } from './shift.js';
import { settings } from './content.js';
import { ageText, WEATHER_STALE_MS, CALENDAR_STALE_MS } from './stale.js';

window.__glance = true; // tells the watchdog in index.html that the bundle started

const $ = (id) => document.getElementById(id);
const bootedAt = Date.now();
let events = []; // Google calendar occurrences, refreshed every 10 minutes
let eventsAt = 0; // when the oldest calendar's copy arrived
let forecast = null; // { daily, hourly, alerts, at } from weather.gov, refreshed every 30 minutes
let reloadDue = false, lastServerCheck = 0;

const sheet = mountSheet($('sheet'), () => events);
const transit = mountTransit($('transit'));
const setTrainsAsleep = mountTrains($('trains'), transit.trains);
// A phase ending brings the Pomodoro screen back (declared below; cues come a second later at most).
const focus = mountPomodoro($('pomodoro'), () => nav.go('pomodoro'));
const letters = mountTelugu($('telugu'));
const night = mountNight($('night'), setTrainsAsleep, () => focus.busy() || letters.busy());
const nextPhoto = startPhotos($('photo'));
const nav = mountNav($('bar'), $('edge'), $('scrim'), {
  home: { el: $('board') },
  week: { el: $('week'), show: () => renderWeek($('week'), new Date(), events) },
  transit: { el: $('transit'), show: transit.show, hide: transit.hide },
  weather: { el: $('weather'), show: () => { const now = new Date(); renderWeatherScreen($('weather'), now, forecast, weatherAge(now)); } },
  pomodoro: { el: $('pomodoro'), show: focus.show, hide: focus.hide, busy: focus.busy },
  telugu: { el: $('telugu'), show: letters.show, hide: letters.hide, busy: letters.busy },
}, sheet);

const weatherNow = (now) => forecast && summarize(forecast.daily, forecast.hourly, now);
// The forecast's age once it's overdue ("3 h old"), or null; none before network time.
const weatherAge = (now) =>
  (forecast && clockIsSane(now, __BUILT_AT__) ? ageText(forecast.at, +now, WEATHER_STALE_MS) : null);

// Is the server (the Mac) answering? A reload while it's asleep would swap a working dashboard
// for the kiosk's "Can't reach the dashboard" screen, so the daily reload waits until it answers.
function serverUp() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  return fetch(location.pathname, { cache: 'no-store', signal: ctrl.signal })
    .then((r) => r.ok, () => false)
    .finally(() => clearTimeout(timer));
}

// Redraws whatever shows the date or the weather. Each tile only touches the DOM when its markup
// changed, so this is cheap to call every minute and on every refresh.
function draw(now) {
  const alerts = forecast && forecast.alerts ? forecast.alerts.filter((a) => !a.ends || a.ends > now) : [];
  renderClock($('clock'), now, weatherNow(now), alerts[0] || null, weatherAge(now));
  if (!clockIsSane(now, __BUILT_AT__)) return;
  renderCalendar($('cal'), now, events, ageText(eventsAt, +now, CALENDAR_STALE_MS));
  if (nav.current() === 'week') renderWeek($('week'), now, events);
  if (nav.current() === 'weather') renderWeatherScreen($('weather'), now, forecast, weatherAge(now));
  focus.update();
}

function tick() {
  const now = new Date();
  draw(now);
  if (!DEMO) applyShift($('board'), now, settings.shift); // demo screenshots stay put
  letters.update(now);
  night.update(now);
  // Daily reload from 3 a.m. clears slow leaks and picks up new content and photos. If the server
  // is asleep it keeps the page running and checks again every 10 minutes.
  if (now.getHours() === 3 && now.getMinutes() === 0 && Date.now() - bootedAt > 3600e3) reloadDue = true;
  if (reloadDue && Date.now() - lastServerCheck > 600e3) {
    lastServerCheck = Date.now();
    serverUp().then((up) => { if (up) location.reload(); });
  }
}

// Align ticks to the start of each minute so the clock never lags.
function schedule() {
  tick();
  setTimeout(schedule, 60000 - (Date.now() % 60000) + 50);
}

// ---- taps on Home
// The clock's time: night now. The rest of the clock tile (the weather): the Weather screen.
$('clock').addEventListener('click', (e) => {
  if (e.target.closest('.clock-time')) night.now();
  else nav.go('weather');
});
// A day on the month grid: that day. Anywhere else on the tile ("Next up"): today.
$('cal').addEventListener('click', (e) => {
  const grid = e.target.closest('.cal-grid');
  if (!grid) { sheet.open(new Date()); return; }
  const box = grid.getBoundingClientRect();
  const day = dayAtGrid(new Date(), box.width, e.clientX - box.left, e.clientY - box.top);
  if (day) sheet.open(day);
});
$('photo').addEventListener('click', () => nextPhoto());
$('trains').addEventListener('click', () => nav.go('transit'));
$('week').addEventListener('click', (e) => {
  const day = weekDayAt(e.target, new Date());
  if (day) sheet.open(day);
});

// Before network time after a power cut the clock reads an old date: draw the calendar anyway once,
// then the tick above redraws it as soon as the real date arrives.
renderCalendar($('cal'), new Date());
schedule();
watchCalendars((list, at) => {
  events = list;
  eventsAt = at;
  draw(new Date());
});
watchWeather((f) => {
  forecast = f;
  draw(new Date());
});
if (DEMO_SCREEN) nav.go(DEMO_SCREEN);
else if (focus.busy()) nav.go('pomodoro'); // a reload or power cut mid-session: back to the timer
startDiag();
