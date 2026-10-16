# Roadmap

Long term, Glance is a **thin frontend**: the frame shows one web page and a home server does all
the fetching, auth and image work. It starts as a **static dashboard**: everything on screen comes
from the frame's clock, a content file, your photos, or taps. Each phase keeps the frame talking
to a single origin we control (see [frame.md](frame.md#network)).

Ideas that aren't scheduled yet live in [ideas.md](ideas.md).

## Phase 0 — Frame readiness

Read-only checks, recorded in [frame.md](frame.md). Step by step: [connect-the-frame.md](connect-the-frame.md).

- [x] `brew install android-platform-tools`; `adb devices -l` lists the frame
- [x] Record `ro.build.fingerprint`, `wm size`, `wm density` (must be 160), WebView version.
      It's the RK3326 / Android 8.1 board with stock Frameo, not the RK3126 we planned for
- [x] Verified firmware backup (`scripts/frame-backup.sh`) before any change
- [x] Vendor updaters off; WebView 61 → 106 in `/system` (logged with undo in frame.md)
- [ ] No kiosk on a stock frame: bring Glance's own kiosk in now (`kiosk/`, forked from
      wesbos/photo-frame-dashboard) instead of in Phase 1.5, install it and make it Home

## Phase 1 — Static dashboard (MVP) · v0.1

One screen, no navigation, no API calls.

| Tile | Source | Behaviour |
| --- | --- | --- |
| Clock | frame clock | time, am/pm, date pill; greeting by time of day |
| Month calendar | clock + `dates` in `content.js` | today highlighted, dots on marked dates (yearly ones repeat), next marked date with a countdown |
| Photo tile | `dashboard/photos/` (gitignored) | crossfades every 2 min; next photo loaded before the swap; never more than two decoded |
| Chores | `chores` in `content.js` | tap to tick; saved on the frame; reset each day; "N left today" |
| Night clock | frame clock | 22:00–06:00 after 2 min untouched: dim red clock on black; tap to dismiss; drifts against burn-in |

- [x] Scaffold `dashboard/` (Vite, tokens, self-hosted fonts, grid)
- [x] Clock tile and minute-aligned tick
- [x] Chores strip with `localStorage` and daily reset
- [x] Month calendar and next marked date
- [x] Photo tile and `npm run photos` resize script (HEIC works)
- [x] Night clock
- [x] Reload watchdog, daily 3 a.m. reload, `?diag` overlay
- [x] Unit tests, frame-compatibility check, CI
- [ ] Tap-test chores and the night clock by hand; Chrome DevTools with 6× CPU throttle
- [ ] Run on the frame over `adb reverse`; record `?diag` numbers
- [ ] Point the kiosk at the Mac's LAN URL; unplug-and-replug test

**Done when** it runs on the frame with no console errors, photos rotate for an hour without
memory growing, chores survive a reload, and the frame returns to the dashboard on its own after a
power cut (while the Mac is serving).

## Phase 1.5 — No Mac needed

The frame only needs the Mac when the page loads; a frame that starts up while the Mac sleeps
shows an error until it wakes. Bundling the dashboard into the kiosk app removes the Mac entirely.

- [x] Fork the kiosk app from wesbos/photo-frame-dashboard into `kiosk/` (moved up to Phase 0,
      because the stock frame had no kiosk): Glance's own name; own icon still to do
- [ ] Build the dashboard into the app and serve it to the WebView from inside the app
      (`shouldInterceptRequest` on a fixed `https://glance.local/` origin), so it works with no
      network at all
- [ ] `npm run frame` on the Mac: build, package and install over ADB in one command
- [ ] Build the APK in CI

## Phase 2 — First live data, via the Mac

- [ ] Weather and AQI from Open-Meteo (no key) through a Vite server middleware at `/api/weather`
      and `/api/air`; the frame still only talks to the Mac
- [ ] `docs/api.md`: one JSON shape per feed, the contract the home server implements later
- [ ] Cache the last good response on the frame and show it as stale when a fetch fails

## Phase 3 — Home server

- [ ] Implement `docs/api.md` on the home server; the kiosk loads `http://<server-ip>:<port>/`
- [ ] News (RSS, thumbnails resized server-side), Spotify recently played, next fixture,
      chores synced across devices
- [ ] Bring back the full [design target](design.md#target): news, weather, music, football, AQI

## Phase 4 — Living with it

- [ ] Burn-in shifts for the dashboard, stale-data badges, light theme by day
