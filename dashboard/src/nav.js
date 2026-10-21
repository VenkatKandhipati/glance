// Screens and the side bar. The bar stays hidden until a tap on the left edge; it slides in over
// the screen, and goes again after a few seconds, on a choice, or on a tap anywhere else. Any
// screen but Home goes back to Home after two minutes with no touch, and the day sheet closes;
// a screen whose busy() says so (a Pomodoro running) stays.
const BAR_MS = 6000;
const HOME_MS = 2 * 60000;

const svg = (body) => '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
const ICONS = {
  home: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  week: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>'),
  transit: svg('<rect x="5" y="3" width="14" height="14" rx="4"/><path d="M5 11h14M9 14h.01M15 14h.01M8 21l2-4M16 21l-2-4"/>'),
  weather: svg('<path d="M8 3v1.5M3.5 8H5M4.8 4.8l1 1M12.2 4.8l-1 1"/><path d="M5.6 11.5a3.5 3.5 0 0 1 6-4"/><path d="M9 20h8a3.2 3.2 0 0 0 .4-6.4 4.4 4.4 0 0 0-8.5 1.2A2.6 2.6 0 0 0 9 20z"/>'),
  pomodoro: svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5M12 2.5V6"/>'),
  telugu: '<span class="bar-te" lang="te">అ</span>',
};
const LABELS = { home: 'Home', week: 'Week', transit: 'Transit', weather: 'Weather', pomodoro: 'Time', telugu: 'Telugu' };

// screens: { name: { el, show?(), hide?(), busy?() } }, Home first. sheet: the day sheet.
export function mountNav(bar, edge, scrim, screens, sheet) {
  const names = Object.keys(screens);
  let current = names[0], lastTouch = Date.now(), barOpenedAt = 0;

  bar.innerHTML = names.map((n) =>
    '<button class="bar-btn" data-screen="' + n + '">' + ICONS[n] + '<span>' + LABELS[n] + '</span></button>').join('');

  function mark() {
    Array.prototype.forEach.call(bar.children, (b) => b.classList.toggle('is-on', b.getAttribute('data-screen') === current));
  }

  function openBar() { mark(); bar.classList.add('is-open'); scrim.hidden = false; barOpenedAt = Date.now(); }
  function closeBar() { bar.classList.remove('is-open'); scrim.hidden = true; }

  function go(name) {
    if (!screens[name]) return;
    sheet.close();
    if (name !== current) {
      const was = screens[current];
      if (was.hide) was.hide();
      was.el.hidden = true;
      current = name;
      screens[name].el.hidden = false;
      if (screens[name].show) screens[name].show();
    }
    closeBar();
  }

  edge.addEventListener('click', openBar);
  scrim.addEventListener('click', closeBar);
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-screen]');
    if (b) go(b.getAttribute('data-screen'));
  });

  document.addEventListener('pointerdown', () => { lastTouch = Date.now(); }, true);
  setInterval(() => {
    const idle = Date.now() - lastTouch;
    if (bar.classList.contains('is-open') && Date.now() - barOpenedAt > BAR_MS && idle > BAR_MS) closeBar();
    if (idle > HOME_MS) {
      if (sheet.isOpen()) sheet.close();
      if (current !== names[0] && !(screens[current].busy && screens[current].busy())) go(names[0]);
    }
  }, 1000);

  return { go, current: () => current };
}
