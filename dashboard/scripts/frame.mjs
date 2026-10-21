// Puts the dashboard on the frame so it runs with no Mac (Phase 1.5).
//
//   npm run frame:build   resize photos, build the frame copy, package kiosk/build/glance-kiosk.apk
//   npm run frame         the same, then over USB: install the app, sync the photos, open it
//
// The page goes inside the app (kiosk/assets/www/, gitignored); photos go to the app's folder on
// the frame's storage, so new photos need no reinstall. Needs JDK 17 and the Android SDK
// (kiosk/README.md), and dashboard/.env.local with WMATA_API_KEY.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DASH = new URL('..', import.meta.url).pathname;
const KIOSK = join(DASH, '..', 'kiosk');
const PHOTOS = join(DASH, '.photos-resized');
const REMOTE = '/sdcard/Android/data/app.glance.kiosk/files/photos';
const ORIGIN = 'https://glance.local/';
const install = process.argv.includes('--install');

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8' }).replace(/\r/g, '').trim();
const step = (s) => console.log('\n▸ ' + s);

// The Homebrew JDK isn't registered with macOS, so point at it unless JAVA_HOME is set.
const brewJdk = '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home';
const env = { ...process.env };
if (!env.JAVA_HOME && existsSync(brewJdk)) {
  env.JAVA_HOME = brewJdk;
  env.PATH = join(brewJdk, 'bin') + ':' + env.PATH;
}

step('Resizing photos');
run('node', [join(DASH, 'scripts/photos.mjs')]);

step('Building the frame copy of the dashboard');
run('npx', ['vite', 'build', '--mode', 'frame'], { cwd: DASH });
run('node', [join(DASH, 'scripts/check-compat.mjs'), 'dist-frame']);

step('Packaging the kiosk app');
rmSync(join(KIOSK, 'assets'), { recursive: true, force: true });
cpSync(join(DASH, 'dist-frame'), join(KIOSK, 'assets/www'), { recursive: true });
run('bash', [join(KIOSK, 'build.sh')], { env });

if (!install) {
  console.log('\nBuilt kiosk/build/glance-kiosk.apk. `npm run frame` installs it over USB.');
  process.exit(0);
}

step('Checking the frame');
if (!adb('shell', 'getprop', 'ro.build.fingerprint').startsWith('rockchip/rk3326_go/')) {
  console.error('This is not the RK3326 frame (see docs/frame.md). Stopping.');
  process.exit(1);
}

step('Installing the app');
run('adb', ['install', '-r', join(KIOSK, 'build/glance-kiosk.apk')]);

step('Syncing photos');
adb('shell', 'mkdir', '-p', REMOTE);
const local = existsSync(PHOTOS) ? readdirSync(PHOTOS).filter((f) => f.endsWith('.jpg')) : [];
if (local.length) run('adb', ['push', '--sync', PHOTOS + '/.', REMOTE + '/']);
const remote = adb('shell', 'ls', REMOTE).split('\n').filter(Boolean);
const stale = remote.filter((f) => !local.includes(f));
// adb shell joins its arguments into one command line, so quote names (they can have spaces).
const quote = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
for (const f of stale) adb('shell', 'rm ' + quote(REMOTE + '/' + f));
console.log(`photos: ${local.length} on the frame, ${stale.length} removed`);

step('Opening the dashboard');
adb('shell', 'am', 'start', '-n', 'app.glance.kiosk/.MainActivity', '--es', 'url', ORIGIN);
console.log('\nDone: the frame now runs ' + ORIGIN + ' from the app, with no Mac.');
