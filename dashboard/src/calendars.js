// Fetches the Google calendars in content.js every 10 minutes and reports their occurrences from
// yesterday to two months out. The Mac's copy asks its /ics?cal=; the frame build asks the kiosk
// app (/ics?url=) with addresses baked in at build time. A calendar that fails keeps its last copy.
import { calendars } from './content.js';
import { parseIcs, occurrences } from './ics.js';
import { addDays, clockIsSane, dayStart } from './time.js';
import { DEMO, demoEvents } from './demo.js';

const POLL_MS = 10 * 60000;

function feedUrl(cal) {
  if (!__FRAME__) return '/ics?cal=' + encodeURIComponent(cal.id);
  const address = __CALENDARS__[cal.id];
  return address ? '/ics?url=' + encodeURIComponent(address) : null;
}

export function watchCalendars(onChange) {
  if (DEMO) { onChange(demoEvents()); return; }
  const latest = {}; // calendar id → occurrences

  function poll() {
    const now = new Date();
    // Expanding repeats needs a real date; until network time arrives, try again shortly.
    if (!clockIsSane(now, __BUILT_AT__)) { setTimeout(poll, 30000); return; }
    setTimeout(poll, POLL_MS);
    const from = addDays(dayStart(now), -1), to = addDays(from, 64);
    Promise.all(calendars.map((cal) => {
      const url = feedUrl(cal);
      if (!url) return null;
      return fetch(url, { cache: 'no-store' })
        .then((r) => (r.ok ? r.text() : ''))
        .then((text) => {
          if (text.indexOf('BEGIN:VCALENDAR') < 0) return;
          latest[cal.id] = occurrences(parseIcs(text), from, to).map((o) =>
            Object.assign(o, { quiet: !!cal.quiet, calendar: cal.name || cal.id, calId: cal.id }));
        }, () => {});
    })).then(() => onChange([].concat.apply([], calendars.map((c) => latest[c.id] || []))));
  }

  poll();
}
