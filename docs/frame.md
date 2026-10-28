# The frame

What Glance runs on, what that rules out, and how the page gets onto it.

## Hardware

Read over ADB on 2026-10-16.

| | |
| --- | --- |
| Model | Akimart ZN-DP1002, 10.1" (reports itself as model `Frame`, brand `SSA`) |
| SoC | Rockchip RK3326: 4× Cortex-A35 at 1.5 GHz (32-bit userland, `armeabi-v7a`), Mali-G31 GPU (OpenGL ES 3.2) |
| Memory / storage | 1 GB RAM (360 MB zRAM), 32 GB logical NAND (`rknand0`, `/dev/block/by-name` present) |
| Screen | 1280 × 800 landscape at **47 Hz**, density 160 (devicePixelRatio 1), touch; no navigation bar |
| Touch | gslX680, 480 × 800 raw (Android scales X by 2.66). No jitter, but near the bottom edge it reports taps 25–50 px **below** the finger |
| Wi-Fi | AIC8800 (`aicwf_sdio`) |
| OS | Android 8.1 (API 27), firmware `SSA_Frame_20250928`, security patch 2020-06-05, SELinux permissive |
| Browser engine | Android System WebView 106.0.5249.126, put in `/system` by this project (it shipped with 61) |
| Access | USB ADB once enabled in Frameo (Settings → About → Beta Program → ADB access); root as `su 0 <cmd>` |
| Came with | Frameo (`net.frameo.frame`) as the Home app; vendor updaters `com.adups.fota` and `android.rockchip.update.service` |
| Runs | Glance's kiosk app ([`kiosk/`](../kiosk/README.md)), one fullscreen WebView, as the Home app; boots into the dashboard over Wi-Fi |

