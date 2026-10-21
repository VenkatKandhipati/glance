// Time screen (side bar: Time): what you're doing at the desk. On the left, the timer: tap a
// category to track it (another switches, Stop ends it), or start a Pomodoro (content.js `time`:
// 45 minutes of deep work, then a 15-minute break). On the right, the insights, all counted
// against tracked time at the desk: today, the streak, all time, the last 7 days, today's
// timeline and time by category.
//
// The timer is kept as timestamps (pomodoro-data.js), so a reload or a power cut picks it up where
// it was. While a Pomodoro runs, the frame stays on this screen and night waits (main.js asks
// busy()); tracking lets both go on as usual, and stops by itself at the last touch once nobody
// has touched the frame for `autoStopHours`. Each Pomodoro phase ends with a chime and a gold
// pulse, and brings this screen back if you'd left it. The log lives in localStorage and, in the
// kiosk, in a backup file that adb can pull (both still named for the Pomodoro screen it grew from):
//   adb pull /sdcard/Android/data/app.glance.kiosk/files/pomodoro.json
import { time as cfg } from '../content.js';
import { DEMO, demoPomodoro } from '../demo.js';
import { DAYS, esc } from '../time.js';
import { timeText } from '../tiles/calendar.js';
import * as P from '../pomodoro-data.js';

const KEY = 'glance-pomodoro';
const FILE = 'pomodoro.json';
const CONFIRM_MS = 4000;
const RING = 2 * Math.PI * 138; // the arc's circumference, in its 300 × 300 viewBox
const HOUR = 3600e3;
const AUTO_MS = (cfg.autoStopHours || 0) * HOUR;
const TOUCH_SAVE_MS = 60000; // while tracking, the last touch is saved at most this often

const cats = cfg.categories;
const known = {}, focusIds = {};
cats.forEach((c) => { known[c.id] = true; if (c.focus) focusIds[c.id] = true; });
// Focus: a focus category, or a Pomodoro in a category since removed from the list.
const isFocus = (s) => !!focusIds[s.cat] || (!known[s.cat] && s.kind !== 'track');
const kClass = (id) => { const i = cats.findIndex((c) => c.id === id); return 'pm-k' + (i >= 0 ? i : 8); };
const catName = (id) => { const c = cats.find((x) => x.id === id); return c ? c.name : id || 'Other'; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); const m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };
// Elapsed time counting up: 12:05, then 1:02:10.
const upText = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s % 60;
  return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (r < 10 ? '0' : '') + r;
};
const pct = (part, whole) => Math.round(part / whole * 100) + '%';
// 3 h 20 m in the big serif numbers: "3h 20m"
const bigTime = (mins) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return (h ? h + '<i>h</i> ' : '') + (h && !m ? '' : m + '<i>m</i>');
};
const hourLabel = (h) => (h % 12 || 12) + (h % 24 < 12 ? ' am' : ' pm');

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

const SOUNDS = { start: [523.25], 'work-done': [523.25, 659.25, 783.99], 'break-done': [783.99, 659.25] };

// ---- drawing
function catButtons(on) {
  return cats.map((c) =>
    '<button class="pm-cat ' + kClass(c.id) + (c.id === on ? ' is-on' : '') + '" data-cat="' + esc(c.id) + '"><i></i>' + esc(c.name) + '</button>').join('');
}

