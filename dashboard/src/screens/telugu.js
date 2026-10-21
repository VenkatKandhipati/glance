// Telugu screen: the vowels and consonants as a chart to look up at while writing them on paper.
// Three pages, the vowels and the consonants over two; the tabs or a swipe move between them.
// The second consonant page has room to spare, so its last eight letters, the hardest to say, each
// get a common word beside them.
//
// Writing means not touching the frame, so the screen stays up (no going Home, no night clock)
// for content.js `telugu.stayMinutes` after the last touch on it. While it's up it steps a few
// pixels now and then against burn-in (`telugu.shift`), rarely enough not to catch the eye.
import { telugu as cfg } from '../content.js';
import { DEMO } from '../demo.js';
import { applyShift } from '../shift.js';
import { VOWEL_ROWS, CONSONANT_PAGES, WORDS } from '../telugu-letters.js';

const SWIPE_PX = 80;
const FONT = 'Noto Sans Telugu';

// A word beside the letter, where there is one: the word, its romanization with the letter's
// sound in gold, and what it means.
const word = (w) => !w ? '' : '<span class="te-ex"><span class="te-ex-w" lang="te">' + w[0] + '</span>' +
  '<span class="te-ex-r">' + w[1].replace(/\*([^*]+)\*/, '<b>$1</b>') + '</span><span class="te-ex-m">' + w[2] + '</span></span>';
const cell = (l) => '<div class="te-cell' + (WORDS[l[0]] ? ' has-ex' : '') + '"><span class="te-main"><span class="te-box"><span class="te-g" lang="te">' + l[0] +
  '</span></span><span class="te-r">' + l[1] + '</span></span>' + word(WORDS[l[0]]) + '</div>';
const rows = (list) => list.map((r) => '<div class="te-row">' + r.map(cell).join('') + '</div>').join('');

const PAGES = [
  { tab: 'Vowels', title: 'Vowels', te: 'అచ్చులు', cls: 'te-vowels', rows: VOWEL_ROWS },
  { tab: 'Consonants 1', title: 'Consonants', te: 'హల్లులు', cls: 'te-cons', rows: CONSONANT_PAGES[0] },
  { tab: 'Consonants 2', title: 'Consonants', te: 'హల్లులు', cls: 'te-cons te-words', rows: CONSONANT_PAGES[1] },
];

// Letters sit very differently in their em box (a mark above, a tail below, a wide or narrow
// body), so each one is moved until its ink is centred: the same space above and below, left and
// right. Measured once, in em, from the font itself.
function centreInk(el) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = '100px "' + FONT + '"';
  Array.prototype.forEach.call(el.querySelectorAll('.te-g'), (g) => {
    const m = ctx.measureText(g.textContent);
    const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
    if (!asc || !m.width) return; // no metrics in this browser: leave it on the baseline
    const baseline = (100 - asc - desc) / 2 + asc; // in a line-height: 1 box
    const dy = 50 - (baseline + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2);
    const dx = m.width / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    g.style.transform = 'translate(' + (dx / 100).toFixed(3) + 'em,' + (dy / 100).toFixed(3) + 'em)';
  });
}

export function mountTelugu(el) {
  let page = DEMO ? Math.max(0, Number(new URLSearchParams(location.search).get('page')) || 0) % PAGES.length : 0;
  let shown = false, touchedAt = 0, from = null;

  el.innerHTML = PAGES.map((p, i) =>
    '<section class="te-page" data-page="' + i + '">' +
      '<header class="screen-head"><h1 class="serif">' + p.title + '<i>,</i></h1><span class="te-word" lang="te">' + p.te + '</span>' +
      '<span class="te-tabs">' + PAGES.map((q, j) =>
        '<button class="te-tab' + (j === i ? ' is-on' : '') + '" data-go="' + j + '">' + q.tab + '</button>').join('') +
      '</span></header><div class="te-grid ' + p.cls + '">' + rows(p.rows) + '</div></section>').join('');

  function turn(i) {
    page = Math.max(0, Math.min(PAGES.length - 1, i));
    Array.prototype.forEach.call(el.children, (s) => { s.hidden = Number(s.getAttribute('data-page')) !== page; });
  }
  turn(page);
  try { document.fonts.load('100px "' + FONT + '"', 'అ').then(() => centreInk(el), () => {}); } catch (e) { /* no FontFace API */ }

  el.addEventListener('pointerdown', (e) => { touchedAt = Date.now(); from = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointerup', (e) => {
    if (!from) return;
    const dx = e.clientX - from.x, dy = e.clientY - from.y;
    from = null;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) turn(page + (dx < 0 ? 1 : -1));
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) turn(Number(b.getAttribute('data-go')));
  });

  return {
    show() { shown = true; touchedAt = Date.now(); applyShift(el, new Date(), DEMO ? null : cfg.shift); },
    hide() { shown = false; },
    // Practising: stay up until stayMinutes have passed without a touch here.
    busy: () => shown && Date.now() - touchedAt < cfg.stayMinutes * 60000,
    update(now) { if (shown && !DEMO) applyShift(el, now, cfg.shift); },
  };
}
