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
  // Daily reload at 3 a.m. clears slow leaks and picks up new content and photos.
  if (now.getHours() === 3 && now.getMinutes() === 0 && Date.now() - bootedAt > 3600e3) location.reload();
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
