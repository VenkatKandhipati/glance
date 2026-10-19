// Pomodoro screen: a deep-work timer (content.js `pomodoro`: 45 minutes, then a 15-minute break)
// on the left; today, the streak, the last 7 days, 12 weeks and time by category on the right.
//
// The timer is kept as timestamps (pomodoro-data.js), so a reload or a power cut picks it up where
// it was. While it runs, the frame stays on this screen and night waits (main.js asks busy()).
// Each phase ends with a chime and a gold pulse, and brings this screen back if you'd left it.
// The log lives in localStorage and, in the kiosk, in a backup file that adb can pull:
//   adb pull /sdcard/Android/data/app.glance.kiosk/files/pomodoro.json
import { pomodoro as cfg, settings } from '../content.js';
import { DEMO, demoPomodoro } from '../demo.js';
import { DAYS, clockIsSane, esc } from '../time.js';
import { timeText } from '../tiles/calendar.js';
import * as P from '../pomodoro-data.js';

const KEY = 'glance-pomodoro';
const FILE = 'pomodoro.json';
const CONFIRM_MS = 4000;
const RING = 2 * Math.PI * 138; // the arc's circumference, in its 300 × 300 viewBox

const cats = cfg.categories;
const catIndex = (id) => Math.max(0, cats.findIndex((c) => c.id === id));
const catName = (id) => { const c = cats.find((x) => x.id === id); return c ? c.name : id || 'Other'; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); const m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };

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
  data.saved = Date.now();
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
function catButtons(selected) {
  return cats.map((c, i) =>
    '<button class="pm-cat pm-k' + i + (c.id === selected ? ' is-on' : '') + '" data-cat="' + esc(c.id) + '"><i></i>' + esc(c.name) + '</button>').join('');
}

function timerTile(data, now, confirming) {
  const st = data.state, sane = clockIsSane(new Date(now), __BUILT_AT__);
  const cat = st.phase === 'idle' ? data.cat : st.cat;
  const last = data.log[data.log.length - 1];
  let phase, note, actions;
  if (st.phase === 'work') {
    phase = 'Deep work';
    note = (cat ? '<b>' + esc(catName(cat)) + '</b>. ' : '') + 'Tap another to change it.';
    actions = '<button class="pm-btn' + (confirming ? ' is-confirm' : '') + '" data-act="stop">' + (confirming ? 'Tap again to stop' : 'Stop') + '</button>';
  } else if (st.phase === 'break') {
    phase = 'Break';
    note = last && last.end === st.start
      ? 'Logged ' + P.minutes(last) + ' m of <b>' + esc(catName(last.cat)) + '</b>. Tap another to change it.'
      : 'Stand up, stretch, look far away.';
    actions = '<button class="pm-btn" data-act="skip">End break</button><button class="pm-btn is-go" data-act="start">Start next</button>';
  } else {
    phase = 'Ready';
    note = sane ? (cat ? 'Next: <b>' + esc(catName(cat)) + '</b>.' : 'Pick what it\'s for, then start.') : 'Waiting for the time from the network…';
    actions = '<button class="pm-btn is-go" data-act="start"' + (sane ? '' : ' disabled') + '>Start ' + cfg.work + ' minutes</button>';
  }
  return '<section class="tile pm-timer is-' + st.phase + '"><div class="pm-flash"></div>' +
    '<h2 class="pm-phase">' + phase + '</h2>' +
    '<div class="pm-ring"><svg viewBox="0 0 300 300" width="300" height="300"><circle class="pm-track" cx="150" cy="150" r="138"/>' +
    '<circle class="pm-arc" cx="150" cy="150" r="138" stroke-dasharray="' + RING.toFixed(1) + '" stroke-dashoffset="' + RING.toFixed(1) + '" transform="rotate(-90 150 150)"/></svg>' +
    '<div class="pm-clock"><b class="pm-left serif">' + cfg.work + ':00</b><span class="pm-until"></span></div></div>' +
    '<p class="pm-note">' + note + '</p>' +
    '<div class="pm-cats">' + catButtons(cat) + '</div>' +
    '<div class="pm-actions">' + actions + '</div></section>';
}

