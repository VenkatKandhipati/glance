// Night: once nobody has touched the screen for a while, a dim red clock on black in the evening
// (settings.night.clock until .off), then the screen fully off until morning (.off until .on).
// A tap brings the dashboard back; it goes again after the same idle time. The clock drifts a
// little against burn-in. The kiosk app turns the backlight off (GlanceKiosk.setScreenOn); without
// it, as in a desktop browser, "off" is just black.
// onShow(true/false) hears when night comes and goes, so live tiles can stop asking meanwhile.
// busy() true (the Pomodoro timer running, or the Telugu screen in use) holds night off until
// it's done.
import { settings } from './content.js';
import { DAYS, MONTHS, clockIsSane, clockParts } from './time.js';

// Within [from, to) on a 24 h clock, across midnight if need be.
const within = (h, from, to) => (from > to ? h >= from || h < to : h >= from && h < to);

// 'clock', 'off' or null for the hour `now` falls in.
export function nightMode(now, cfg) {
  const h = now.getHours();
  if (within(h, cfg.off, cfg.on)) return 'off';
  if (within(h, cfg.clock, cfg.off)) return 'clock';
  return null;
}

function setScreenOn(on) {
  try {
    if (window.GlanceKiosk) window.GlanceKiosk.setScreenOn(on);
  } catch (e) { /* not in the kiosk, or an older one */ }
}

export function mountNight(el, onShow, busy) {
  const cfg = settings.night;
  let idle = 0, mode = null, forced = false;

  el.innerHTML = '<div class="night-inner"><div class="night-time serif"></div><div class="night-date"></div></div>';
  const inner = el.firstChild, time = inner.children[0], date = inner.children[1];

  function paint(now) {
    const p = clockParts(now);
    time.innerHTML = p.time + '<i>' + p.ampm + '</i>';
    date.textContent = DAYS[now.getDay()] + ' · ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
  }

  function show(next) {
    const was = mode;
    mode = next;
    el.classList.toggle('is-off', next === 'off');
    if (next === 'clock') paint(new Date());
    el.hidden = false;
    setScreenOn(next !== 'off');
    if (!was) onShow(true);
  }

  function hide() {
    if (!mode) return;
    mode = null;
    forced = false;
    el.hidden = true;
    setScreenOn(true);
    onShow(false);
  }

  // Any touch counts as activity. Night is dismissed on click, not pointerdown: hiding it earlier
  // would let the same tap's click land on whatever is underneath.
  document.addEventListener('pointerdown', () => { idle = 0; }, true);
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    idle = 0;
    hide();
  });

  setInterval(() => {
    idle++;
    const now = new Date();
    // Before network time after a power cut the hour means nothing; stay on the dashboard.
    const want = clockIsSane(now, __BUILT_AT__) ? nightMode(now, cfg) : null;
    if (!mode && want && idle >= cfg.idleSeconds && !busy()) show(want);
    else if (mode && want && want !== mode) show(want);       // midnight: clock → off
    else if (mode && !want && !forced) hide();                // morning: back on its own
  }, 1000);

  // A power cut or the 3 a.m. reload during the off hours: stay dark rather than light the room.
  // Otherwise make sure the backlight is on, in case the page went away while it was off.
  const now = new Date();
  if (clockIsSane(now, __BUILT_AT__) && nightMode(now, cfg) === 'off' && !busy()) show('off');
  else setScreenOn(true);

  return {
    // Called every minute.
    update(now) {
      if (mode !== 'clock') return;
      paint(now);
      if (now.getMinutes() % 5 === 0) {
        const x = Math.round(Math.random() * 120 - 60), y = Math.round(Math.random() * 80 - 40);
        inner.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      }
    },
    // A tap on the clock: night now, until the next tap. The off hours turn the screen off.
    now() {
      forced = true;
      show(nightMode(new Date(), cfg) === 'off' ? 'off' : 'clock');
    },
  };
}