function timerTile(data, now, confirming, dropped) {
  const st = data.state, sane = P.clockTrusted(st, now, __BUILT_AT__);
  const last = data.log[data.log.length - 1];
  const startPomodoro = '<button class="pm-btn is-go" data-act="start"' + (sane ? '' : ' disabled') + '>Start ' + cfg.work + ' minutes</button>';
  const stop = (two) => '<button class="pm-btn' + (two && confirming ? ' is-confirm' : '') + '" data-act="stop">' + (two && confirming ? 'Tap again to stop' : 'Stop') + '</button>';
  let phase, note, actions;
  if (st.phase !== 'idle' && !sane) {
    phase = st.phase === 'work' ? 'Deep work' : st.phase === 'break' ? 'Break' : 'Tracking';
    note = 'Waiting for the time from the network…';
    actions = st.phase === 'work' ? stop(true) : st.phase === 'track' ? stop(false) : '';
  } else if (st.phase === 'work') {
    phase = 'Deep work';
    note = '<b>' + esc(catName(st.cat)) + '</b>. Tap another to change it.';
    actions = stop(true);
  } else if (st.phase === 'break') {
    phase = 'Break';
    note = last && last.end === st.start
      ? 'Logged ' + P.minutes(last) + ' m of <b>' + esc(catName(last.cat)) + '</b>. Tap another to change it.'
      : 'Stand up, stretch, look far away.';
    actions = '<button class="pm-btn" data-act="skip">End break</button><button class="pm-btn is-go" data-act="start">Start next</button>';
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
      : 'Tap what you\'re doing to track it. A Pomodoro starts on <b>' + esc(catName(data.cat || cats[0].id)) + '</b>.';
    actions = (a && sane ? '<button class="pm-btn" data-act="keep">Count until ' + timeText(new Date(a.until)) + '</button>' : '') + startPomodoro;
  }
  const on = st.phase === 'idle' ? null : st.cat;
  return '<section class="tile pm-timer is-' + st.phase + '"><div class="pm-flash"></div>' +
    '<h2 class="pm-phase">' + phase + '</h2>' +
    '<div class="pm-ring ' + kClass(st.cat) + '"><svg viewBox="0 0 300 300" width="240" height="240"><circle class="pm-track" cx="150" cy="150" r="138"/>' +
    '<circle class="pm-arc" cx="150" cy="150" r="138" stroke-dasharray="' + RING.toFixed(1) + '" stroke-dashoffset="' + RING.toFixed(1) + '" transform="rotate(-90 150 150)"/></svg>' +
    '<div class="pm-clock"><b class="pm-left serif">' + cfg.work + ':00</b><span class="pm-until"></span></div></div>' +
    '<p class="pm-note">' + note + '</p>' +
    '<div class="pm-cats">' + catButtons(on) + '</div>' +
    '<div class="pm-actions">' + actions + '</div></section>';
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

function statsTiles(data, now, live) {
  const view = live ? data.log.concat(live) : data.log;
  const today = P.dayTotals(view, now, isFocus);
  const run = P.streak(data.log, now);
  const all = data.log.reduce((n, s) => n + (s.done ? 1 : 0), 0);
  const allMin = view.reduce((n, s) => n + P.minutes(s), 0);
  let dots = '';
  for (let i = 0; i < Math.max(cfg.goal, today.done); i++) dots += '<i class="' + (i < today.done ? 'is-done' : '') + '"></i>';

  const days = P.lastDays(view, now, 7, isFocus);
  const goalMin = cfg.goal * cfg.work;
  const top = Math.max(goalMin * 1.25, Math.max.apply(null, days.map((d) => d.minutes)));
  const order = cats.map((c) => c.id);
  const bars = days.map((d, i) => {
    // focus categories first, at the bottom, so the goal line reads against them
    const ids = Object.keys(d.byCat).sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
    const segs = ids.map((id) => '<i class="' + kClass(id) + '" style="height:' + (d.byCat[id] / top * 100).toFixed(1) + '%"></i>').join('');
    return '<li' + (i === 6 ? ' class="is-today"' : '') + '><span class="pm-n">' + (d.done || '') + '</span>' +
      '<span class="pm-bar">' + segs + '</span><span class="pm-d">' + (i === 6 ? 'Today' : DAYS[d.day.getDay()].slice(0, 3)) + '</span></li>';
  }).join('');

  const totals = P.categoryTotals(view, now, 7);
  const most = totals.length ? totals[0].minutes : 1;
  const week = days.reduce((n, d) => n + d.minutes, 0), weekFocus = days.reduce((n, d) => n + d.focus, 0);
  const rows = totals.length ? totals.slice(0, 6).map((t) =>
    '<li class="' + kClass(t.cat) + '"><span class="pm-cname"><i></i>' + esc(catName(t.cat)) + '</span>' +
    '<span class="pm-track-h"><i style="width:' + (t.minutes / most * 100).toFixed(1) + '%"></i></span><b>' + P.hoursText(t.minutes) + '</b></li>').join('')
    : '<li class="pm-empty">Nothing in the last 7 days.</li>';

  return '<div class="pm-stats">' +
    '<div class="pm-top">' +
    '<section class="tile pm-stat"><h2>Today</h2><b class="serif">' + bigTime(today.minutes) + '</b>' +
    '<div class="pm-dots">' + dots + '</div><span>' + today.done + ' of ' + cfg.goal +
    (today.minutes ? ' · ' + pct(today.focus, today.minutes) + ' focus' : ' Pomodoros') + '</span></section>' +
    '<section class="tile pm-stat"><h2>Streak</h2><b class="serif">' + run.current + '<i> day' + (run.current === 1 ? '' : 's') + '</i></b>' +
    '<span>' + (run.current && !run.today ? 'One today keeps it going' : 'Best ' + run.best + ' day' + (run.best === 1 ? '' : 's')) + '</span></section>' +
    '<section class="tile pm-stat"><h2>All time</h2><b class="serif">' + all + '<i> Pomodoros</i></b><span>' + (allMin ? P.hoursText(allMin) + ' at the desk' : 'Your first one starts here') + '</span></section>' +
    '</div>' +
    '<section class="tile pm-week"><h2>Last 7 days at the desk</h2><ul style="--goal:' + (goalMin / top * 100).toFixed(1) + '%">' + bars + '</ul></section>' +
    '<div class="pm-bottom">' + todayTile(view, now, today) +
    '<section class="tile pm-split"><h2>By category · 7 days' + (week ? '<span>' + pct(weekFocus, week) + ' focus</span>' : '') + '</h2><ul>' + rows + '</ul></section>' +
    '</div></div>';
}

export function mountPomodoro(el, onCue) {
  const data = load();
  let visible = false, confirmUntil = 0, offset = -1, dropped = false, touchSaved = 0;

  const trustedNow = (now) => P.clockTrusted(data.state, now, __BUILT_AT__);
  const live = (now) => (trustedNow(now) ? P.liveEntry(data.state, now) : null);

  function render() {
    const now = Date.now();
    const html = '<header class="screen-head"><h1 class="serif">Time<i>,</i></h1><span>At the desk · Pomodoro ' + cfg.work + ' + ' + cfg.break + ' minutes</span></header>' +
      '<div class="pm-body">' + timerTile(data, now, now < confirmUntil, dropped) + statsTiles(data, new Date(now), live(now)) + '</div>';
    if (el.__html !== html) { el.innerHTML = el.__html = html; offset = -1; }
    tickView(now);
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
    if (flash) { flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on'); }
  }

  let wasTrusted = true;
  function step() {
    const now = Date.now();
    const trusted = trustedNow(now);
    if (trusted !== wasTrusted) { wasTrusted = trusted; if (visible) render(); } // network time arrived, or went
    if (!trusted) return; // keep the timer as it is until real time arrives
    if (data.state.phase === 'track') {
      const a = P.autoStop(data.state, now, data.touch, AUTO_MS);
      if (!a) return;
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

  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]'), a = e.target.closest('[data-act]');
    const now = Date.now(), trusted = trustedNow(now);
    if (c) {
      const id = c.getAttribute('data-cat');
      if (data.state.phase === 'work') data.state = Object.assign({}, data.state, { cat: id });
      else if (data.state.phase === 'break') {
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
    hide() { visible = false; },
    // Called every minute: the stats and "Today" move on with the date.
    update() { if (visible) render(); },
    busy() { return data.state.phase === 'work' || data.state.phase === 'break'; },
    // What's running, for Home: { name, k, text } or null.
    running() {
      const st = data.state, now = Date.now();
      if (st.phase === 'idle') return null;
      const r = { name: st.phase === 'break' ? 'Break' : catName(st.cat), k: kClass(st.cat), text: '' };
      if (!trustedNow(now)) return r;
      if (st.phase === 'track') r.text = P.hoursText(Math.max(1, Math.floor((now - st.start) / 60000)));
      else r.text = Math.max(1, Math.ceil((P.phaseEnd(st, cfg) - now) / 60000)) + ' m left';
      return r;
    },
  };
}
