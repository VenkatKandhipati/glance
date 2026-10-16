# Changelog

All notable changes to Glance. The format follows [Keep a Changelog](https://keepachangelog.com),
and versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- Metro banner in place of the chores strip: live WMATA arrivals at Ballston in both directions,
  through `/api/trains` on the Mac, which holds the API key.
- Glance's own kiosk app (`kiosk/`, adapted from wesbos/photo-frame-dashboard) and
  `scripts/frame-backup.sh`.

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
