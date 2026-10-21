// Clock tile: date pill, weather pill (the temperature now), time, greeting with the weather.
// During a weather warning the pill turns red with a warning sign and the greeting's second line
// names it ("Heat Advisory."); the Weather screen has the rest. Redrawn once a minute.
import { DAYS, MONTHS, clockParts, esc, greeting } from '../time.js';
import { weatherLine } from './weather-data.js';

const svg = (body, size) => '<svg width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
const CAL_ICON = svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', 16);

const CLOUD = '<path d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z"/>';
const SMALL_CLOUD = '<path d="M9 20h8a3.2 3.2 0 0 0 .4-6.4 4.4 4.4 0 0 0-8.5 1.2A2.6 2.6 0 0 0 9 20z"/>';
// Also used by the weather screen, drawn larger there.
export const ICONS = {
  sun: svg('<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  'sun-cloud': svg('<path d="M8 3v1.5M3.5 8H5M4.8 4.8l1 1M12.2 4.8l-1 1"/><path d="M5.6 11.5a3.5 3.5 0 0 1 6-4"/>' + SMALL_CLOUD),
  'moon-cloud': svg('<path d="M12.5 7.5A4.5 4.5 0 0 1 6 3a5 5 0 0 0-.5 8.6"/>' + SMALL_CLOUD),
  cloud: svg(CLOUD),
  rain: svg('<path d="M7 15h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>'),
  storm: svg('<path d="M7 15h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 15z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>'),
  snow: svg('<path d="M7 15h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 15z"/><path d="M8 19h.01M12 21h.01M16 19h.01"/>'),
  fog: svg('<path d="M4 9h16M4 13h16M6 17h12"/>'),
  wind: svg('<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3"/>'),
};

export const WARNING = svg('<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5h.01"/>');

// stale: "3 h old" when the forecast couldn't be refreshed, else null.
function weatherChip(w, alert, stale) {
  return '<span class="chip' + (alert ? ' chip-alert' : '') + (stale ? ' chip-stale' : '') + '"><span class="chip-icon chip-icon-wx">' +
    (alert ? WARNING : ICONS[w.icon] || ICONS.cloud) + '</span>' + w.temp + '°' +
    (stale ? '<span class="chip-age">' + stale + '</span>' : '') + '</span>';
}

function secondLine(w, alert) {
  if (alert) return '<span class="clock-alert">' + esc(alert.event) + '.</span>';
  return w ? weatherLine(w) : 'Here’s your day.';
}

// w: summarize()'s weather, or null while there's none to show. alert: the most severe active
// weather alert, or null. stale: the forecast's age once it's overdue, or null.
export function renderClock(el, now, w, alert, stale) {
  const { time, ampm } = clockParts(now);
  el.innerHTML =
    '<div class="clock-chips"><span class="chip"><span class="chip-icon">' + CAL_ICON + '</span>' +
    DAYS[now.getDay()] + ' · ' + now.getDate() + ' ' + MONTHS[now.getMonth()] + '</span>' + (w ? weatherChip(w, alert, stale) : '') + '</div>' +
    '<div class="clock-time serif">' + time + '<span class="clock-ampm">' + ampm + '</span></div>' +
    '<div class="clock-greet serif"><b>' + greeting(now) + '</b>' + secondLine(w, alert) + '</div>';
}
