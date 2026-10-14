import './style.css';
import { renderClock } from './tiles/clock.js';
import { renderCalendar } from './tiles/calendar.js';
import { startPhotos } from './tiles/photo.js';
import { mountChores } from './tiles/chores.js';
import { mountNight } from './night.js';
import { startDiag } from './diag.js';
import { dayKey, clockIsSane } from './time.js';

window.__glance = true; // tells the watchdog in index.html that the bundle started

const $ = (id) => document.getElementById(id);
const updateChores = mountChores($('chores'));
const updateNight = mountNight($('night'));
const bootedAt = Date.now();
let lastDay = '';
let reloadDue = false, lastServerCheck = 0;

// Is the server (the Mac) answering? A reload while it's asleep would swap a working dashboard
// for the kiosk's "Can't reach the dashboard" screen, so the daily reload waits until it answers.
function serverUp() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  return fetch(location.pathname, { cache: 'no-store', signal: ctrl.signal })
    .then((r) => r.ok, () => false)
    .finally(() => clearTimeout(timer));
}

// Once a minute: the clock text always; the calendar and chores only when the day changes.
function tick() {
  const now = new Date();
  renderClock($('clock'), now);
  updateNight(now);
  const day = dayKey(now);
  if (day !== lastDay && clockIsSane(now)) {
    lastDay = day;
    renderCalendar($('cal'), now);
  }
  updateChores(now);
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

// Before network time after a power cut the clock may read 1970: draw the calendar anyway once,
// then the day check above redraws it as soon as the real date arrives.
renderCalendar($('cal'), new Date());
schedule();
startPhotos($('photo'));
startDiag();
