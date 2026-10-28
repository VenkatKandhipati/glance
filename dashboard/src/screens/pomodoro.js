// Time screen (side bar: Time): what you're doing at the desk. On the left, the timer: tap a
// category to track it (another switches, Stop ends it), or start a Pomodoro (content.js `time`:
// 45 minutes of deep work, then a 15-minute break). On the right, the insights, all counted
// against tracked time at the desk: today, the streak, all time, the last 7 days, today's
// timeline and time by category. The last 7 days are stacked bars by category or, a swipe away, a
// row per focus category and a column per day; the view last left is kept. A tap on a day, in
// either, puts its breakdown in place of time by category. Above either view, and in the
// timer's note while nothing runs, the `balance` category furthest behind: what to start with.
// A tap on today's strip opens today's timeline in place of the insights: every block and gap,
// the share of the day tracked, as a bar with the day listed or, a swipe away, a column.
//
// The timer is kept as timestamps (pomodoro-data.js), so a reload or a power cut picks it up where
// it was. While a Pomodoro runs, the frame stays on this screen and night waits (main.js asks
// busy()); while tracking it stays on this screen too (stay()), but night comes as usual, and the
// tracker stops by itself at the last touch once nobody has touched the frame for `autoStopHours`.
// Every number is about focus: the focus categories' time, a full Pomodoro counting as an hour
// with its break. Tracking doom scrolling or a break chimes and flashes every 10 minutes.
// The day's goal is hours of focus: a full Pomodoro counts as an hour, its break included. Each Pomodoro phase ends with a chime and a gold
// pulse, and brings this screen back if you'd left it. When the work ends the screen asks what's
// next (Start break, Keep working, Done for now) and with no answer in 15 seconds goes to Ready.
// The log lives in localStorage and, in the kiosk, in a backup file that adb can pull (both still named for the Pomodoro screen it grew from):
//   adb pull /sdcard/Android/data/app.glance.kiosk/files/pomodoro.json
import { time as cfg, settings } from '../content.js';
import { DEMO, demoPomodoro } from '../demo.js';
import { DAYS, addDays, esc } from '../time.js';
import { timeText } from '../tiles/calendar.js';
import * as P from '../pomodoro-data.js';

const KEY = 'glance-pomodoro';
const VIEW_KEY = 'glance-time-week'; // which view of the last 7 days: 'grid' or 'bars'
const SWIPE_PX = 80;
const FILE = 'pomodoro.json';
const CONFIRM_MS = 4000;
const RING = 2 * Math.PI * 138; // the arc's circumference, in its 300 × 300 viewBox
const HOUR = 3600e3;
const AUTO_MS = (cfg.autoStopHours || 0) * HOUR;
const TOUCH_SAVE_MS = 60000; // while tracking, the last touch is saved at most this often
const DAY_MS = 60000; // a tapped day's breakdown closes after this long with no touch on the screen
const RECENT_DAYS = 3; // "1 h in 3 days" beside the category to start with
const TL_KEY = 'glance-time-today'; // which view of today's timeline: 'bar' or 'column'
const GAP_MIN = 5; // gaps this long are drawn and listed on the timeline; shorter ones still count
const LIST_MAX = 20; // rows in the timeline's list, two columns of 10
const BAR_PX = 676, COL_PX = 500; // the timeline's bar width and column height

const cats = cfg.categories;
const known = {}, focusIds = {};
cats.forEach((c) => { known[c.id] = true; if (c.focus) focusIds[c.id] = true; });
// Focus: a focus category, or a Pomodoro in a category since removed from the list.
const isFocus = (s) => !!focusIds[s.cat] || (!known[s.cat] && s.kind !== 'track');
// The week's rows: the categories to balance first, then the other focus ones, in content.js order.
const balance = cats.filter((c) => c.balance);
const rowIds = balance.concat(cats.filter((c) => c.focus && !c.balance)).map((c) => c.id);
const kClass = (id) => { const i = cats.findIndex((c) => c.id === id); return 'pm-k' + (i >= 0 ? i : 8); };
const catName = (id) => { const c = cats.find((x) => x.id === id); return c ? c.name : id || 'Other'; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); const m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };
// Elapsed time counting up: 12:05, then 1:02:10.
const upText = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s % 60;
  return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (r < 10 ? '0' : '') + r;
};
const pct = (part, whole) => Math.round(part / whole * 100) + '%';
// Hours of focus: 3, or 2.5 to a tenth under 10 hours; 143 above.
const hoursOf = (mins) => String(mins < 600 ? Math.round(mins / 6) / 10 : Math.round(mins / 60));
const REMIND = cfg.remind || { categories: [], minutes: 0 };
const hourLabel = (h) => (h % 12 || 12) + (h % 24 < 12 ? ' am' : ' pm');
// A day's minutes in a cell: 45 m, then hours to a tenth (1.8 h).
const cellText = (m) => (m >= 60 ? hoursOf(m) + ' h' : m + ' m');

// Why a category is next (P.nextFocus): "none in 7 days", "not since yesterday", "not since
// Thursday"; a daily one part done today, "10 m of 15 today". `long` adds its minutes lately.
function whyText(next, now, long) {
  const c = cats.find((x) => x.id === next.cat) || {};
  if (c.daily && next.today) return next.today + ' m of ' + c.daily + ' today';
  const why = next.since === null ? 'none in 7 days'
    : next.since === 1 ? 'not since yesterday'
    : 'not since ' + DAYS[addDays(now, -next.since).getDay()];
  return why + (long && next.recent ? ', ' + P.hoursText(next.recent) + ' in ' + RECENT_DAYS + ' days' : '');
}