function statsTiles(data, now) {
  const today = P.dayTotals(data.log, now);
  const run = P.streak(data.log, now);
  const all = data.log.reduce((n, s) => n + (s.done ? 1 : 0), 0);
  const allMin = data.log.reduce((n, s) => n + P.minutes(s), 0);
  let dots = '';
  for (let i = 0; i < Math.max(cfg.goal, today.done); i++) dots += '<i class="' + (i < today.done ? 'is-done' : '') + '"></i>';

  const days = P.lastDays(data.log, now, 7);
  const goalMin = cfg.goal * cfg.work;
  const top = Math.max(goalMin * 1.25, Math.max.apply(null, days.map((d) => d.minutes)));
  const bars = days.map((d, i) => {
    const segs = cats.map((c, k) => (d.byCat[c.id] ? '<i class="pm-k' + k + '" style="height:' + (d.byCat[c.id] / top * 100).toFixed(1) + '%"></i>' : '')).join('') +
      Object.keys(d.byCat).filter((id) => !cats.some((c) => c.id === id)).map((id) =>
        '<i class="pm-k5" style="height:' + (d.byCat[id] / top * 100).toFixed(1) + '%"></i>').join('');
    return '<li' + (i === 6 ? ' class="is-today"' : '') + '><span class="pm-n">' + (d.done || '') + '</span>' +
      '<span class="pm-bar">' + segs + '</span><span class="pm-d">' + (i === 6 ? 'Today' : DAYS[d.day.getDay()].slice(0, 3)) + '</span></li>';
  }).join('');

  const grid = P.weekGrid(data.log, now, 12, settings.weekStartsOn);
  const level = (n) => (n === null ? 'is-future' : n === 0 ? 'l0' : n >= cfg.goal ? 'l4' : n >= cfg.goal * 0.75 ? 'l3' : n >= cfg.goal / 2 ? 'l2' : 'l1');
  const cells = grid.cols.map((col, w) => '<span class="pm-wk">' + col.map((n, i) =>
    '<i class="' + level(n) + (w === 11 && n !== null && (i === 6 || col[i + 1] === null) ? ' is-today' : '') + '"></i>').join('') + '</span>').join('');
  const dow = [0, 1, 2, 3, 4, 5, 6].map((i) => { const d = (settings.weekStartsOn + i) % 7; return d % 2 ? DAYS[d].charAt(0) : ''; }); // M W F

  const totals = P.categoryTotals(data.log, now, 7);
  const most = totals.length ? totals[0].minutes : 1;
  const rows = totals.length ? totals.slice(0, 6).map((t) =>
    '<li class="pm-k' + (cats.some((c) => c.id === t.cat) ? catIndex(t.cat) : 5) + '"><span class="pm-cname"><i></i>' + esc(catName(t.cat)) + '</span>' +
    '<span class="pm-track-h"><i style="width:' + (t.minutes / most * 100).toFixed(1) + '%"></i></span><b>' + P.hoursText(t.minutes) + '</b></li>').join('')
    : '<li class="pm-empty">Nothing in the last 7 days.</li>';

  return '<div class="pm-stats">' +
    '<div class="pm-top">' +
    '<section class="tile pm-stat"><h2>Today</h2><b class="serif">' + today.done + '<i> of ' + cfg.goal + '</i></b>' +
    '<div class="pm-dots">' + dots + '</div><span>' + (today.minutes ? P.hoursText(today.minutes) + ' deep work' : 'No deep work yet') + '</span></section>' +
    '<section class="tile pm-stat"><h2>Streak</h2><b class="serif">' + run.current + '<i> day' + (run.current === 1 ? '' : 's') + '</i></b>' +
    '<span>' + (run.current && !run.today ? 'One today keeps it going' : 'Best ' + run.best + ' day' + (run.best === 1 ? '' : 's')) + '</span></section>' +
    '<section class="tile pm-stat"><h2>All time</h2><b class="serif">' + all + '<i> sessions</i></b><span>' + (allMin ? P.hoursText(allMin) + ' deep work' : 'Your first one starts here') + '</span></section>' +
    '</div>' +
    '<section class="tile pm-week"><h2>Last 7 days</h2><ul style="--goal:' + (goalMin / top * 100).toFixed(1) + '%">' + bars + '</ul></section>' +
    '<div class="pm-bottom">' +
    '<section class="tile pm-grid"><h2>12 weeks</h2><div class="pm-cal"><span class="pm-dow">' + dow.map((d) => '<i>' + d + '</i>').join('') + '</span>' + cells + '</div></section>' +
    '<section class="tile pm-split"><h2>By category · 7 days</h2><ul>' + rows + '</ul></section>' +
    '</div></div>';
}

