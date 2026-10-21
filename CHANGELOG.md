# Changelog

All notable changes to Glance. The format follows [Keep a Changelog](https://keepachangelog.com),
and versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- Metro banner in place of the chores strip: live WMATA arrivals at Ballston in both directions,
  through `/api/trains` on the Mac, which holds the API key.
- Glance's own kiosk app (`kiosk/`, adapted from wesbos/photo-frame-dashboard) and
  `scripts/frame-backup.sh`.

- Live Google Calendar in the calendar tile: dots on busy days, *Next up* with the event's time,
  and quiet calendars (Duckville) reduced to one line for what starts today or tomorrow.
- The dashboard runs from inside the kiosk app (`npm run frame`), with no Mac.
- Weather on the clock tile from the National Weather Service: the temperature now in a pill, and
  the sky ("Mostly sunny.", or "Rain from 4 pm." when rain is coming) under the greeting.
- Screens behind a side bar that comes out from the left edge: Week, Transit (full board, line
  alerts, elevator outages) and Weather (now, 12 hours, 7 days, sunrise and sunset, warnings).
- Taps on Home: a day or *Next up* opens that day's events; the weather, the Metro banner, the
  photo and the time each do something (see the README).
- The screen goes fully off from midnight to 8 a.m. (kiosk 0.3 turns the backlight off through
  root); a tap wakes it.
- `?demo` mode, and new README screenshots taken with it.
- Weather warnings on Home: the temperature pill turns red with a warning sign and the greeting
  names the warning.
- Glance's own app icon (kiosk 0.4).
- Pictures from public collections between your photos, each with a credit line: a painting of
  the day (Art Institute of Chicago), NASA's Astronomy Picture of the Day, Earth from the Space
  Station (NASA), featured nature photos (Wikimedia Commons, South Asia among them) and
  paintings from the Cleveland Museum of Art. Each is measured on the frame first: only sharp,
  well-sized pictures dark enough for the dashboard are shown (`featured.style`).

- A Pomodoro screen: 45 minutes of deep work and a 15-minute break, each session tagged with a
  category; today against a daily goal, a streak, the last 7 days by category, 12 weeks and time
  by category. It survives reloads and power cuts, holds off night and the return to Home while it
  runs, and keeps a backup of its log in a file (kiosk 0.6, `GlanceFiles`).
- Telugu screen for writing practice: the 16 vowels and 36 consonants with their romanizations,
  each centred in its box, on three pages (tabs or a swipe), in Noto Sans Telugu bundled with the
  page. It stays up for 45
  minutes after the last touch and steps 4 px every 30 minutes against burn-in.
- Burn-in shifts for Home: the board steps through nine positions within 6 px of where it belongs,
  one every 10 minutes (`settings.shift` in `content.js`; `px: 0` turns it off).
- Weather and calendars survive an outage: their last data is saved on the frame, so a reload or
  power cut without Wi-Fi still shows it, and an age badge ("3 h old") appears on the weather
  pill, the Weather screen and the calendar tile once a refresh is overdue. `?demo&stale` shows
  the badges.

### Changed

- The Metro banner stops asking WMATA at night, and asks again on the tap that wakes the dashboard.
- The night clock now runs from 10 p.m. to midnight only; the screen is off after that.

### Removed

- The chores strip.

### Fixed

- The calendar no longer trusts the frame's fallback clock (its firmware date) after a power cut.

### Changed

- Docs and scripts now target the RK3326 / Android 8.1 frame that arrived, not the RK3126.

- The dashboard keeps running while the Mac sleeps: built files are served as cacheable forever,
  the photo tile rotates through photos it has already loaded when the server can't be reached,
  and the daily 3 a.m. reload waits until the server answers.

## [0.1.0] - 2026-10-14

The static dashboard: no API integrations.

### Added

- Clock tile with a date pill and a time-of-day greeting.
- Month calendar with marked dates (yearly or one-off) and a countdown to the next one.
- Photo tile that crossfades through local photos, with `npm run photos` to resize them (HEIC included).
- Chores strip: tap to tick, saved on the frame, reset daily.
- Night clock: dim red clock after 22:00 when idle, with burn-in drift.
- Reload watchdog, daily 3 a.m. reload, and a `?diag` performance overlay.
- Frame-compatibility check after every build, unit tests, and CI.