// ---- storage: localStorage, plus the kiosk's backup file when there is one
function load() {
  if (DEMO) return demoPomodoro();
  let own = null, backup = null;
  try { own = P.unpack(localStorage.getItem(KEY)); } catch (e) { /* blocked */ }
  try { if (window.GlanceFiles) backup = P.unpack(window.GlanceFiles.read(FILE)); } catch (e) { /* older kiosk */ }
  return P.newer(own, backup) || { saved: 0, state: P.IDLE, cat: null, log: [] };
}

function save(data) {
  if (DEMO) return;
  data.saved = Math.max(Date.now(), (data.saved || 0) + 1); // never goes backwards with a wrong clock
  const text = P.pack(data);
  try { localStorage.setItem(KEY, text); } catch (e) { /* full or blocked; the backup still has it */ }
  try { if (window.GlanceFiles) window.GlanceFiles.write(FILE, text); } catch (e) { /* older kiosk */ }
}

// ---- sound: a soft sine chime, made on the spot (the kiosk lets pages play sound without a tap)
let audio = null;
function chime(notes) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    notes.forEach((f, i) => {
      const t = audio.currentTime + i * 0.28, osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 1.5);
    });
  } catch (e) { /* no audio here */ }
}

const SOUNDS = { start: [523.25], 'work-done': [523.25, 659.25, 783.99], 'break-done': [783.99, 659.25], nudge: [659.25, 523.25, 659.25] };

// ---- drawing
function catButtons(on, next) {
  return cats.map((c) =>
    '<button class="pm-cat ' + kClass(c.id) + (c.id === on ? ' is-on' : c.id === next ? ' is-next' : '') + '" data-cat="' + esc(c.id) + '"><i></i>' + esc(c.name) + '</button>').join('');
}

function timerTile(data, now, confirming, dropped, next) {
  const st = data.state, sane = P.clockTrusted(st, now, __BUILT_AT__);
  const last = data.log[data.log.length - 1];
  const startPomodoro = '<button class="pm-btn is-go" data-act="start"' + (sane ? '' : ' disabled') + '>Start ' + cfg.work + ' minutes</button>';
  const stop = (two) => '<button class="pm-btn' + (two && confirming ? ' is-confirm' : '') + '" data-act="stop">' + (two && confirming ? 'Tap again to stop' : 'Stop') + '</button>';
  let phase, note, actions;
  if (st.phase !== 'idle' && !sane) {
    phase = st.phase === 'work' ? 'Deep work' : st.phase === 'ask' ? 'Pomodoro done' : st.phase === 'break' ? 'Break' : 'Tracking';
    note = 'Waiting for the time from the network…';
    actions = st.phase === 'work' ? stop(true) : st.phase === 'track' ? stop(false) : '';
  } else if (st.phase === 'work') {
    phase = 'Deep work';
    note = '<b>' + esc(catName(st.cat)) + '</b>. Tap another to change it.';
    actions = stop(true);
  } else if (st.phase === 'ask') {
    phase = 'Pomodoro done';
    note = last && last.end === st.start
      ? 'Logged ' + P.minutes(last) + ' m of <b>' + esc(catName(last.cat)) + '</b>. A break, or keep going?'
      : 'A break, or keep going?';
    actions = '<button class="pm-btn" data-act="done">Done for now</button><button class="pm-btn" data-act="work">Keep working</button>' +
      '<button class="pm-btn is-go" data-act="break">Start break</button>';
  } else if (st.phase === 'break') {
    phase = 'Break';
    note = last && last.end === st.start
      ? 'Logged ' + P.minutes(last) + ' m of <b>' + esc(catName(last.cat)) + '</b>. Tap another to change it.'
      : 'Stand up, stretch, look far away.';
    actions = '<button class="pm-btn" data-act="skip">End break</button><button class="pm-btn is-go" data-act="start">Start next</button>';
  } else if (st.phase === 'track' && P.nudges(st, now, REMIND.categories, REMIND.minutes)) {
    phase = 'Tracking';
    note = '<b class="pm-nudge">' + Math.floor((now - st.start) / 60000) + ' minutes of ' + esc(catName(st.cat).toLowerCase()) + '.</b> Time to get back to it?';
    actions = stop(false) + startPomodoro;
  } else if (st.phase === 'track') {
    phase = 'Tracking';
    note = '<b>' + esc(catName(st.cat)) + '</b>. Tap another to switch, or make it a Pomodoro.';
    actions = stop(false) + startPomodoro;
  } else {
    phase = 'Ready';
    const a = data.auto;
    note = !sane ? 'Waiting for the time from the network…'
      : a ? 'No touch since ' + timeText(new Date(a.at)) + ', so <b>' + esc(catName(a.cat)) + '</b> stopped there.'
      : dropped ? 'The last session ended while the frame was off, so it wasn\'t logged.'
      : next ? '<b>' + esc(catName(next.cat)) + '</b>: ' + whyText(next, now, true) + '. Start with it today?'
      : 'Tap what you\'re doing to track it. A Pomodoro starts on <b>' + esc(catName(data.cat || cats[0].id)) + '</b>.';
    actions = (a && sane ? '<button class="pm-btn" data-act="keep">Count until ' + timeText(new Date(a.until)) + '</button>' : '') + startPomodoro;
  }
  const on = st.phase === 'idle' ? null : st.cat;
  const ring = st.phase === 'idle' && sane && !data.auto && !dropped && next ? next.cat : null;
  return '<section class="tile pm-timer is-' + st.phase + ' ' + kClass(st.cat) + '"><div class="pm-flash"></div>' +
    '<h2 class="pm-phase">' + phase + '</h2>' +
    '<div class="pm-ring"><svg viewBox="0 0 300 300" width="240" height="240"><circle class="pm-track" cx="150" cy="150" r="138"/>' +
    '<circle class="pm-arc" cx="150" cy="150" r="138" stroke-dasharray="' + RING.toFixed(1) + '" stroke-dashoffset="' + RING.toFixed(1) + '" transform="rotate(-90 150 150)"/></svg>' +
    '<div class="pm-clock"><b class="pm-left serif">' + cfg.work + ':00</b><span class="pm-until"></span></div></div>' +
    '<p class="pm-note">' + note + '</p>' +
    '<div class="pm-cats">' + catButtons(on, ring) + '</div>' +
    '<div class="pm-actions' + (st.phase === 'ask' ? ' is-three' : '') + '">' + actions + '</div></section>';
}

