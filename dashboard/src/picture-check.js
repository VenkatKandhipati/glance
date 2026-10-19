// Decides whether a picture from a public source is good enough to show: downloads it, then has
// picture-worker.js measure it with picture-score.js at the size the photo tile would show it
// (sharp enough, big enough, and in content.js's `featured.style`). The worker decodes and reads
// the pixels, so the page itself only downloads. One picture at a time, a few seconds apart;
// verdicts are remembered on the frame, so a picture is only measured once.
//
// Reading a picture's pixels needs CORS. The Art Institute, Commons and APOD send it; Cleveland and
// NASA's image library don't, so their pictures come through the kiosk app (/img?url=, see
// kiosk/…/LocalSite.java) or, served by the Mac, its /img (server/img.mjs).
import { featured } from './content.js';
import { RULES } from './picture-score.js';

const PROXIED = /^https:\/\/(openaccess-cdn\.clevelandart\.org|images-assets\.nasa\.gov)\//;
const KEY = 'glance-pictures';
const KEEP = 3000;     // verdicts remembered
const GAP_MS = 3000;   // between measurements

// The address the page loads a picture from: through the proxy when its host sends no CORS.
export function loadUrl(url) {
  return PROXIED.test(url) ? '/img?url=' + encodeURIComponent(url) : url;
}

function loadVerdicts() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
const verdicts = loadVerdicts();
function remember(url, verdict) {
  verdicts[url] = verdict;
  const keys = Object.keys(verdicts);
  if (keys.length > KEEP) keys.slice(0, keys.length - KEEP).forEach((k) => { delete verdicts[k]; });
  try { localStorage.setItem(KEY, JSON.stringify(verdicts)); } catch (e) { /* full or blocked: measure again next time */ }
}

let worker = null, nextId = 0;
const waiting = {}; // id → resolve

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./picture-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const done = waiting[e.data.id];
      delete waiting[e.data.id];
      if (done) done(e.data);
    };
  }
  return worker;
}

// { ok, why, retry } for one candidate. Never throws.
export function measure(item) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  return fetch(loadUrl(item.url), { mode: 'cors', signal: ctrl.signal })
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((blob) => new Promise((resolve) => {
      const id = ++nextId;
      waiting[id] = resolve;
      getWorker().postMessage({ id, blob, fit: item.fit, style: featured.style });
    }))
    .catch((e) => ({ ok: false, why: String(e.message || e), retry: true }))
    .finally(() => clearTimeout(timer));
}

// One queue for every source: candidates are measured one at a time, and each good one is handed
// to its source's onGood with the address to show it from. A failed load is tried again on a later
// day, not remembered.
const queue = [];
let busy = false;

function next() {
  if (busy || !queue.length) return;
  const { item, onGood } = queue.shift();
  const key = featured.style + RULES + ' ' + item.url;
  const known = verdicts[key];
  if (known !== undefined) {
    if (known) onGood(Object.assign({}, item, { url: loadUrl(item.url) }));
    next();
    return;
  }
  busy = true;
  measure(item).then((r) => {
    if (!r.retry) remember(key, r.ok);
    if (r.ok) onGood(Object.assign({}, item, { url: loadUrl(item.url) }));
    setTimeout(() => { busy = false; next(); }, GAP_MS);
  });
}

export function check(items, onGood) {
  items.forEach((item) => queue.push({ item, onGood }));
  next();
}
