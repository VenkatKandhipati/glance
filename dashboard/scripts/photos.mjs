// Resizes photos from dashboard/photos/ into dashboard/.photos-resized/ for the frame:
// JPEG, at most 1280 px on the long side, quality 80. Uses macOS's built-in `sips`.
// Unchanged photos are skipped; copies whose original was deleted are removed.
// Both folders are gitignored. Run with `npm run photos`, then reload (dev) or rebuild.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'photos');
const OUT = join(ROOT, '.photos-resized');
const MAX = 1280;
const TYPES = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tif', '.tiff']);

mkdirSync(OUT, { recursive: true });

const sources = readdirSync(SRC).filter((f) => TYPES.has(extname(f).toLowerCase()));
const wanted = new Set();
let made = 0, skipped = 0, failed = 0;

for (const file of sources) {
  const src = join(SRC, file);
  // Keep the extension in the name so IMG_1.jpg and IMG_1.heic don't collide.
  const name = basename(file, extname(file)) + '-' + extname(file).slice(1).toLowerCase() + '.jpg';
  const out = join(OUT, name);
  wanted.add(name);
  if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) { skipped++; continue; }

  try {
    const info = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src], { encoding: 'utf8' });
    const w = Number(/pixelWidth: (\d+)/.exec(info)[1]), h = Number(/pixelHeight: (\d+)/.exec(info)[1]);
    const args = ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80'];
    if (Math.max(w, h) > MAX) args.push('-Z', String(MAX)); // never upscale small photos
    execFileSync('sips', [...args, src, '--out', out], { stdio: 'ignore' });
    made++;
  } catch (e) {
    console.warn('Could not convert', file, '-', e.message.split('\n')[0]);
    failed++;
  }
}

let removed = 0;
for (const f of readdirSync(OUT)) {
  if (!wanted.has(f)) { rmSync(join(OUT, f)); removed++; }
}

console.log(`photos: ${made} resized, ${skipped} unchanged, ${removed} removed, ${failed} failed → ${OUT}`);