// Today's blocks on a strip from the hour the first began to now, with today by category under it.
function todayTile(view, now, today) {
  const blocks = P.dayBlocks(view, now);
  if (!blocks.length) return '<section class="tile pm-today"><h2>Today at the desk</h2><p class="pm-empty">Nothing tracked yet today.</p></section>';
  const first = new Date(blocks[0].start);
  first.setMinutes(0, 0, 0);
  const from = first.getTime();
  const to = Math.max(Math.ceil(+now / HOUR) * HOUR, from + 4 * HOUR);
  const span = to - from, x = (t) => ((t - from) / span * 100).toFixed(2) + '%';
  const strip = blocks.map((b) => '<i class="' + kClass(b.cat) + (b.live ? ' is-live' : '') + '" style="left:' + x(b.start) +
    ';width:' + ((b.end - b.start) / span * 100).toFixed(2) + '%"></i>').join('');
  const hours = span / HOUR, step = hours <= 6 ? 2 : hours <= 9 ? 3 : 4;
  let ticks = '';
  for (let t = from; t <= to; t += step * HOUR) ticks += '<span style="left:' + x(t) + '">' + hourLabel(new Date(t).getHours()) + '</span>';
  const rows = Object.keys(today.byCat).map((cat) => ({ cat, m: today.byCat[cat] })).sort((a, b) => b.m - a.m).slice(0, 3).map((r) =>
    '<li class="' + kClass(r.cat) + '"><span class="pm-cname"><i></i>' + esc(catName(r.cat)) + '</span><b>' + P.hoursText(r.m) + '</b></li>').join('');
  return '<section class="tile pm-today"><h2>Today at the desk</h2><div class="pm-strip">' + strip + '</div>' +
    '<div class="pm-ticks">' + ticks + '</div><ul class="pm-tlist">' + rows + '</ul></section>';
}

// ---- today's timeline, opened from "Today at the desk": every block and every gap, so the
// untracked time shows. The bar with the day in order under it, or a swipe away, a column like
// the calendar's with the biggest gaps beside it. It starts after the night (settings.night.on):
// a gap from before then is time away, and last night's late blocks are only listed.
const clock = (t) => { const d = new Date(t), h = d.getHours() % 12 || 12, m = d.getMinutes(); return h + ':' + (m < 10 ? '0' : '') + m; };
const msText = (ms) => P.hoursText(Math.round(ms / 60000));
const fits = (px, text) => px >= text.length * 8 + 14; // a label's rough width at 14px

