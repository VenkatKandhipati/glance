# For the mini PC

Features the owner wants that wait for the home-lab mini PC, written up so each can be built
straight away once it's running. Collected 2026-10-19 from the conversations that planned them
and from the projects in [CREDITS.md](../CREDITS.md). The roadmap's
[Phase 3](roadmap.md#phase-3--home-server) tracks them; this page holds the detail.

The mini PC runs Linux, so nothing here may depend on macOS tools.

## The server itself (do first)

- **Serve the page and the data from one origin.** The kiosk loads `http://<server-ip>:<port>/`
  instead of the copy inside the app. The server answers `/api/*` with the shapes in
  `docs/api.md` (to write), so the page stays the same whether data comes from the server or,
  as now, from the frame calling services itself.
- **Take the secrets off the frame.** The WMATA key and the three Google Calendar addresses move
  into the server's environment; the frame build stops carrying them (`__WMATA_KEY__`,
  `__CALENDARS__` become empty, as in the Mac build). Then regenerate the WMATA key and reset the
  calendar addresses, since the old ones were on the frame.
- **Keep the frame working without it.** Clock, weather and the public pictures already need no
  server. When the server is down the page should keep the last data it had and say how old it
  is, not go blank (kitchen-frame and mado both do this).
- **A settings page** on the server (calendars, station, places, feeds) instead of editing
  `content.js` and rebuilding.

## Pomodoro

- **Sync the log.** The frame keeps the Pomodoro log in the page's storage and a backup file
  (`/sdcard/Android/data/app.glance.kiosk/files/pomodoro.json`, format in
  `dashboard/src/pomodoro-data.js`). The server should take a copy after every session (`POST
  /api/pomodoro`), keep the history if the frame is reset, and offer it as CSV.
- **Longer views** that don't fit the frame: months and years by category, best hours of the day,
  sessions started vs finished.

## Photos

- **Google Photos** (researched 2026-10-19; full notes in the roadmap). Since March 2025 only
  two routes remain: a shared album's public link (unofficial, automatic) or the Picker API
  (official, you pick photos each time). Start with the album link behind a small module the
  Picker or Immich can replace.
- **Smart crop and exact sizing.** Detect faces or the main subject and crop to the tile's
  715 × 633, output at that size (0.45 MP instead of 1.2 MP). Candidates: libvips/`sharp`
  attention crop plus a small face detector (OpenCV YuNet). Details in the roadmap.
- **Immich** (self-hosted Google Photos alternative) as the long-term photo library, if the
  owner moves photos off Google: the server would read an Immich album the same way.

## Messages to the frame *(mado, kitchen-frame)*

- Phones, scripts, cron jobs and AI agents send the frame a note: "Laundry's done", "Leaving in
  10", "Package at the door".
- Three levels, from mado: a **whisper** (a small mark at the edge), a **nudge** (one line that
  fades after a minute) and **urgent** (full screen until someone taps it). Night mode holds
  whispers and nudges until morning; urgent ones still show and light the screen.
- Server: an HTTP endpoint and an MCP tool (`frame_notify`) for agents; the frame keeps one
  WebSocket open to the server, so nothing has to poll. Keep the last 100 messages for a
  Messages screen.
- Frame: a fourth kind of overlay next to the day sheet; the side bar gets a Messages entry.

## Tasks and groceries *(kitchen-frame)*

- A Tasks screen with two lists from Todoist (to-do and groceries), shared with phones. Tap an
  item to tick it off; add items with an on-screen keyboard or by voice later.
- The Todoist API token can read and change the whole account, so it lives on the server; the
  frame only calls `/api/tasks`.
- Big rows (the frame's touch reads low): at least 76 px per item, ticks animated with
  `transform` only.
- Could bring back chores: a recurring list ("bins out on Tuesdays") with who did it.

## Now playing *(mado)*

- While music plays on the owner's Spotify, its cover fills the photo tile (or the whole screen),
  with the track and artist; previous, play/pause and next buttons control Spotify Connect.
  About 2 minutes after a pause the dashboard comes back.
- Spotify's Web API needs OAuth with a refresh token: server only. Poll `currently-playing`
  every 5 s while something plays, every minute otherwise; the frame hears changes over the same
  WebSocket as messages.
- No sound ever plays from the frame itself.

## Recipes *(kitchen-frame)*

- A Recipes screen: browse TheMealDB (free) and recipes saved from links or sent by an agent,
  one big step at a time, with a tap to move on (hands may be messy). "Add missing ingredients
  to Groceries" ties in with Tasks.
- The server fetches and cleans recipe pages (JSON-LD `Recipe` data) so the frame gets plain
  steps and a resized photo.

## The rest of the original design

- **News:** a few headlines from RSS feeds, thumbnails resized on the server.
- **Football:** the team's next match, live score on match day.
- **Air quality:** AQI for Arlington (AirNow needs a key; Open-Meteo's air-quality API doesn't).
- **Commute:** time to work at leaving time; Metro alerts already come from WMATA.

## Possible on the frame any time (no server needed)

The owner liked these too. They need no secrets, so they can be done before the mini PC if
wanted:

- **Full-screen photos when idle** *(kitchen-frame)*: after a few idle minutes in the day, the
  photo tile takes the whole screen; a tap brings the dashboard back.
- **Light theme by day** *(kitchen-frame)*: light from sunrise to sunset (`sunTimes` in
  `weather-data.js` already has the times), dark otherwise. Both themes as CSS variables, so a
  switch costs one repaint.
- **Clocks for other places** *(mado)*: a line each for places the owner cares about, with the
  local time and, from weather.gov or Open-Meteo, the sky. Time zones come from `Intl`.
