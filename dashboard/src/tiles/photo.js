// Photo tile: crossfades through the resized photos from `npm run photos`.
// Two <img> layers only; the next photo is fully loaded before it fades in, so at most two
// photos are decoded at a time (1 GB of RAM on the frame).
import { featured, settings } from '../content.js';
import { startFeatured } from '../featured.js';
import { createPicker } from './photo-picker.js';
import files from './photo-files.js';
import { DEMO, demoPhotos } from '../demo.js';

// Served by the Mac, the photos are bundled (photo-files.js). In the frame build the kiosk serves
// them from the frame's storage and lists them at /photos/.

function photoUrls() {
  if (DEMO) return Promise.resolve(demoPhotos);
  if (!__FRAME__) return Promise.resolve(Object.values(files));
  return fetch('/photos/', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : []))
    .then((names) => names.map((n) => '/photos/' + encodeURIComponent(n)), () => []);
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}

// Returns next(): show another photo now (a tap on the tile).
export function startPhotos(el) {
  let next = () => {};
  photoUrls().then((list) => { next = show(el, shuffle(list)); });
  return () => next();
}

function show(el, urls) {
  if (!urls.length) {
    el.innerHTML =
      '<div class="photo-empty"><h2 class="serif">Your photos<i>,</i><br>right here.</h2>' +
      '<p>Drop photos into <code>dashboard/photos/</code>, then run <code>' + (__FRAME__ ? 'npm run frame' : 'npm run photos') +
      '</code> on the Mac.</p></div>';
    return () => {};
  }

  const picker = createPicker(urls);
  const nextFeatured = startFeatured();
  const layers = [new Image(), new Image()];
  // CORS mode, like picture-check.js's loads, so a picture it measured comes from the cache.
  layers.forEach((img) => { img.className = 'photo-img'; img.alt = ''; img.crossOrigin = 'anonymous'; el.appendChild(img); });
  // The credit line under a picture from featured-data.js; empty for your own photos.
  const caption = el.appendChild(document.createElement('div'));
  caption.className = 'photo-cap';
  let front = 0, current = null, turn = 0;

  // Every `featured.every`th turn shows a picture from a public source instead of yours.
  function next() {
    turn++;
    const extra = featured.every && turn % featured.every === 0 ? nextFeatured() : null;
    load(extra ? extra.url : picker.pick(current), extra);
  }

  function load(url, extra) {
    const back = layers[1 - front];
    back.onload = () => {
      if (!extra) picker.loaded(url);
      current = url;
      back.classList.toggle('is-contain', !!extra && extra.fit === 'contain');
      caption.textContent = extra ? extra.caption : '';
      caption.classList.toggle('is-on', !!extra);
      back.classList.add('is-on');
      layers[front].classList.remove('is-on');
      front = 1 - front;
    };
    // Keep the photo on screen; the next turn tries a cached one instead. A public picture that
    // won't load gives its turn to one of yours.
    back.onerror = () => (extra ? load(picker.pick(current), null) : picker.failed());
    // Re-showing the photo already in this layer: setting the same src may not fire load again.
    if (back.complete && back.naturalWidth && back.src === new URL(url, location.href).href) back.onload();
    else back.src = url;
  }

  next();
  if (urls.length < 2 && !featured.every) return () => {};
  let timer = setInterval(next, settings.photoSeconds * 1000);
  // A tap moves on now, and the photo it brings gets its full time on screen.
  return () => {
    clearInterval(timer);
    next();
    timer = setInterval(next, settings.photoSeconds * 1000);
  };
}
