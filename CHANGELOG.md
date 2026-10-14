# Changelog

All notable changes to Glance. The format follows [Keep a Changelog](https://keepachangelog.com),
and versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

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