function timelineHtml(view, now) {
  const wake = new Date(now);
  wake.setHours(settings.night.on, 0, 0, 0);
  const tl = P.dayTimeline(P.dayBlocks(view, now), +now, wake.getTime());
  if (!tl.entries.length) return '<h2>Today at the desk</h2><p class="pm-empty">Nothing tracked yet today.</p>';
  let cut = 0; // the first entry after the last time away
  tl.entries.forEach((e, i) => { if (e.kind === 'away') cut = i + 1; });
  const before = tl.entries.slice(0, cut).filter((e) => e.kind === 'block'), day = tl.entries.slice(cut);
  const first = new Date(day[0].start);
  first.setMinutes(0, 0, 0);
  const from = first.getTime(), to = Math.max(Math.ceil(+now / HOUR) * HOUR, from + 4 * HOUR), span = to - from;
  const big = (e) => e.kind === 'gap' && e.end - e.start >= GAP_MIN * 60000;
  const cls = (e) => (e.kind === 'gap' ? 'is-gap' : kClass(e.cat)) + (e.live || (e.kind === 'gap' && e.end === +now) ? ' is-live' : '');

  const share = tl.tracked + tl.untracked ? Math.floor(tl.tracked / (tl.tracked + tl.untracked) * 100) : 100;
  // the dots follow the tile's is-col in CSS, since a swipe changes it without drawing again
  const head = '<h2>Today at the desk<i class="pm-pg is-a"></i><i class="pm-pg is-b"></i><span>Tap to close</span></h2>' +
    '<div class="pm-tl-cov"><b class="serif">' + share + '<i>%</i></b><span>tracked · ' + msText(tl.tracked) + ' at the desk · ' +
    (tl.untracked >= 60000 ? '<em>' + msText(tl.untracked) + ' untracked</em>' : '<em class="is-none">nothing untracked</em>') + '</span></div>';

  // every category today, the most first, then what's untracked
  const by = {};
  tl.entries.forEach((e) => { if (e.kind === 'block') by[e.cat] = (by[e.cat] || 0) + e.end - e.start; });
  const catRows = Object.keys(by).sort((a, b) => by[b] - by[a]).map((id) =>
    '<li class="' + kClass(id) + '"><span class="pm-cname"><i></i>' + esc(catName(id)) + '</span><b>' + msText(by[id]) + '</b></li>').join('') +
    (tl.untracked >= 60000 ? '<li class="is-gap"><span class="pm-cname"><i></i>Untracked</span><b>' + msText(tl.untracked) + '</b></li>' : '');

  // The bar: blocks in their colours, gaps of GAP_MIN or more as outlined holes with their length.
  const bar = day.filter((e) => e.kind === 'block' || big(e)).map((e) => {
    const text = e.kind === 'gap' ? msText(e.end - e.start) : '';
    return '<i class="' + cls(e) + '" style="left:' + ((e.start - from) / span * 100).toFixed(2) + '%;width:' + ((e.end - e.start) / span * 100).toFixed(2) + '%">' +
      (text && fits((e.end - e.start) / span * BAR_PX, text) ? '<span>' + text + '</span>' : '') + '</i>';
  }).join('');
  const hours = span / HOUR, step = hours <= 7 ? 1 : hours <= 14 ? 2 : 3;
  let ticks = '';
  for (let t = from; t <= to; t += step * HOUR) ticks += '<span style="left:' + ((t - from) / span * 100).toFixed(2) + '%">' + hourLabel(new Date(t).getHours()) + '</span>';
  // The day in order: last night's blocks first, then each block and gap; the latest if it's long.
  let rows = before.concat(day.filter((e) => e.kind === 'block' || big(e))).map((e) =>
    '<li class="' + cls(e) + '"><span class="pm-tl-t">' + (e.end <= wake.getTime() ? 'Last night' : clock(e.start) + '–' + (e.end === +now ? 'now' : clock(e.end))) + '</span>' +
    (e.kind === 'gap' ? '<span class="pm-tl-n">Untracked</span>' : '<i></i><span class="pm-tl-n">' + esc(catName(e.cat)) + '</span>') + '<b>' + msText(e.end - e.start) + '</b></li>');
  if (rows.length > LIST_MAX) rows = ['<li class="pm-tl-more">' + (rows.length - LIST_MAX + 1) + ' earlier, on the bar</li>'].concat(rows.slice(rows.length - LIST_MAX + 1));
  const barPane = '<div class="pm-tl-bar">' + bar + '</div><div class="pm-ticks">' + ticks + '</div><ul class="pm-tl-list">' + rows.join('') + '</ul>' +
    '<ul class="pm-tl-cats">' + catRows + '</ul>';

  // The column: an hour a row line, blocks and gaps top to bottom, named where they're tall enough.
  const y = (t) => ((t - from) / span * COL_PX).toFixed(1) + 'px';
  let col = '';
  for (let t = from; t <= to; t += HOUR) col += '<span class="pm-tl-hr" style="top:' + y(t) + '">' + hourLabel(new Date(t).getHours()) + '</span>';
  day.filter((e) => e.kind === 'block' || big(e)).forEach((e) => {
    const px = (e.end - e.start) / span * COL_PX;
    const text = e.kind === 'gap' ? msText(e.end - e.start) + ' untracked' : esc(catName(e.cat)) + ' · ' + clock(e.start) + '–' + (e.end === +now ? 'now' : clock(e.end));
    col += '<i class="' + cls(e) + '" style="top:' + y(e.start) + ';height:' + px.toFixed(1) + 'px">' + (px >= 18 ? '<span>' + text + '</span>' : '') + '</i>';
  });
  const gaps = day.filter(big).sort((a, b) => (b.end - b.start) - (a.end - a.start)).slice(0, 3).map((g) =>
    '<li><b>' + msText(g.end - g.start) + '</b> from ' + clock(g.start) + (g.end === +now ? ', still going' : '') + '</li>').join('');
  const colPane = '<div class="pm-tl-cal"><div class="pm-tl-col" style="height:' + COL_PX + 'px">' + col + '</div><div class="pm-tl-side">' +
    '<h3>Biggest gaps</h3><ul class="pm-tl-gaps">' + (gaps || '<li>None of ' + GAP_MIN + ' minutes or more</li>') + '</ul>' +
    '<h3>By category</h3><ul class="pm-tl-cats">' + catRows + '</ul></div></div>';

  return head + '<div class="pm-tl-track"><div class="pm-tl-pane">' + barPane + '</div><div class="pm-tl-pane">' + colPane + '</div></div>';
}

// Brings drawn nodes in line with new ones, so a minute's change touches only the widths and
// numbers that moved; false when the shape differs and it needs drawing afresh.
function patch(to, from) {
  if (to.nodeName !== from.nodeName) return false;
  if (to.nodeType === 3) { if (to.nodeValue !== from.nodeValue) to.nodeValue = from.nodeValue; return true; }
  if (to.nodeType === 1) {
    if (to.attributes.length !== from.attributes.length) return false;
    for (let i = 0; i < from.attributes.length; i++) {
      const a = from.attributes[i];
      if (to.getAttribute(a.name) !== a.value) to.setAttribute(a.name, a.value);
    }
  }
  return patchKids(to, from);
}

