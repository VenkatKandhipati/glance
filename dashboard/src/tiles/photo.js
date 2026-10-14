// Photo tile: crossfades through the resized photos from `npm run photos`.
// Two <img> layers only; the next photo is fully loaded before it fades in, so at most two
// photos are decoded at a time (1 GB of RAM on the frame).
import { settings } from '../content.js';
import { createPicker } from './photo-picker.js';

// Filled at build time from dashboard/.photos-resized/ (gitignored). Empty until photos are added.
const files = import.meta.glob('../../.photos-resized/*.jpg', { eager: true, query: '?url', import: 'default' });

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}

export function startPhotos(el) {
  const urls = shuffle(Object.values(files));
  if (!urls.length) {
    el.innerHTML =
      '<div class="photo-empty"><h2 class="serif">Your photos<i>,</i><br>right here.</h2>' +
      '<p>Drop photos into <code>dashboard/photos/</code>, then run <code>npm run photos</code> on the Mac.</p></div>';
    return;
  }

  const picker = createPicker(urls);
  const layers = [new Image(), new Image()];
  layers.forEach((img) => { img.className = 'photo-img'; img.alt = ''; el.appendChild(img); });
  let front = 0, current = null;

  function show() {
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

  show();
  if (urls.length > 1) setInterval(show, settings.photoSeconds * 1000);
}
