// One day's events, for the day sheet and the week screen. Kept free of the DOM so it can be unit
// tested.
import { calendars } from './content.js';
import { datesIn, timeText } from './tiles/calendar.js';
import { addDays, dayStart, daysBetween } from './time.js';

// Everything on `day`: calendar events that touch it (a trip that spans it, a call that runs past
// midnight) and content.js's marked dates. Quiet calendars last; otherwise all-day items first,
// then by start time.
export function eventsOn(events, list, day) {
  const from = dayStart(day), to = addDays(from, 1);
  const out = events.filter((e) => e.start < to && (e.end > from || e.start >= from));
  datesIn(list, from.getFullYear()).forEach((d) => {
    if (+d.day === +from) out.push({ title: d.title, start: from, end: to, allDay: true, calendar: '', calId: '' });
  });
  return out.sort((a, b) => (a.quiet ? 1 : 0) - (b.quiet ? 1 : 0) || (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) ||
    a.start - b.start || (a.title < b.title ? -1 : 1));
}

// "All day", "All day · 2 of 5" for a trip, "9:30 am – 10:30 am", or "Until 1 am" for the end of
// something that began the day before.
export function rangeText(e, day) {
  const from = dayStart(day);
  if (e.allDay) {
    const days = daysBetween(e.start, e.end);
    return days > 1 ? 'All day · ' + (daysBetween(e.start, from) + 1) + ' of ' + days : 'All day';
  }
  if (e.start < from) return 'Until ' + timeText(e.end);
  return +e.end > +e.start ? timeText(e.start) + ' – ' + timeText(e.end) : timeText(e.start);
}

// Colour class for an event: by its calendar's place in content.js, quiet calendars muted.
export function colorClass(e) {
  if (e.quiet) return 'ev-quiet';
  const i = calendars.findIndex((c) => c.id === e.calId);
  return 'ev-c' + (i < 0 ? 0 : i % 4);
}
