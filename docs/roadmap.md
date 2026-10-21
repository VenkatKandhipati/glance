# Roadmap

Long term, Glance is a **thin frontend**: the frame shows one web page and a home server does all
the fetching, auth and image work. It started as a **static dashboard** and now runs from inside
the kiosk app with no Mac, calling a few owner-approved services itself
(see [frame.md](frame.md#network)) until the home server takes those calls over.

Ideas that aren't scheduled yet live in [ideas.md](ideas.md).

## Phase 0 — Frame readiness

Read-only checks, recorded in [frame.md](frame.md). Step by step: [connect-the-frame.md](connect-the-frame.md).

- [x] `brew install android-platform-tools`; `adb devices -l` lists the frame
- [x] Record `ro.build.fingerprint`, `wm size`, `wm density` (must be 160), WebView version.
      It's the RK3326 / Android 8.1 board with stock Frameo, not the RK3126 we planned for
- [x] Verified firmware backup (`scripts/frame-backup.sh`) before any change
- [x] Vendor updaters off; WebView 61 → 106 in `/system` (logged with undo in frame.md)
- [x] No kiosk on a stock frame: bring Glance's own kiosk in now (`kiosk/`, forked from
      wesbos/photo-frame-dashboard) instead of in Phase 1.5, install it and make it Home

## Phase 1 — Static dashboard (MVP) · v0.1

One screen, no navigation, no API calls.

| Tile | Source | Behaviour |
| --- | --- | --- |
| Clock | frame clock | time, am/pm, date pill; greeting by time of day |
| Month calendar | clock + `dates` in `content.js` | today highlighted, dots on marked dates (yearly ones repeat), next marked date with a countdown |
| Photo tile | `dashboard/photos/` (gitignored) | crossfades every 2 min; next photo loaded before the swap; never more than two decoded |
| Chores | `chores` in `content.js` | tap to tick; saved on the frame; reset each day. Replaced by the Metro banner (Phase 2) |
| Night | frame clock | After 2 min untouched: dim red clock on black 22:00–00:00 (drifts against burn-in), backlight off 00:00–08:00; tap to dismiss |

- [x] Scaffold `dashboard/` (Vite, tokens, self-hosted fonts, grid)
- [x] Clock tile and minute-aligned tick
- [x] Chores strip with `localStorage` and daily reset
- [x] Month calendar and next marked date
- [x] Photo tile and `npm run photos` resize script (HEIC works)
- [x] Night clock
- [x] Reload watchdog, daily 3 a.m. reload, `?diag` overlay
- [x] Unit tests, frame-compatibility check, CI
- [ ] Tap-test the night clock by hand; Chrome DevTools with 6× CPU throttle
- [x] Run on the frame over `adb reverse`; record `?diag` numbers (47 fps = the panel's 47 Hz)
- [x] Point the kiosk at the Mac's LAN URL; it boots into the dashboard after `adb reboot`
- [x] Unplug-and-replug power test: back on the dashboard in about a minute (2026-10-19)
- [x] ~~Mac-asleep test~~: not needed since the dashboard runs inside the kiosk (Phase 1.5)
- [ ] An hour of photos without memory growth (`?diag`)

**Done when** it runs on the frame with no console errors, photos rotate for an hour without
memory growing, and the frame returns to the dashboard on its own after a power cut. (Chores
surviving a reload dropped with the chores strip; the Mac is no longer needed.)

## Phase 1.5 — No Mac needed

Served from the Mac, a frame that started up while the Mac slept showed an error until it
woke. Bundling the dashboard into the kiosk app removes the Mac entirely.

- [x] Fork the kiosk app from wesbos/photo-frame-dashboard into `kiosk/` (moved up to Phase 0,
      because the stock frame had no kiosk): Glance's own name and icon
- [x] Build the dashboard into the app and serve it to the WebView from inside the app
      (`shouldInterceptRequest` on a fixed `https://glance.local/` origin), so it works with no
      network at all; photos live on the frame's storage, so new ones need no reinstall
- [x] `npm run frame` on the Mac: build, package and install over ADB in one command
- [x] Metro banner calls WMATA from the frame (owner-approved exception; key baked in at build)
- [x] Install on the frame; after `adb reboot` with no Mac server it came back with photos and trains
- [x] Real power-cut test (pull the plug) with the Mac off (2026-10-19, logged in frame.md)
- [ ] Build the APK in CI

## Phase 2 — First live data, via the Mac

The Mac's proxies are still used while developing; on the frame, the page calls the approved
services itself (Phase 1.5).

- [x] Metro banner in place of chores: WMATA arrivals at Ballston (`K04`) through `/api/trains`
      on the Mac's dev/preview server; the key lives in `dashboard/.env.local`
- [x] Weather on the clock tile from the National Weather Service (`api.weather.gov`, no key),
      called by the page itself (owner-approved, 2026-10-19): the temperature now, the sky, and
      when rain starts if it's coming
- [x] Metro banner stops asking WMATA at night
- [ ] Air quality (AQI)
- [ ] `docs/api.md`: one JSON shape per feed, the contract the home server implements later
- [ ] Cache the last good response on the frame and show it as stale when a fetch fails

## Phase 2.5 — Live calendar

- [x] Google Calendar by secret iCal address: own RFC 5545 reader (repeats, exceptions, time
      zones), fetched by the kiosk on the frame or the Mac's `/ics`; Duckville marked quiet
- [x] Starter placeholder dates removed from `content.js`; Google Calendar covers them

## Phase 2.6 — Screens and touch

- [x] Side bar, hidden until a tap on the left edge: Home, Week, Transit, Weather; back to Home
      after 2 idle minutes
- [x] Week: the next seven days, every calendar, multi-day items once
- [x] Transit: the full board (destination, cars), WMATA alerts for the station's lines, elevator
      and escalator outages (same key)
- [x] Weather: now, 12 hours, 7 days, sunrise and sunset, NWS alerts (same service)
- [x] Taps on Home: a day or *Next up* → that day's events; weather → Weather; Metro → Transit;
      photo → next; the time → night clock
- [x] Night: red clock 22:00–00:00, backlight fully off 00:00–08:00 (kiosk 0.3, through root)
- [x] `?demo` mode and README screenshots with nothing personal
- [x] Weather warnings on Home: the temperature pill turns red with a warning sign, and the
      greeting's second line names the warning
- [x] Kiosk icon of Glance's own: a gold G on the tile colour (vector, adaptive on Android 8)
- [x] Pomodoro: 45 + 15 minutes, a category per session, today and a daily goal, a streak,
      7 days by category, 12 weeks; survives power cuts; holds off night and the return to Home;
      log backed up to a file (kiosk 0.6)
- [ ] Touch calibration, if smaller targets are ever needed

## Phase 2.7 — Pictures from public collections

- [x] Between your photos (every 4th): a public-domain painting of the day (Art Institute of
      Chicago), NASA's Astronomy Picture of the Day, Earth from the Space Station (NASA Image
      Library) and featured nature photos (Wikimedia Commons), each with a credit line.
      Owner-approved 2026-10-19; no keys
- [x] South Asian sources (Cleveland, Art Institute, Commons, the Space Station). Rijksmuseum left
      out: its new search (no key) returns only IDs, each needing several Linked Art requests.
      The Met dropped: web images of about 500 px. Smithsonian (Freer Gallery) needs an
      api.data.gov key: a mini PC job
- [x] Quality and style check on the frame (2026-10-19): each picture is measured in a worker at
      its shown size; blurry, undersized, sliver-shaped and (style `dark`) bright pictures are
      skipped. About 40 of 140 candidates pass a day. Preview of the options:
      [Frame Picture Picker](https://claude.ai/artifact/GzgsYkt1gVQamdEVJD3tiT)
- [x] Full brightness all the time (owner's choice, 2026-10-19)

## Phase 3 — Home server

Details for every item: [mini-pc.md](mini-pc.md).

- [ ] Serve the page and data from the server; move the WMATA key and calendar addresses off the
      frame, then regenerate them
- [ ] Messages to the frame from phones, scripts and agents (whisper, nudge, urgent)
- [ ] Tasks and groceries from Todoist
- [ ] Now playing from Spotify, with controls
- [ ] Recipes
- [ ] Settings page on the server
- [ ] Implement `docs/api.md` on the home server; the kiosk loads `http://<server-ip>:<port>/`
- [ ] News (RSS, thumbnails resized server-side), Spotify recently played, next fixture,
      chores synced across devices
- [ ] Bring back the full [design target](design.md#target): news, weather, music, football, AQI
- [ ] Photo pipeline on the server, replacing `npm run photos` (which needs macOS `sips`). Runs
      on Linux, with no macOS-only tools:
  - Smart crop: detect faces, or the main subject when there are none, and crop the original to
    the tile's exact shape (715 × 633), keeping every face and zooming in when people are small.
    On the first 40 photos, the current centre crop cut a face in 4 group shots and left people
    small in about half. Candidates: libvips/`sharp` (its `attention` crop) plus a small face
    detector (e.g. OpenCV's YuNet); the choice still needs measuring.
  - Output at exactly the tile's size: about 0.45 MP instead of 1.2 MP per photo, so the frame
    decodes less at each change (each one currently adds a few long frames).
  - A per-photo override (skip, or a fixed focus point) for when detection picks the wrong
    subject; rerun the crops whenever the tile's size changes.
- [ ] Photos from Google Photos (researched 2026-10-19). Since 31 March 2025 Google's Library API
      only returns photos an app uploaded itself; reading your library or an album, shared ones
      included, is gone. What's left:
  - **Picker API** (official): you pick photos in Google Photos on your phone; the server then has
    60 minutes to download them, and keeps its own copies. Needs a Google Cloud project, OAuth
    and a stored refresh token. Not automatic: new photos mean picking again.
  - **A shared album's public link** (unofficial): the album's web page lists its photos, and
    Google resizes them on request (`=w1280-h800`). Automatic and keyless, but it can break
    whenever Google changes that page, and anyone with the link can see the album.
  - Either way it belongs on the home server, not the frame: the frame would hold an OAuth token
    to your whole Google account (Picker) or depend on scraping (album link), and it gains
    nothing over the server downloading, smart-cropping and serving the photos. Start with the
    album link, behind a small module that the Picker or Immich can replace.

## Phase 4 — Living with it

- [x] Burn-in shifts for the dashboard: Home steps through a 3 × 3 grid of ±6 px offsets, one step
      every 10 minutes ([#6](https://github.com/VenkatKandhipati/glance/issues/6))
- [ ] Stale-data badges, light theme by day