function patchKids(to, from) {
  const a = to.childNodes, b = from.childNodes;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!patch(a[i], b[i])) return false;
  return true;
}

// The last 7 days: a row per focus category with each day's time in it, and each day's focus
// hours under them, gold once they reach the goal. A column is a button for that day's breakdown.
function weekGrid(days, sel, next, head) {
  const goalMin = cfg.goalHours * 60;
  const names = '<li class="pm-wk-names"><span class="pm-wd"></span>' + rowIds.map((id) =>
    '<span class="' + kClass(id) + (next && next.cat === id ? ' is-next' : '') + '"><i></i>' + esc(catName(id)) + '</span>').join('') +
    '<span class="pm-wf">Focus · goal ' + cfg.goalHours + ' h</span></li>';
  const cols = days.map((d, i) => {
    const cells = rowIds.map((id) => {
      const m = d.byCat[id] || 0;
      return '<span class="pm-c ' + kClass(id) + (m ? ' is-on' : '') + '">' + (m ? cellText(m) : '') + '</span>';
    }).join('');
    return '<li data-day="' + i + '" class="' + (i === 6 ? 'is-today' : '') + (i === sel ? ' is-sel' : '') + '">' +
      '<span class="pm-wd">' + (i === 6 ? 'Today' : DAYS[d.day.getDay()].slice(0, 3)) + '</span>' + cells +
      '<span class="pm-wf' + (d.focus >= goalMin ? ' is-met' : '') + '">' + (d.focus ? hoursOf(d.focus) + ' h' : '·') + '</span></li>';
  }).join('');
  return '<h2>Last 7 days at the desk' + dots(1) + head + '</h2><ul class="pm-wk">' + names + cols + '</ul>';
}

// The same days as stacked bars by category, focus at the bottom so the goal line reads against
// them, each day's focus hours above.
function weekBars(days, sel, head) {
  const goalMin = cfg.goalHours * 60;
  const top = Math.max(goalMin * 1.25, Math.max.apply(null, days.map((d) => d.minutes)));
  const order = cats.map((c) => c.id);
  const bars = days.map((d, i) => {
    const ids = Object.keys(d.byCat).sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
    const segs = ids.map((id) => '<i class="' + kClass(id) + '" style="height:' + (d.byCat[id] / top * 100).toFixed(1) + '%"></i>').join('');
    return '<li data-day="' + i + '" class="' + (i === 6 ? 'is-today' : '') + (i === sel ? ' is-sel' : '') + '"><span class="pm-n">' + (d.focus >= 3 ? hoursOf(d.focus) : '') + '</span>' +
      '<span class="pm-bar">' + segs + '</span><span class="pm-d">' + (i === 6 ? 'Today' : DAYS[d.day.getDay()].slice(0, 3)) + '</span></li>';
  }).join('');
  return '<h2>Last 7 days at the desk' + dots(0) + head + '</h2><ul class="pm-bars" style="--goal:' + (goalMin / top * 100).toFixed(1) + '%">' + bars + '</ul>';
}

const dots = (on) => '<i class="pm-pg' + (on === 0 ? ' is-on' : '') + '"></i><i class="pm-pg' + (on === 1 ? ' is-on' : '') + '"></i>';

// The bars first (the default), the grid a swipe to the left.
// Both views' titles end with the category to start with.
function weekTile(days, now, sel, next, grid) {
  const head = !balance.length ? ''
    : next ? '<span class="pm-next">Next: <b>' + esc(catName(next.cat)) + '</b>, ' + whyText(next, now, false) + '</span>'
    : '<span class="pm-next">Each one has had time today</span>';
  return '<section class="tile pm-week' + (grid ? ' is-grid' : '') + '"><div class="pm-wk-track">' +
    '<div class="pm-wk-pane">' + weekBars(days, sel, head) + '</div><div class="pm-wk-pane">' + weekGrid(days, sel, next, head) + '</div></div></section>';
}

// A tapped day: its time by focus category, the rest together, each against its usual.
function dayTile(days, i) {
  const d = days[i], usual = P.usualByCat(days);
  const hasUsual = Object.keys(usual).length > 0;
  const restOf = (by) => Object.keys(by).reduce((n, id) => n + (rowIds.indexOf(id) < 0 ? by[id] : 0), 0);
  const vs = (m, u) => {
    const x = m - (u || 0);
    return !hasUsual || Math.abs(x) < 5 ? '' : (x > 0 ? '+' : '\u2212') + P.hoursText(Math.abs(x));
  };
  const row = (k, name, m, u, cls) => '<li class="' + k + (cls ? ' ' + cls : '') + '"><span class="pm-cname"><i></i>' + name + '</span>' +
    '<b>' + (m ? P.hoursText(m) : '\u2013') + '</b><span class="pm-vs">' + vs(m, u) + '</span></li>';
  const rows = rowIds.map((id) => row(kClass(id), esc(catName(id)), d.byCat[id] || 0, usual[id])).join('') +
    row('pm-k8', 'Not focus', restOf(d.byCat), restOf(usual), 'is-rest');
  return '<section class="tile pm-split"><h2>' + (i === 6 ? 'Today' : DAYS[d.day.getDay()]) + (hasUsual ? '<span>vs usual</span>' : '') + '</h2>' +
    '<ul class="pm-day">' + rows + '</ul></section>';
}

