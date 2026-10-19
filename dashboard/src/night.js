// Night clock: a dim red clock on black during the night window once nobody has touched the
// screen for a while. A tap brings the dashboard back. The clock drifts a little against burn-in.
// onShow(true/false) hears when it comes up and goes away, so live tiles can stop asking meanwhile.
import { settings } from './content.js';
import { DAYS, MONTHS, clockParts } from './time.js';

export function mountNight(el, onShow) {
  const cfg = settings.night;
  let idle = 0;

  el.innerHTML = '<div class="night-inner"><div class="night-time serif"></div><div class="night-date"></div></div>';
  const inner = el.firstChild, time = inner.children[0], date = inner.children[1];

  function inWindow(now) {
    const h = now.getHours();
    return cfg.from > cfg.to ? h >= cfg.from || h < cfg.to : h >= cfg.from && h < cfg.to;
  }

  function paint(now) {
    const p = clockParts(now);
    time.innerHTML = p.time + '<i>' + p.ampm + '</i>';
    date.textContent = DAYS[now.getDay()] + ' · ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
  }

  // Any touch counts as activity. The night clock itself is dismissed on click, not pointerdown:
  // hiding it earlier would let the same tap's click land on whatever is underneath.
  document.addEventListener('pointerdown', () => { idle = 0; }, true);
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    idle = 0;
    el.hidden = true;
    onShow(false);
  });

  setInterval(() => {
    idle++;
    const now = new Date();
    if (el.hidden && idle >= cfg.idleSeconds && inWindow(now)) {
      paint(now);
      el.hidden = false;
      onShow(true);
    } else if (!el.hidden && !inWindow(now)) {
      el.hidden = true; // morning: back to the dashboard on its own
      onShow(false);
    }
  }, 1000);

  // Called every minute.
  return function update(now) {
    if (el.hidden) return;
    paint(now);
    if (now.getMinutes() % 5 === 0) {
      const x = Math.round(Math.random() * 120 - 60), y = Math.round(Math.random() * 80 - 40);
      inner.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
  };
}