The same product name ships with different boards. This one matches the RK3326 unit in
[wesbos/photo-frame-dashboard `docs/akimart-zn-dp1002.md`](https://github.com/wesbos/photo-frame-dashboard/blob/main/docs/akimart-zn-dp1002.md),
partition table included, but with older firmware (`20250928` against `20260420`), which is why
it still had WebView 61. Another ZN-DP1002 has an RK3126 and Android 6
([PR #42](https://github.com/wesbos/photo-frame-dashboard/pull/42)); its script and partition
offsets don't apply. Check `adb shell getprop ro.build.fingerprint` (`rockchip/rk3326_go/…`)
before following any guide for this model.

Frameo uses the built-in root itself: at boot it runs `/system/xbin/su` and disables
`com.android.systemui` (status bar and notifications; `enabledCaller="shell:0"` in
`package-restrictions.xml`). That stays disabled even with Frameo off. Undo, if ever needed:
`su 0 pm enable com.android.systemui`.

A verified firmware backup (the first 8 MiB of the NAND and partitions 1–15, everything except
userdata) was taken with [`scripts/frame-backup.sh`](../scripts/frame-backup.sh) before the first
change. It lives outside the repo.

## What the browser can't do

Chrome 106 features, plus a few things these WebViews rejected in practice. The build enforces
most of them: `npm run build` runs [`scripts/check-compat.mjs`](../dashboard/scripts/check-compat.mjs).

| Avoid | Why | Use instead |
| --- | --- | --- |
| 4/8-digit hex (`#0008`) | Rejected on frames like this | `rgba()`; Vite's `cssTarget: 'chrome61'` stops the minifier producing them |
| `oklch()`, `color-mix()`, Tailwind v4 | Not in Chrome 106 | `#rrggbb`, `rgba()` |
| CSS nesting, `:has()` | Not supported / didn't work on-device | Flat selectors, classes |
| `dvh`, `svh` | Chrome 108+ | `px` (the page is a fixed 1280 × 800) |
| `toSorted()`, `Object.groupBy()`, … | Chrome 110+ | Older equivalents; the bundler doesn't polyfill |
| `backdrop-filter`, big blurs, shadows | Too slow for a Mali-G31 at 1280 × 800 | Pre-darkened images, flat fills |
| `alert()`, pop-ups, `target="_blank"` | The kiosk has no handler / no way back | In-page UI |
| Two-finger hold | Opens the kiosk's own menu | Single taps |

## Touch

Measured 2026-10-16 with `getevent` on six taps aimed at a 46 px chip (screen y 702–748): each was
a clean press with no movement, reported at y 750–775, just under the chip. Only 2–3 of 6
registered. Design for it: big targets, and no small controls along the bottom edge. (The
chores strip, since replaced by the Metro banner, counted a tap anywhere in its tile.) The month
grid's 31 px days are the one small target: a tap opens the day sheet, whose ‹ › buttons fix a
tap that landed a row off. `adb shell input tap x y` skips the touch controller, so it lands
exactly; use it to test layouts, not touch accuracy.

## Performance rules

- Animate only `opacity` and `transform`.
- Update only what changed: the clock once a minute, the calendar at midnight.
- Images at display size: photos are resized to ≤ 1280 px before the frame sees them, and at
  most two are decoded at once.
- Measure on the frame with `?diag` (fps, long frames, DOM nodes, image megapixels, heap) before
  and after a change. The panel runs at 47 Hz, so 47 fps is full speed.

Baseline, 2026-10-16 (dev server over USB, no photos yet): **47 fps** at rest, 2–3 long frames,
all at page load; 106 DOM nodes; JS heap 10 MB; kiosk 40 MB PSS plus 33 MB for the WebView
renderer. The kiosk window is up 1.5 s after launch.

Hour-long run, 2026-10-27 17:25–18:26 (built-in copy with `?diag`, Home, the owner's 40 photos and
public pictures rotating every 2 min): JS heap **10 MB** at the start and after 60 min; decoded
images 1.2 MP → 2.2 MP (one or two pictures, two during a crossfade); 787 → 814 DOM nodes; 47 fps
throughout. WebView renderer PSS rises and falls between about 62 and 76 MB with the pictures, with
level peaks (76.1, 76.2, 76.2, 76.7, 76.2 MB). The kiosk app crept 55.9 → 58.0 MB, slowing every
10 minutes (+0.9, +0.7, +0.3, +0.4, +0.3 MB), then held at 58.2–58.3 MB for the next 12 min. No
console messages in logcat. About 2 long frames per picture change; none from the burn-in shift.
Method (reads only): `dumpsys meminfo` for `app.glance.kiosk` and the `webview:sandbox…` renderer
once a minute, `adb exec-out screencap` for the `?diag` box, `adb logcat`.

## Running unattended

- **Boot:** Wi-Fi comes up after the kiosk. The kiosk retries the page every 5 s; the page reloads
  itself if its script hasn't started within 10 s.
- **Clock after a power cut:** until network time arrives the frame reads its firmware build date,
  28 Sep 2025 (other frames read 1970). The calendar only trusts a time later than the dashboard's
  own build, and redraws when the real date arrives. So a power cut during a Wi-Fi outage shows
  that date, no weather, no events and no stale badges until Wi-Fi is back (checked 2026-10-27);
  everything returns within a minute of network time, the weather on its next poll.
- **Leaks:** the page reloads itself daily at 3 a.m.

## Network

- Day to day the page comes from **inside the kiosk app** at `https://glance.local/`, a host that
  exists only in its WebView (see below); while developing, from the Mac over plain HTTP by IP
  address (Android 8.1 doesn't resolve `.local` names on the network).
- **Third-party services, each approved by the owner.** Nothing else goes on the frame.
- **WMATA (2026-10-16).** The frame build calls
  `api.wmata.com` directly with the key baked in at build time, so the Metro banner works with
  the Mac off. Anyone who can reach the frame can read that key (any app can get root), which is
  acceptable for a free, rate-limited key that can be regenerated. Move it to the home server
  when there is one.
- **Google Calendar (2026-10-16).** The frame build carries the secret iCal
  addresses of three calendars (`CAL_*` in `.env.local`). Google sends no CORS headers, so the
  kiosk fetches them (`/ics?url=`, `calendar.google.com` over HTTPS only) and the page parses them.
  Anyone who reaches the frame can read those addresses, so the events too: if one leaks, Reset
  it in Google Calendar and run `npm run frame`.
- **The National Weather Service (2026-10-19).** The page asks
  `api.weather.gov` for the forecast at `content.js`'s `weather` spot every 30 minutes, from the
  frame and the Mac's copy alike. No key and nothing secret: it sends CORS headers, so the page
  calls it directly.
- **Public pictures (2026-10-19).** The photo tile shows pictures from public collections
  between the owner's photos, fetched once a day with no key: the Art Institute of Chicago
  (`api.artic.edu`, images from `www.artic.edu/iiif`), NASA (`api.nasa.gov` with the shared
  `DEMO_KEY`, `images-api.nasa.gov`, images from `apod.nasa.gov` and `images-assets.nasa.gov`)
  and Wikimedia Commons (`commons.wikimedia.org`, images from `thumb.wikimedia.org`), and the
  Cleveland Museum of Art (`openaccess-api.clevelandart.org`, images from
  `openaccess-cdn.clevelandart.org`). NASA's image library and the Art Institute's API chain to
  Starfield Services Root G2, Cleveland to GlobalSign Root CA, the rest to ISRG Root X1; all are in
  the frame's store. Checked from the kiosk's WebView 2026-10-19: every API answered and every
  image loaded. (The Met was tried and dropped: its web images are about 500 px, too small.)
- **Every public picture is measured before it's shown** (`picture-check.js`, in a worker): sharp
  at its shown size, big enough, and dark enough for `featured.style`. Reading pixels needs CORS;
  the Cleveland CDN and NASA's image library send none, so the kiosk fetches those two hosts'
  pictures itself at `/img?url=` and keeps them a week in its cache folder. Measuring on the page's
  main thread stalled it for up to 770 ms a picture; in the worker, no long tasks at all. No other service goes on the frame.
- Trust store: the 2025 firmware ships a store from about 2023 (205 roots, newest March 2023),
  despite the 2020 security patch. It has ISRG Root X1 and X2, Sectigo R46 (WMATA's root), GTS,
  Amazon and DigiCert G2, but no roots from 2024 on, such as ISRG Root YR. A site on Let's
  Encrypt's YR hierarchy still works if it also sends YR cross-signed by X1, as `api.weather.gov`
  does (checked on the frame 2026-10-19). Checked 2026-10-16: the
  kiosk's WebView reached `https://api.wmata.com` and got WMATA's own reply.
- Fonts and images are bundled; nothing loads from a CDN.
- Keep it on a guest or IoT network: Android 8.1 with a 2020 security patch, and any app can
  get root.

## How the page gets onto the frame

**Day to day: inside the kiosk app.** `npm run frame` builds a frame copy of the dashboard
(`vite build --mode frame` into `dist-frame/`), packages it into the app's `assets/www/`, installs
the app over USB, copies the resized photos to `/sdcard/Android/data/app.glance.kiosk/files/photos/`,
and points the kiosk at `https://glance.local/`. The kiosk answers that host itself
([`LocalSite.java`](../kiosk/src/app/glance/kiosk/LocalSite.java)): pages from the APK, photos
and their list (`/photos/`) from storage. Nothing depends on the Mac or the LAN; the Metro banner
needs internet. Changing content, photos or design means running `npm run frame` again with the
frame on USB.

**Careful:** `npm run frame` makes the frame's photos match `dashboard/photos/` on the Mac it runs
on, removing any the Mac doesn't have. From a Mac without your photos, build with
`npm run frame:build` and install with `adb install -r kiosk/build/glance-kiosk.apk` instead.

**Trying a change on the frame.** The owner judges changes on the frame, not on the Mac: sizes,
colours and touch feel different on its screen. So once a change to `dashboard/` or `kiosk/` passes
the checks, put that branch's build on the frame (USB connected) without asking first:

1. Check `adb shell getprop ro.build.fingerprint` starts with `rockchip/rk3326_go/`.
2. Back up the Pomodoro log off-repo:
   `adb pull /sdcard/Android/data/app.glance.kiosk/files/pomodoro.json <scratch dir>/`.
3. `cd dashboard && npm run frame:build`, then `adb install -r kiosk/build/glance-kiosk.apk` and
   `adb shell am start -n app.glance.kiosk/.MainActivity --es url https://glance.local/`. Not
   `npm run frame` unless that Mac has all the photos (see above).
4. Check the photo count is unchanged, open the changed screen with `adb shell input tap`, and
   compare `adb exec-out screencap -p` with the Mac's screenshot.
5. Add a row to the table below, naming the branch or PR; the undo is a rebuild from `main`.

If the PR is then changed or closed, put `main`'s build back the same way.

**Developing: from the Mac.** Over USB:

```sh
cd dashboard && npm run dev
adb reverse tcp:5173 tcp:5173
adb shell 'am start -a android.intent.action.VIEW -d "http://127.0.0.1:5173/" -n app.glance.kiosk/.MainActivity --ez debug true'
# then chrome://inspect on the Mac for the console
```

Or over Wi-Fi from `npm run build && npm run preview` (port 4173):
`adb shell am start -n app.glance.kiosk/.MainActivity --es url http://<mac-lan-ip>:4173/`. That
copy gets its Metro times from the Mac's `/api/trains`, which keeps the key on the Mac. Go back to
the built-in copy with `--es url https://glance.local/`.

## Changes made to this frame

Record every change with its undo, newest last. All `su 0` commands run through `adb shell`.

| Date | Change | Undo |
| --- | --- | --- |
| 2026-10-16 | Turned on ADB from Frameo's own settings (Settings → About → Beta Program → ADB access). Wi-Fi was skipped in Frameo's setup | Turn the same switches off |
| 2026-10-16 | Disabled the vendor updaters: `su 0 pm disable-user --user 0 com.adups.fota` and `… android.rockchip.update.service` (read back `enabled=3`, no process) | `su 0 pm default-state --user 0 <package>` |
| 2026-10-16 | WebView 61 → 106.0.5249.126 in `/system/app/webview`: LineageOS prebuilt `webview.apk` (SHA-256 `e2edc1f8…0580`, same file as wesbos PR #42), its three `.so` files unpacked into `lib/arm/`, old `oat/` removed. It can't go in as an update: the stock WebView has a different signing key. Original kept as `webview.apk.bak` (SHA-256 `db1f9a14…bc3b`), old `oat/` in `/data/local/tmp/glance/oat-61` | `su 0 mount -o remount,rw /system`, move `webview.apk.bak` back to `webview.apk`, `rm -rf lib`, copy `oat-61` back as `oat`, remount read-only, reboot. Last resort: write `p11-system` from the firmware backup back to the partition |
| 2026-10-16 | Installed Glance's kiosk `app.glance.kiosk` 0.1 (`adb install -r kiosk/build/glance-kiosk.apk`), signed with the Mac's debug key. Home app unchanged (Frameo), no URL saved | `adb uninstall app.glance.kiosk` |
| 2026-10-16 | Joined Wi-Fi (owner, on the frame); network time arrived at once. Timezone America/Los_Angeles → America/New_York: `su 0 service call alarm 3 s16 America/New_York` (AlarmManager.setTimeZone, so apps get the change without a restart; automatic timezone is off) | Same command with `America/Los_Angeles` |
| 2026-10-16 | Saved the kiosk URL `http://<mac-lan-ip>:4173/` (`am start -n app.glance.kiosk/.MainActivity --es url …`); the Mac has a DHCP reservation to set | The same command with another URL |
| 2026-10-16 | Kiosk as Home: `am start -n app.glance.kiosk/.MainActivity --ez home true`, then `cmd package set-home-activity --user 0 app.glance.kiosk/.Home` | `cmd package set-home-activity --user 0 net.frameo.frame/.ui.activities.AWaitForDeferredInitCompleted` (after re-enabling Frameo), then `--ez home false` |
| 2026-10-16 | Disabled Frameo: `su 0 pm disable-user --user 0 net.frameo.frame`. ADB stays on (`adb_enabled=1`); its switch is now in Developer options | `su 0 pm default-state --user 0 net.frameo.frame` |
| 2026-10-16 | Turned on Glance navigation (floating Back / Dashboard outside the kiosk): `settings put secure enabled_accessibility_services app.glance.kiosk/app.glance.kiosk.NavigationService`, `settings put secure accessibility_enabled 1` (both were unset/0) | `settings delete secure enabled_accessibility_services`, `settings put secure accessibility_enabled 0` |
| 2026-10-16 | Kiosk 0.2 with the dashboard built in (`npm run frame`): app updated (`adb install -r`), 40 resized photos (13 MB) pushed to `/sdcard/Android/data/app.glance.kiosk/files/photos/`, saved URL → `https://glance.local/`. The app now holds the WMATA API key (owner-approved). After `adb reboot` with no server running on the Mac, it came up on the dashboard with photos and live trains | Saved URL back to the Mac (`--es url http://<mac-lan-ip>:4173/`); `adb install -r` an older build; photos go with `adb uninstall app.glance.kiosk`. Regenerate the WMATA key if it leaks |
| 2026-10-16 | Kiosk with live Google Calendar (`npm run frame`): the app now holds three calendar secret addresses and fetches them every 10 minutes | Reinstall without `CAL_*` in `.env.local`; Reset the addresses in Google Calendar if they leak |
| 2026-10-19 | Kiosk with weather (`npm run frame`): the page asks `api.weather.gov` every 30 minutes; the Metro banner stops asking WMATA while the night clock is up | `adb install -r` an older build |
| 2026-10-19 | Power-cut test: unplugged 10 s with the Mac's server off. Booted straight into the kiosk and the dashboard within about a minute, with the right time, trains, calendar, weather and photos | — |
| 2026-10-19 | Kiosk 0.3 (`npm run frame`): screens, taps, and the backlight bridge. From midnight to 8 a.m. the page asks the app to turn the backlight off; the app writes `0` to `/sys/class/backlight/backlight/brightness` through `su 0` and writes Android's own brightness setting (179) back on a tap or when it leaves the foreground. Checked on the frame: off → `0`, tap → `179` | Tap the screen; if it ever stays dark, `adb shell su 0 sh -c 'echo 179 > /sys/class/backlight/backlight/brightness'`. Undo the feature with `night.off`/`night.on` equal in `content.js`, or an older build |
| 2026-10-19 | Kiosk 0.4 (`npm run frame`): Glance's own icon, weather warnings on Home | `adb install -r` an older build |
| 2026-10-19 | Full brightness: `settings put system screen_brightness 255` (was 179), `screen_brightness_mode` 0 (already manual). The night screen-off writes this setting back on a tap | `settings put system screen_brightness 179` |
| 2026-10-19 | Kiosk with public pictures between the owner's photos (`npm run frame`): the page fetches from the Art Institute of Chicago, NASA and Wikimedia Commons once a day | `featured.every: 0` in `content.js`, or an older build |
| 2026-10-19 | Kiosk with South Asian art and nature in the mix (`npm run frame`): adds the Cleveland Museum of Art and the Met | Drop `south-asian-art` / `south-asian-nature` from `featured.sources`, or an older build |
| 2026-10-19 | Kiosk 0.5 (`npm run frame`): `/img` picture pass-through with a week's file cache in `/data/data/app.glance.kiosk/cache/img/`; public pictures measured before showing, dark style; the Met dropped | `adb install -r` an older build; `featured.style: 'any'` keeps the quality check only |
| 2026-10-19 | Kiosk 0.6 (`npm run frame`): `GlanceFiles` bridge; the Pomodoro log's backup in `/sdcard/Android/data/app.glance.kiosk/files/pomodoro.json` | `adb install -r` an older build; the file can be deleted with `adb shell rm` (the page keeps its own copy) |
| 2026-10-21 | Kiosk 0.6 rebuilt from main with stale-data badges (#5) and burn-in shifts (#6): `npm run frame:build`, then `adb install -r kiosk/build/glance-kiosk.apk` and `am start … --es url https://glance.local/`. Not `npm run frame`: the Mac it was built on had no photos, and the sync would have removed all 40 from the frame. `dashboard/.env.local` was recreated on that Mac from the values in the installed app. Same signing key, app data and photos kept; the Pomodoro log was backed up first. The page now also stores `glance-weather` and `glance-calendars` | `adb install -r` the previous 0.6 APK (kept off-repo); `shift.px: 0` in `content.js` turns the shift off |
| 2026-10-21 | Kiosk 0.6 rebuilt from the `11-telugu-screen` branch (PR #13, not yet merged) for the owner to try the Telugu screen: the same `npm run frame:build` and `adb install -r` as above, Pomodoro log backed up first; 40 photos and app data kept. Checked on the frame with `screencap`: the Telugu screen draws in the bundled Noto Sans Telugu, matching the Mac | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk` |
| 2026-10-21 | Kiosk 0.6 rebuilt again from `11-telugu-screen` (PR #13, second round: centred letters, three pages, softer letter colour), the same way. 40 photos kept; on all three pages every letter sits where the Mac draws it, offset only by the burn-in shift | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk` |
| 2026-10-21 | Kiosk 0.6 rebuilt from `11-telugu-screen` (PR #13, third round: a word beside each later consonant, dimmer letters), the same way. 40 photos kept; Consonants 2 matches the Mac's screenshot to within 1 px | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk` |
| 2026-10-21 | Kiosk 0.6 rebuilt from `11-telugu-screen` (PR #13, fourth round: words for the last eight consonants only), the same way. 40 photos kept; Consonants 2 matches the Mac's screenshot to within 1 px | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk` |
| 2026-10-21 | Kiosk 0.6 rebuilt from `12-time-tracking` (Time screen, #12), the same way. 40 photos kept. The Pomodoro log (4 sessions, format v1) pulled before and after: the same 4 entries, now saved as v2. A tracker started, the app killed and restarted, came back running on Home and Time, then stopped inside a minute so nothing was logged | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk`. Older builds can't read the v2 log and fall back to the backup file, so first put the v1 backup back: `adb push <backup>/pomodoro.json /sdcard/Android/data/app.glance.kiosk/files/` (tracked time since is lost) |
| 2026-10-21 | Kiosk 0.6 rebuilt again from `12-time-tracking` (PR #16: the goal in hours of focus; Time stays up while tracking), the same way, while the owner had a tracker running. 40 photos kept; the log (5 entries) identical before and after, and the tracker carried on through the reinstall | As above |
| 2026-10-21 | Kiosk 0.6 rebuilt again from `12-time-tracking` (PR #16: focus in every metric, reminders for doom scrolling and breaks), the same way, with the owner's tracker running. 40 photos kept; the log (6 entries) identical before and after; the app came back on Time with the tracker still running | As above |
| 2026-10-21 | Kiosk 0.6 rebuilt again from `12-time-tracking` (PR #16: Chores count as focus), the same way, with the owner's tracker running. 40 photos kept; the log (6 entries) identical before and after | As above |
| 2026-10-24 | Kiosk 0.6 rebuilt from a local merge of `main`, PR #20 (`18-screen-order`, side bar order) and PR #21 (`19-night-choices`, night clock buttons), the same way. The frame first didn't show up on USB at all; a restart and another hub port fixed it. 40 photos kept; the Time log (23 entries) identical before and after. On the frame: the bar reads Home, Time, Week, Telugu, Weather, Transit; a tap on the time brings the red clock with both buttons, matching the Mac. The buttons themselves were left for the owner to try | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk` |
| 2026-10-24 | Kiosk 0.6 rebuilt from `22-consonants-1-words` (Issue #22: words beside ఙ ఞ ట డ ణ త ద న on Consonants 1), the same way. 40 photos kept; the Time log identical before and after. Consonants 1 matches the Mac's screenshot apart from the burn-in shift | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk` |
| 2026-10-24 | Kiosk 0.6 rebuilt again from `22-consonants-1-words` (Issue #22, second round: only the romanization beside those eight; ఙ ఞ now gaṅga and pañchadāra), the same way. 40 photos kept; the Time log identical before and after. Consonants 1 matches the Mac's screenshot apart from the burn-in shift | As above |
| 2026-10-24 | Kiosk 0.6 rebuilt from `23-time-day-breakdown` (Issue #23: the last 7 days as a grid by category, a tap on a day for its breakdown, and what to start with), the same way. 40 photos kept; the Time log (24 entries) identical before and after. Time matches the Mac's screenshot, and a tap on Friday opens its breakdown | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk` |
| 2026-10-24 | Kiosk 0.6 rebuilt twice more from `23-time-day-breakdown` (Issue #23: the stacked bars kept as a second view, a swipe away, remembered in `localStorage` `glance-time-week`; then `touch-action: none` on that tile, since the first build's swipe was taken by the WebView). 40 photos kept; the Time log (24 entries) identical before and after, and the owner's Masters tracker carried on through both installs. On the frame a swipe goes to the bars and back | As above |
| 2026-10-24 | Kiosk 0.6 rebuilt again from `23-time-day-breakdown` (Issue #23: the stacked bars the default view, the grid a swipe to the left), the same way. 40 photos kept; the Time log (24 entries) identical before and after, the Masters tracker still running. It opened on the bars; a swipe went to the grid and back, and it was left on the bars | As above |
| 2026-10-24 | Kiosk 0.6 rebuilt again from `23-time-day-breakdown` (Issue #23: the "Next" line on the bars too, in place of "hours of focus"), the same way. 40 photos kept; the Time log (25 entries) identical before and after. Time opens on the bars with "Next: Chores, none in 7 days" at the top right | As above |
| 2026-10-27 | Test session for Issues #4 and #10: opened `https://glance.local/?diag` with a VIEW intent (not saved as the kiosk URL; `?diag` itself is remembered in `localStorage` until `?diag=0`); Wi-Fi off 18:27–19:24 with `svc wifi disable` / `svc wifi enable`; the owner unplugged the power for about a minute at 19:21. 40 photos kept; the Time log intact (41 → 42 entries, the owner's GEICO session logged whole). `?diag=0` opened the same way at 20:03 | Nothing left to undo |
| 2026-10-27 | Kiosk 0.6 rebuilt from `26-pomodoro-break-prompt` (Issue #26: a Pomodoro's end asks Start break, Keep working or Done for now, and goes to Ready after 15 seconds), the same way. 40 photos kept; the Time log (42 entries) identical before and after, the timer idle. Home looks as before. `?demo&ask` couldn't be opened on the frame: the running kiosk took neither a VIEW intent nor `--es url` as a reload, so the prompt itself wasn't seen there | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk` |
| 2026-10-27 | Kiosk 0.6 rebuilt from `28-category-colors` (Issue #28: new category colours, Doom scrolling red, Break the break phase's teal; a Pomodoro's ring and label in its category's colour), the same way. 40 photos kept; the Time log identical before and after. The frame was on the night clock at 8:30 pm, so the Time screen was left for the owner to check | Rebuild from `main` with `npm run frame:build` and `adb install -r kiosk/build/glance-kiosk.apk` |
| 2026-10-27 | Kiosk with branch `27-today-timeline` (#27, today's timeline on the Time screen), built while it still sat on #28's commit, so with #28's colours too: `npm run frame:build`, `adb install -r`. Photos unchanged (40), Pomodoro log backed up off-repo first. Checked by `adb shell input tap`: the tile opens the timeline, a swipe goes to the column and back | Rebuild from `main` the same way |
| 2026-10-27 | Kiosk rebuilt from `main` after #27 and #28 merged (today's timeline, new category colours), with `npm run frame:build` and `adb install -r`. 40 photos kept; the Time log identical before and after. The owner checked the Time screen and timeline on the frame | Rebuild from an earlier commit of `main` the same way |
