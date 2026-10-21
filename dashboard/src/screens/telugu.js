// Telugu screen: the vowels and consonants as a chart to look up at while writing them on paper.
// Two pages, vowels and consonants; the tabs or a swipe switch between them.
//
// Writing means not touching the frame, so the screen stays up (no going Home, no night clock)
// for content.js `telugu.stayMinutes` after the last touch on it. While it's up it steps a few
// pixels now and then against burn-in (`telugu.shift`), rarely enough not to catch the eye.
import { telugu as cfg } from '../content.js';
import { DEMO } from '../demo.js';
import { applyShift } from '../shift.js';
import { VOWEL_ROWS, VARGAS, OTHER_ROWS } from '../telugu-letters.js';

const SWIPE_PX = 80;

const cell = (l) => '<div class="te-cell"><span class="te-g" lang="te">' + l[0] + '</span><span class="te-r">' + l[1] + '</span></div>';
const rows = (list, cls) => list.map((r) => '<div class="' + cls + '">' + r.map(cell).join('') + '</div>').join('');

const PAGES = {
  vowels: { title: 'Vowels', te: 'అచ్చులు', body: '<div class="te-vowels">' + rows(VOWEL_ROWS, 'te-row') + '</div>' },
  consonants: {
    title: 'Consonants',
    te: 'హల్లులు',
    body: '<div class="te-cons"><div class="te-vargas">' + rows(VARGAS, 'te-row') + '</div>' +
      '<div class="te-others">' + rows(OTHER_ROWS, 'te-row') + '</div></div>',
  },
};

export function mountTelugu(el) {
  let page = DEMO && /[?&]consonants(&|$)/.test(location.search) ? 'consonants' : 'vowels';
  let shown = false, touchedAt = 0, from = null;

  el.innerHTML = Object.keys(PAGES).map((name) => {
    const p = PAGES[name];
    return '<section class="te-page" data-page="' + name + '">' +
      '<header class="screen-head"><h1 class="serif">' + p.title + '<i>,</i></h1><span class="te-word" lang="te">' + p.te + '</span>' +
      '<span class="te-tabs">' + Object.keys(PAGES).map((n) =>
        '<button class="te-tab' + (n === name ? ' is-on' : '') + '" data-go="' + n + '">' + PAGES[n].title + '</button>').join('') +
      '</span></header>' + p.body + '</section>';
  }).join('');

  function turn(name) {
    page = name;
    Array.prototype.forEach.call(el.children, (s) => { s.hidden = s.getAttribute('data-page') !== page; });
  }
  turn(page);

  el.addEventListener('pointerdown', (e) => { touchedAt = Date.now(); from = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointerup', (e) => {
    if (!from) return;
    const dx = e.clientX - from.x, dy = e.clientY - from.y;
    from = null;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) turn(dx < 0 ? 'consonants' : 'vowels');
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) turn(b.getAttribute('data-go'));
  });

  return {
    show() { shown = true; touchedAt = Date.now(); applyShift(el, new Date(), DEMO ? null : cfg.shift); },
    hide() { shown = false; },
    // Practising: stay up until stayMinutes have passed without a touch here.
    busy: () => shown && Date.now() - touchedAt < cfg.stayMinutes * 60000,
    update(now) { if (shown && !DEMO) applyShift(el, now, cfg.shift); },
  };
}