// view: the log with what's running and each full Pomodoro's break; days: its last 7 days.
function statsTiles(view, days, now, sel, next, grid) {
  const today = days[6];
  const run = P.streak(view, now, P.focusDays(view, isFocus, cfg.streakHours * 60));
  const allMin = view.reduce((n, s) => n + P.minutes(s), 0);
  const allFocus = view.reduce((n, s) => n + (isFocus(s) ? P.minutes(s) : 0), 0);
  // one dot an hour: full, half from 30 minutes in
  let dots = '';
  const full = Math.floor(today.focus / 60), half = today.focus % 60 >= 30;
  for (let i = 0; i < Math.max(cfg.goalHours, full + (half ? 1 : 0)); i++) dots += '<i class="' + (i < full ? 'is-done' : i === full && half ? 'is-half' : '') + '"></i>';

  const totals = P.categoryTotals(view, now, 7);
  const most = totals.length ? totals[0].minutes : 1;
  const week = days.reduce((n, d) => n + d.minutes, 0), weekFocus = days.reduce((n, d) => n + d.focus, 0);
  const rows = totals.length ? totals.slice(0, 6).map((t) =>
    '<li class="' + kClass(t.cat) + '"><span class="pm-cname"><i></i>' + esc(catName(t.cat)) + '</span>' +
    '<span class="pm-track-h"><i style="width:' + (t.minutes / most * 100).toFixed(1) + '%"></i></span><b>' + P.hoursText(t.minutes) + '</b></li>').join('')
    : '<li class="pm-empty">Nothing in the last 7 days.</li>';
  const split = sel !== null ? dayTile(days, sel)
    : '<section class="tile pm-split"><h2>By category · 7 days' + (week ? '<span>' + pct(weekFocus, week) + ' focus</span>' : '') + '</h2><ul>' + rows + '</ul></section>';

  return '<div class="pm-stats">' +
    '<div class="pm-top">' +
    '<section class="tile pm-stat"><h2>Today · focus</h2><b class="serif">' + hoursOf(today.focus) + '<i> of ' + cfg.goalHours + ' h</i></b>' +
    '<div class="pm-dots">' + dots + '</div><span>' + (today.minutes ? P.hoursText(today.minutes) + ' at the desk' : 'Nothing tracked yet') + '</span></section>' +
    '<section class="tile pm-stat"><h2>Streak</h2><b class="serif">' + run.current + '<i> day' + (run.current === 1 ? '' : 's') + '</i></b>' +
    '<span>' + (run.current && !run.today ? cfg.streakHours + ' h today keeps it going' : 'Best ' + run.best + ' day' + (run.best === 1 ? '' : 's')) + '</span></section>' +
    '<section class="tile pm-stat"><h2>All time · focus</h2><b class="serif">' + hoursOf(allFocus) + '<i> h</i></b><span>' + (allMin ? P.hoursText(allMin) + ' at the desk' : 'Your first hour starts here') + '</span></section>' +
    '</div>' +
    weekTile(days, now, sel, next, grid) +
    '<div class="pm-bottom">' + todayTile(view, now, today) + split + '</div></div>';
}

