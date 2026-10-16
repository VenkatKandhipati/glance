// Photo tile: crossfades through the resized photos from `npm run photos`.
// Two <img> layers only; the next photo is fully loaded before it fades in, so at most two
// photos are decoded at a time (1 GB of RAM on the frame).
import { settings } from '../content.js';
import { createPicker } from './photo-picker.js';
import files from './photo-files.js';

// Served by the Mac, the photos are bundled (photo-files.js). In the frame build the kiosk serves
// them from the frame's storage and lists them at /photos/.

function photoUrls() {
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

export function startPhotos(el) {
  photoUrls().then((list) => show(el, shuffle(list)));
}

function show(el, urls) {
  if (!urls.length) {
    el.innerHTML =
      '<div class="photo-empty"><h2 class="serif">Your photos<i>,</i><br>right here.</h2>' +
      '<p>Drop photos into <code>dashboard/photos/</code>, then run <code>' + (__FRAME__ ? 'npm run frame' : 'npm run photos') +
      '</code> on the Mac.</p></div>';
    return;
  }

  const picker = createPicker(urls);
  const layers = [new Image(), new Image()];
  layers.forEach((img) => { img.className = 'photo-img'; img.alt = ''; el.appendChild(img); });
  let front = 0, current = null;

  function next() {
    const back = layers[1 - front];
    const url = picker.pick(current);
    back.onload = () => {
      picker.loaded(url);
      current = url;
      back.classList.add('is-on');
      layers[front].classList.remove('is-on');
      front = 1 - front;
    };
    // Keep the photo on screen; the next turn tries a cached one instead.
    back.onerror = () => picker.failed();
    // Re-showing the photo already in this layer: setting the same src may not fire load again.
    if (back.complete && back.naturalWidth && back.src === new URL(url, location.href).href) back.onload();
    else back.src = url;
  }

  next();
  if (urls.length > 1) setInterval(next, settings.photoSeconds * 1000);
}
