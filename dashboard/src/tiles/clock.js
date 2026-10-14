// Clock tile: date pill, time, greeting. Redrawn once a minute.
import { DAYS, MONTHS, clockParts, greeting } from '../time.js';

const CAL_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';

export function renderClock(el, now) {
  const { time, ampm } = clockParts(now);
  el.innerHTML =
    '<span class="chip"><span class="chip-icon">' + CAL_ICON + '</span>' +
    DAYS[now.getDay()] + ' · ' + now.getDate() + ' ' + MONTHS[now.getMonth()] + '</span>' +
    '<div class="clock-time serif">' + time + '<span class="clock-ampm">' + ampm + '</span></div>' +
    '<div class="clock-greet serif"><b>' + greeting(now) + '</b>Here’s your day.</div>';
}
