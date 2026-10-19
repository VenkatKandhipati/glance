// Week screen: the next seven days in columns, every calendar included (quiet ones too, muted,
// after yours). Something that spans several days shows once, on its first day in view, with
// when it ends. A column shows what fits; a tap on it opens that day in full (the day sheet).
import { dates } from '../content.js';
import { eventsOn, colorClass } from '../agenda.js';
import { timeText } from '../tiles/calendar.js';
import { DAYS, MONTHS, addDays, dayStart, daysBetween, esc } from '../time.js';

const FIT = 8; // items per column before "+3 more"

const lastDay = (e) => (e.allDay ? addDays(e.end, -1) : e.end);

function item(e, day) {
  let when = e.allDay ? '' : timeText(e.start);
  if (e.allDay && lastDay(e) > day) {
    const end = lastDay(e);
    when = 'to ' + (daysBetween(day, end) < 7 ? DAYS[end.getDay()].slice(0, 3) : end.getDate() + ' ' + MONTHS[end.getMonth()].slice(0, 3));
  }
  else if (!e.allDay && e.start < day) when = 'until ' + timeText(e.end);
  when = when ? '<span class="wk-time">' + when + '</span>' : '';
  return '<div class="wk-ev ' + colorClass(e) + (e.allDay ? ' is-allday' : '') + '">' + when +
    '<span class="wk-title">' + esc(e.title) + '</span></div>';
}

export function renderWeek(el, now, events) {
  const today = dayStart(now), last = addDays(today, 6);
  const range = today.getMonth() === last.getMonth()
    ? today.getDate() + ' – ' + last.getDate() + ' ' + MONTHS[today.getMonth()]
    : today.getDate() + ' ' + MONTHS[today.getMonth()].slice(0, 3) + ' – ' + last.getDate() + ' ' + MONTHS[last.getMonth()].slice(0, 3);
  let cols = '';
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i);
    // Multi-day all-day items only where they start, or in the first column if already under way.
    const list = eventsOn(events, dates, day).filter((e) => !e.allDay || i === 0 || e.start >= day);
    const shown = list.length > FIT ? list.slice(0, FIT - 1) : list;
    cols += '<button class="wk-day' + (i === 0 ? ' is-today' : '') + '" data-day="' + i + '">' +
      '<span class="wk-dow">' + (i === 0 ? 'Today' : DAYS[day.getDay()].slice(0, 3)) + '</span>' +
      '<span class="wk-date serif">' + day.getDate() + '</span>' +
      '<span class="wk-list">' + (shown.length ? shown.map((e) => item(e, day)).join('') : '<span class="wk-free">Free</span>') +
      (list.length > shown.length ? '<span class="wk-more">+' + (list.length - shown.length) + ' more</span>' : '') +
      '</span></button>';
  }
  const html = '<header class="screen-head"><h1 class="serif">This week<i>,</i></h1><span>' + range + '</span></header>' +
    '<div class="wk-cols">' + cols + '</div>';
  if (el.__html !== html) el.innerHTML = el.__html = html;
}

// The day a tap in the week landed on, or null.
export function weekDayAt(target, now) {
  const col = target.closest && target.closest('[data-day]');
  return col ? addDays(dayStart(now), Number(col.getAttribute('data-day'))) : null;
}
