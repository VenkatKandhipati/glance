// Photo tile: crossfades through the resized photos from `npm run photos`.
// Two <img> layers only; the next photo is fully loaded before it fades in, so at most two
// photos are decoded at a time (1 GB of RAM on the frame).
import { settings } from '../content.js';

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

  const layers = [new Image(), new Image()];
  layers.forEach((img) => { img.className = 'photo-img'; img.alt = ''; el.appendChild(img); });
  let i = 0, front = 0;

  function show() {
    const back = layers[1 - front];
    const url = urls[i % urls.length];
    i++;
    back.onload = () => {
      back.classList.add('is-on');
      layers[front].classList.remove('is-on');
      front = 1 - front;
    };
    back.onerror = () => setTimeout(show, 2000); // skip a broken file
    back.src = url;
  }

  show();
  if (urls.length > 1) setInterval(show, settings.photoSeconds * 1000);
}
