// Day sheet: one day's events in full, over whatever screen is showing. Opened by a tap on a
// calendar day, on "Next up" or on a week column. Big ‹ › buttons step through days, which also
// makes up for a tap that lands a row off (the frame's touch reads low; docs/frame.md).
import { dates } from './content.js';
import { eventsOn, rangeText, colorClass } from './agenda.js';
import { DAYS, MONTHS, addDays, dayStart, daysBetween, esc } from './time.js';

const ARROW = (d) => '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';

export function mountSheet(el, getEvents) {
  let day = null;

  function render() {
    const now = new Date();
    const n = daysBetween(now, day);
    const label = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : DAYS[day.getDay()];
    const list = eventsOn(getEvents(), dates, day);
    const rows = list.length ? list.map((e) =>
      '<li class="sh-ev ' + colorClass(e) + '"><span class="sh-when">' + rangeText(e, day) + '</span>' +
      '<span class="sh-title">' + esc(e.title) + (e.calendar && e.quiet ? '<small>' + esc(e.calendar) + '</small>' : '') + '</span></li>').join('')
      : '<li class="sh-free">Nothing on the calendar.</li>';
    el.innerHTML =
      '<div class="sh-panel">' +
      '<header class="sh-head"><button class="sh-step" data-step="-1" aria-label="Previous day">' + ARROW('M15 5l-7 7 7 7') + '</button>' +
      '<div class="sh-day"><b class="serif">' + label + '<i>,</i></b><span>' + (n >= -1 && n <= 1 ? DAYS[day.getDay()] + ' ' : '') +
      day.getDate() + ' ' + MONTHS[day.getMonth()] + '</span></div>' +
      '<button class="sh-step" data-step="1" aria-label="Next day">' + ARROW('M9 5l7 7-7 7') + '</button></header>' +
      '<ul class="sh-list">' + rows + '</ul></div>';
  }

  el.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    if (step) { day = addDays(day, Number(step.getAttribute('data-step'))); render(); return; }
    if (!e.target.closest('.sh-panel')) close(); // a tap outside the panel
  });

  function close() {
    el.hidden = true;
    day = null;
  }

  return {
    open(d) { day = dayStart(d); render(); el.hidden = false; },
    close,
    isOpen: () => !el.hidden,
  };
}
