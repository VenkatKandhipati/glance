# Glance

A calm home dashboard for a cheap Android photo frame: the time, this month, your photos and
the next Metro trains, readable from across the room.

![Glance on a 1280 × 800 frame: clock, month calendar, photo tile and chores](docs/images/dashboard.png)

Glance runs on a 10.1" photo frame bought for its screen: a budget quad-core chip, 1 GB of RAM
and Android 8.1, which shipped with a 2017 browser engine (Chromium 61) and now runs Chromium 106. The whole dashboard is one static web page,
about 8 KB of gzipped JavaScript and CSS plus fonts, built to stay smooth on that hardware and to
keep running for weeks with nobody touching it.

## Features

- **Clock, greeting and weather.** A large serif clock with a greeting that follows the day,
  then the weather: *62° and mostly sunny*, or *62°, rain from 4 pm* when rain is coming, with
  today's high and low in a pill. From the National Weather Service, with no key.
- **Month calendar, live from Google Calendar.** Today highlighted, dots on busy days, and *Next
  up*: your next event with its time (*Train to Washington DC, Mon 19 Oct · 7:01 pm*). A busy group
  calendar can be marked quiet: no dots, just one line when something starts today or tomorrow.
- **Photos.** Your own photos crossfade in the large tile. A script shrinks them to the frame's
  size first, HEIC included, so the frame never decodes a 12-megapixel original.
- **Metro.** Live WMATA arrivals at your station in both directions, with each line's colour. It
  stops asking while the night clock is up.
- **Night clock.** After 10 p.m., two idle minutes turn the screen into a dim red clock on black.
  It drifts a few pixels now and then so it doesn't burn in. One tap brings the dashboard back.
- **Runs unattended.** It reloads itself if it fails to start and once a day at 3 a.m., and it
  waits out the frame's clock reading 1970 after a power cut.

<img src="docs/images/night-clock.png" width="480" alt="The night clock: a dim red time and date on black">

## Built for an old, slow browser

The frame's WebView is Chromium 106 on Android 8.1. On frames like this one it has rejected 8-digit
hex colours and `:has()`, its certificate store stops at 2023, and its GPU struggles
with a single blur. Glance treats that as a design constraint rather than a bug list.

- **Build targets** pinned to Chrome 106 for JS and Chrome 61 for CSS, so the minifier never emits
  syntax the frame rejects.
- **A compatibility check** ([`check-compat.mjs`](dashboard/scripts/check-compat.mjs)) runs after
  every build and in CI, and fails on CSS and JS the frame can't run.
- **No framework.** Plain ES modules; each tile renders a string of HTML and only the clock
  updates every minute.
- **Nothing from the internet at runtime.** Fonts are bundled, photos are pre-sized, and the
  frame only ever talks to one origin on the LAN.
- **A `?diag` overlay** shows fps, long frames, DOM size, decoded image megapixels and heap on the
  device itself.

The full list, with reasons, is in [docs/frame.md](docs/frame.md).

## How it works

```
 Photo frame (Android 8.1)                         Internet
 ┌─────────────────────────────────────┐  HTTPS    ┌──────────────────────┐
 │ Kiosk app (fullscreen WebView, Home)│ ────────▶ │ WMATA: Metro times   │
 │  https://glance.local/ ← from APK   │           │ Google Calendar feeds│
 │  /photos/ ← frame's storage         │           │ weather.gov forecast │
 └─────────────────────────────────────┘           └──────────────────────┘
        ▲ npm run frame (USB): build, install, copy photos
 Mac
```

The frame boots straight into a fullscreen kiosk app that serves the dashboard from inside itself,
so it runs with the Mac off; only trains, calendars and weather go online. The Mac builds it and installs
updates over USB. Later a home server adds more live data (news, music) and takes over the
WMATA and calendar calls, so no secret lives on the frame; see the [roadmap](docs/roadmap.md).

## Getting started

Needs Node 22+ and macOS (the photo script uses the built-in `sips`).

```sh
cd dashboard
npm install
npm run dev            # http://localhost:5173; open it at 1280 × 800
```

Make it yours:

- **Dates and Metro station:** edit [`dashboard/src/content.js`](dashboard/src/content.js).
- **WMATA API key:** copy `dashboard/.env.example` to `dashboard/.env.local` and paste in a free key
  from [developer.wmata.com](https://developer.wmata.com). `.env.local` is gitignored.
- **Photos:** copy them into `dashboard/photos/` and run `npm run photos`. Photos stay on your
  machine; both photo folders are gitignored.

Put it on the frame (over USB): the dashboard and photos go inside the kiosk app, so the frame
runs with no Mac. Run it again after changing content or photos.

```sh
npm run frame
```

This assumes a frame that already has ADB, WebView 106 and Glance's [kiosk app](kiosk/README.md).
Getting there is device-specific. For this frame,
[docs/connect-the-frame.md](docs/connect-the-frame.md) goes from a new frame out of the box to the
dashboard on its screen; Wes Bos's
[photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard) has guides for many
other models.

## Project layout

```
dashboard/              the web app
  src/
    main.js             minute tick, daily reload, wiring
    content.js          the file you edit: dates, Metro station, timings
    tiles/              clock, calendar, photo, Metro
  server/               /api/trains (WMATA proxy; holds the API key)
    night.js            night clock
    diag.js             ?diag performance overlay
    style.css           design tokens and all styles
  scripts/              photo resizer, frame-compatibility check
  test/                 unit tests (node --test)
kiosk/                  the Android app the frame boots into: one fullscreen WebView
scripts/
  frame-check.sh        read-only report of the frame over ADB
  frame-backup.sh       read-only, verified firmware backup over ADB
docs/
  roadmap.md            phases, from static dashboard to home server
  design.md             design language: layout, tokens, type
  frame.md              the hardware, its browser's limits, serving and setup
  connect-the-frame.md  step-by-step: Mac setup, USB connection, checks, first run
  ideas.md              ideas not yet scheduled
```

## Development

```sh
cd dashboard
npm test               # unit tests for the date and calendar logic
npm run build          # production build, then the compatibility check
```

CI runs both on every push and pull request.

## Credits

Inspired by Wes Bos's [photo frame video](https://youtu.be/ZLycoUMltNI) and
[repository](https://github.com/wesbos/photo-frame-dashboard),
[kitchen-frame](https://github.com/huntsyea/kitchen-frame) and
[Mado](https://github.com/abradburne/mado). See [CREDITS.md](CREDITS.md).

## License

[MIT](LICENSE) © 2026 Venkat Kandhipati
