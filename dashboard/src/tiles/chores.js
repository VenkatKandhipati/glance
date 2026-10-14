// Chores strip: tap to tick. Ticks live in localStorage for the current day only.
import { chores } from '../content.js';
import { dayKey, esc } from '../time.js';

const KEY = 'glance-chores';
const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// Storage can be missing or throw (private mode, cleared data); the strip still works for the session.
function load(today) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.day === today) return saved.done;
  } catch (e) { /* fall through */ }
  return [];
}
function save(today, done) {
  try { localStorage.setItem(KEY, JSON.stringify({ day: today, done })); } catch (e) { /* ignore */ }
}

export function mountChores(el) {
  let today = '', done = [];

  function render() {
    const left = chores.filter((c) => done.indexOf(c.id) === -1).length;
    const title = left === 0 ? 'All done today' : left + ' left today';
    el.innerHTML =
      '<div class="chores-title"><b>Chores,</b>' + title + '</div>' +
      '<div class="chores-list">' + chores.map((c) => {
        const on = done.indexOf(c.id) > -1;
        return '<button class="chip chore' + (on ? ' is-done' : '') + '" data-id="' + esc(c.id) + '">' +
          '<span class="chore-box">' + (on ? CHECK : '') + '</span>' +
          '<span class="chore-name">' + esc(c.title) + '</span></button>';
      }).join('') + '</div>';
  }

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.chore');
    if (!btn) return;
    const id = btn.dataset.id, at = done.indexOf(id);
    if (at > -1) done.splice(at, 1); else done.push(id);
    save(today, done);
    render();
  });

  // Called every minute; resets the ticks when the day changes.
  return function update(now) {
    const key = dayKey(now);
    if (key === today) return;
    today = key;
    done = load(today);
    render();
  };
}