export function mountPomodoro(el, onCue) {
  const data = load();
  let visible = false, confirmUntil = 0, offset = -1, dropped = false, touchSaved = 0;
  let sel = null, selTimer = 0; // the tapped day (0–6), or null
  let grid = false, swipedAt = 0; // the last 7 days as the grid rather than the bars
  try { grid = localStorage.getItem(VIEW_KEY) === 'grid'; } catch (e) { /* blocked */ }
  let tl = false, tlTimer = 0, tlCol = false; // today's timeline open, and as the column
  try { tlCol = localStorage.getItem(TL_KEY) === 'column'; } catch (e) { /* blocked */ }

  const trustedNow = (now) => P.clockTrusted(data.state, now, __BUILT_AT__);
  const live = (now) => (trustedNow(now) ? P.liveEntry(data.state, now) : null);

  function render() {
    const now = Date.now(), date = new Date(now), running = live(now);
    // Everything at the desk, what's running included, each full Pomodoro with its break.
    const view = P.withBreaks(running ? data.log.concat(running) : data.log, cfg.break, now);
    const days = P.lastDays(view, date, 7, isFocus);
    const next = balance.length ? P.nextFocus(days, balance, RECENT_DAYS) : null;
    const html = '<header class="screen-head"><h1 class="serif">Time<i>,</i></h1><span>At the desk · Pomodoro ' + cfg.work + ' + ' + cfg.break + ' minutes</span></header>' +
      '<div class="pm-body">' + timerTile(data, now, now < confirmUntil, dropped, next) +
      (tl ? '<section class="tile pm-tl' + (tlCol ? ' is-col' : '') + '"></section>' : statsTiles(view, days, date, sel, next, grid)) + '</div>';
    if (el.__html !== html) { el.innerHTML = el.__html = html; offset = -1; }
    if (tl) drawTimeline(view, date);
    tickView(now);
  }

  // The timeline is drawn into its tile apart from the rest, and patched from then on, so what's
  // running grows each minute without the screen being drawn again.
  function drawTimeline(view, date) {
    const tile = el.querySelector('.pm-tl'), html = timelineHtml(view, date);
    if (tile.__html === html) return;
    const fresh = document.createElement('div');
    fresh.innerHTML = html;
    if (!tile.__html || !patchKids(tile, fresh)) tile.innerHTML = html;
    tile.__html = html;
  }

  // The time left (or, tracking, the time so far) and the arc, every second.
  function tickView(now) {
    const st = data.state, left = el.querySelector('.pm-left');
    if (!left) return;
    const trusted = trustedNow(now);
    let text, until, fill;
    if (st.phase === 'track') {
      // Counting up; the ring fills once an hour.
      const ms = now - st.start;
      text = trusted ? upText(ms) : '––:––';
      until = trusted ? 'since ' + timeText(new Date(st.start)) : '';
      fill = trusted ? (ms % HOUR) / HOUR : 0;
    } else if (st.phase === 'ask') {
      // The seconds left to answer, the ring emptying with them.
      const remaining = st.start + P.ASK_SEC * 1000 - now;
      text = trusted ? mmss(remaining) : '––:––';
      until = trusted ? 'then Ready' : '';
      fill = trusted ? 1 - Math.min(1, Math.max(0, remaining) / (P.ASK_SEC * 1000)) : 1;
    } else {
      const end = P.phaseEnd(st, cfg);
      const total = (st.phase === 'break' ? cfg.break : cfg.work) * 60000;
      // An untrusted clock shows no countdown (it would read thousands of minutes) and a full ring.
      const remaining = st.phase === 'idle' || !trusted ? total : end - now;
      text = st.phase !== 'idle' && !trusted ? '––:––' : mmss(remaining);
      until = st.phase === 'idle' || !trusted ? '' : 'until ' + timeText(new Date(end));
      fill = st.phase === 'idle' ? 0 : 1 - Math.min(1, remaining / total);
    }
    if (left.textContent !== text) { left.textContent = text; left.classList.toggle('is-long', text.length > 5); }
    const u = el.querySelector('.pm-until');
    if (u.textContent !== until) u.textContent = until;
    const off = Math.round(RING * (1 - fill));
    if (off !== offset) { offset = off; el.querySelector('.pm-arc').setAttribute('stroke-dashoffset', String(off)); }
  }

  function cue(name) {
    chime(SOUNDS[name]);
    const flash = el.querySelector('.pm-flash');
    if (flash) {
      flash.classList.remove('is-on');
      flash.classList.toggle('is-nudge', name === 'nudge');
      void flash.offsetWidth;
      flash.classList.add('is-on');
    }
  }

  // Doom scrolling or a break: a chime and an orange pulse every few minutes, and back to this
  // screen. Only for reminders earned while watching: none for the time a reload or switch skipped.
  let nudgeFor = null, nudged = 0;
  function remind(now) {
    const st = data.state, n = P.nudges(st, now, REMIND.categories, REMIND.minutes), key = st.start + ':' + st.cat;
    if (key !== nudgeFor) { nudgeFor = key; nudged = n; return; }
    if (n <= nudged) return;
    nudged = n;
    if (onCue) onCue();
    render();
    cue('nudge');
  }

  let wasTrusted = true;
  function step() {
    const now = Date.now();
    const trusted = trustedNow(now);
    if (trusted !== wasTrusted) { wasTrusted = trusted; if (visible) render(); } // network time arrived, or went
    if (!trusted) return; // keep the timer as it is until real time arrives
    if (data.state.phase === 'track') {
      const a = P.autoStop(data.state, now, data.touch, AUTO_MS);
      if (!a) { remind(now); return; }
      data.auto = { cat: data.state.cat, start: data.state.start, at: a.at, until: a.until };
      data.state = a.state;
      if (a.logged) data.log.push(a.logged);
      save(data);
      if (visible) render();
      return;
    }
    const r = P.advance(data.state, now, cfg);
    if (r.state === data.state) return;
    data.state = r.state;
    dropped = r.dropped;
    if (r.logged) data.log.push(r.logged);
    save(data);
    if (r.cue && onCue) onCue();
    if (visible || r.cue) render();
    if (r.cue) cue(r.cue);
  }

  // A tracker counts as watched while the frame is being touched, anywhere on it.
  document.addEventListener('pointerdown', () => {
    if (data.state.phase !== 'track') return;
    const now = Date.now();
    data.touch = now;
    if (now - touchSaved > TOUCH_SAVE_MS) { touchSaved = now; save(data); }
  }, true);

  // A swipe across the last 7 days slides to the other view; the HTML is left as it is so the
  // slide can run, and the next render draws the same thing.
  // Today's timeline swipes between the bar and the column the same way.
  let from = null;
  el.addEventListener('pointerdown', (e) => {
    const w = e.target.closest('.pm-week, .pm-tl');
    from = w ? { x: e.clientX, y: e.clientY, tl: w.classList.contains('pm-tl') } : null;
  });
  el.addEventListener('pointerup', (e) => {
    if (!from) return;
    const dx = e.clientX - from.x, dy = e.clientY - from.y, onTl = from.tl;
    from = null;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
    swipedAt = Date.now();
    if (onTl) {
      if (tlCol === dx < 0) return;
      tlCol = dx < 0;
      try { localStorage.setItem(TL_KEY, tlCol ? 'column' : 'bar'); } catch (e2) { /* blocked */ }
      const t = el.querySelector('.pm-tl');
      if (t) t.classList.toggle('is-col', tlCol);
      return;
    }
    if (grid === dx < 0) return; // already there
    grid = dx < 0;
    try { localStorage.setItem(VIEW_KEY, grid ? 'grid' : 'bars'); } catch (e2) { /* blocked */ }
    const tile = el.querySelector('.pm-week');
    if (tile) tile.classList.toggle('is-grid', grid);
  });

  function closeDay() { clearTimeout(selTimer); if (sel !== null) { sel = null; if (visible) render(); } }
  function closeTimeline() { clearTimeout(tlTimer); if (tl) { tl = false; if (visible) render(); } }

  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]'), a = e.target.closest('[data-act]'), d = e.target.closest('[data-day]');
    const now = Date.now(), trusted = trustedNow(now);
    // Any tap here keeps a day's breakdown open a while longer.
    if (sel !== null) { clearTimeout(selTimer); selTimer = setTimeout(closeDay, DAY_MS); }
    if (tl) { clearTimeout(tlTimer); tlTimer = setTimeout(closeTimeline, DAY_MS); }
    // Today's timeline opens from its tile and closes with a tap on it (not the end of a swipe).
    if (e.target.closest('.pm-tl')) { if (now - swipedAt >= 500) closeTimeline(); return; }
    if (e.target.closest('.pm-today') && !el.querySelector('.pm-today .pm-empty')) {
      tl = true;
      tlTimer = setTimeout(closeTimeline, DAY_MS);
      render();
      return;
    }
    if (d && now - swipedAt < 500) return; // the end of a swipe, not a tap on a day
    if (d) {
      const i = +d.getAttribute('data-day');
      if (i === sel) { closeDay(); return; }
      sel = i;
      clearTimeout(selTimer);
      selTimer = setTimeout(closeDay, DAY_MS);
    } else if (c) {
      const id = c.getAttribute('data-cat');
      if (data.state.phase === 'work') data.state = Object.assign({}, data.state, { cat: id });
      else if (data.state.phase === 'ask' || data.state.phase === 'break') {
        const last = data.log[data.log.length - 1];
        if (last && last.end === data.state.start) last.cat = id; // retag the session just finished
        data.state = Object.assign({}, data.state, { cat: id });
      } else {
        if (!trusted) return; // no start time to go by yet
        const r = P.startTrack(data.state, id, now, trusted);
        data.state = r.state;
        if (r.logged) data.log.push(r.logged);
        data.touch = now;
        data.auto = null;
        dropped = false;
      }
      data.cat = id;
      save(data);
    } else if (a && !a.disabled) {
      const act = a.getAttribute('data-act');
      if (act === 'start') {
        // A tracker in progress turns into the Pomodoro: what was tracked so far is logged.
        const r = P.stopTrack(data.state, now, trusted);
        if (r.logged) data.log.push(r.logged);
        const cat = data.state.phase === 'track' ? data.state.cat : data.cat || data.state.cat || cats[0].id;
        data.state = { phase: 'work', start: now, cat };
        data.cat = cat;
        data.auto = null;
        dropped = false;
        chime(SOUNDS.start);
      } else if (act === 'stop' && data.state.phase === 'track') {
        const r = P.stopTrack(data.state, now, trusted);
        data.state = r.state;
        if (r.logged) data.log.push(r.logged);
      } else if (act === 'stop') {
        // Two taps, so a stray one doesn't end 40 minutes of work.
        if (now >= confirmUntil) {
          confirmUntil = now + CONFIRM_MS;
          setTimeout(render, CONFIRM_MS + 50);
        } else {
          const r = P.stopWork(data.state, now, trusted);
          data.state = r.state;
          if (r.logged) data.log.push(r.logged);
          confirmUntil = 0;
        }
      } else if ((act === 'break' || act === 'work' || act === 'done') && data.state.phase === 'ask') {
        data.state = P.answer(data.state, act, now);
        if (act === 'work') chime(SOUNDS.start);
      } else if (act === 'skip') {
        data.state = { phase: 'idle', start: 0, cat: data.state.cat };
      } else if (act === 'keep' && data.auto) {
        // The tracker that stopped by itself counts on until it did.
        const au = data.auto, last = data.log[data.log.length - 1];
        if (last && last.kind === 'track' && last.start === au.start) last.end = au.until;
        else data.log.push({ start: au.start, end: au.until, cat: au.cat, done: false, kind: 'track' });
        data.auto = null;
      }
      if (act !== 'stop' || !confirmUntil) save(data);
    } else return;
    render();
  });

  setInterval(() => {
    step();
    if (visible && data.state.phase !== 'idle') tickView(Date.now());
  }, 1000);
  setTimeout(step, 0); // after main.js has finished wiring, since a cue moves to this screen

  return {
    show() { visible = true; render(); },
    hide() { visible = false; clearTimeout(selTimer); sel = null; clearTimeout(tlTimer); tl = false; },
    // Called every minute: the stats and "Today" move on with the date.
    update() { if (visible) render(); },
    // A Pomodoro holds the screen and night off; tracking holds only the screen.
    busy() { return data.state.phase === 'work' || data.state.phase === 'ask' || data.state.phase === 'break'; },
    stay() { return data.state.phase !== 'idle'; },
    // What's running, for Home: { name, k, text } or null.
    running() {
      const st = data.state, now = Date.now();
      if (st.phase === 'idle') return null;
      const r = { name: st.phase === 'break' ? 'Break' : st.phase === 'ask' ? 'Pomodoro done' : catName(st.cat), k: kClass(st.cat), text: '' };
      if (!trustedNow(now) || st.phase === 'ask') return r;
      if (st.phase === 'track') r.text = P.hoursText(Math.max(1, Math.floor((now - st.start) / 60000)));
      else r.text = Math.max(1, Math.ceil((P.phaseEnd(st, cfg) - now) / 60000)) + ' m left';
      return r;
    },
  };
}