export function mountPomodoro(el, onCue) {
  const data = load();
  let visible = false, confirmUntil = 0, offset = -1;

  function render() {
    const now = Date.now();
    const html = '<header class="screen-head"><h1 class="serif">Pomodoro<i>,</i></h1><span>' + cfg.work + ' minutes deep work · ' + cfg.break + ' minutes break</span></header>' +
      '<div class="pm-body">' + timerTile(data, now, now < confirmUntil) + statsTiles(data, new Date(now)) + '</div>';
    if (el.__html !== html) { el.innerHTML = el.__html = html; offset = -1; }
    tickView(now);
  }

  // The time left and the arc, every second.
  function tickView(now) {
    const st = data.state, left = el.querySelector('.pm-left');
    if (!left) return;
    const end = P.phaseEnd(st, cfg);
    const total = (st.phase === 'break' ? cfg.break : cfg.work) * 60000;
    const remaining = st.phase === 'idle' ? total : end - now;
    const text = mmss(remaining);
    if (left.textContent !== text) left.textContent = text;
    const until = el.querySelector('.pm-until'), u = st.phase === 'idle' ? '' : 'until ' + timeText(new Date(end));
    if (until.textContent !== u) until.textContent = u;
    const off = Math.round(st.phase === 'idle' ? RING : RING * (1 - Math.min(1, remaining / total)));
    if (off !== offset) { offset = off; el.querySelector('.pm-arc').setAttribute('stroke-dashoffset', String(off)); }
  }

  function cue(name) {
    chime(SOUNDS[name]);
    const flash = el.querySelector('.pm-flash');
    if (flash) { flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on'); }
  }

  function step() {
    const now = Date.now();
    if (!clockIsSane(new Date(now), __BUILT_AT__)) return; // keep the timer as it is until real time arrives
    const r = P.advance(data.state, now, cfg);
    if (r.state === data.state) return;
    data.state = r.state;
    if (r.logged) data.log.push(r.logged);
    save(data);
    if (r.cue && onCue) onCue();
    if (visible || r.cue) render();
    if (r.cue) cue(r.cue);
  }

  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]'), a = e.target.closest('[data-act]');
    const now = Date.now();
    if (c) {
      const id = c.getAttribute('data-cat');
      data.cat = id;
      if (data.state.phase === 'work') data.state = Object.assign({}, data.state, { cat: id });
      else if (data.state.phase === 'break') {
        const last = data.log[data.log.length - 1];
        if (last && last.end === data.state.start) last.cat = id; // retag the session just finished
        data.state = Object.assign({}, data.state, { cat: id });
      }
      save(data);
    } else if (a && !a.disabled) {
      const act = a.getAttribute('data-act');
      if (act === 'start') {
        data.state = { phase: 'work', start: now, cat: data.cat || data.state.cat || cats[0].id };
        data.cat = data.state.cat;
        chime(SOUNDS.start);
      } else if (act === 'stop') {
        // Two taps, so a stray one doesn't end 40 minutes of work.
        if (now >= confirmUntil) {
          confirmUntil = now + CONFIRM_MS;
          setTimeout(render, CONFIRM_MS + 50);
        } else {
          const r = P.stopWork(data.state, now);
          data.state = r.state;
          if (r.logged) data.log.push(r.logged);
          confirmUntil = 0;
        }
      } else if (act === 'skip') {
        data.state = { phase: 'idle', start: 0, cat: data.state.cat };
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
    busy() { return data.state.phase !== 'idle'; },
  };
}
