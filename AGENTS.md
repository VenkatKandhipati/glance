# Working on Glance

Notes for AI agents and contributors. Read [docs/frame.md](docs/frame.md) before changing
`dashboard/`.

## Target

- Akimart ZN-DP1002 with an **RK3126** board: Android 6.0.1, WebView 107, Mali-400, 1 GB RAM,
  1280 × 800 at DPR 1. Another board ships under the same name (RK3326, Android 8.1); its guides
  don't apply here.
- The page is a fixed 1280 × 800 layout. Check every change at exactly that size.

## Rules

- Keep `build.target: 'chrome106'` and `cssTarget: 'chrome61'` in `dashboard/vite.config.js`.
- No `oklch()`, `color-mix()`, CSS nesting, `:has()`, 4/8-digit hex, `dvh`, `backdrop-filter`,
  blurs or shadows. `npm run build` fails on most of these; don't work around the check.
- No framework, no runtime dependencies beyond fonts. A new dependency has to earn its weight on
  a Cortex-A7.
- The frame never calls third-party services directly; everything comes from the page's own
  origin (see "Network" in docs/frame.md).
- Animate only `opacity` and `transform`. Update only what changed.
- No two-finger hold gestures (the kiosk uses one), no `alert()`, no external links.
- Wrap every `localStorage` access in `try`/`catch`.

## Privacy

- Never commit photos: `dashboard/photos/` and `dashboard/.photos-resized/` are gitignored.
- Keep serial numbers, MAC and IP addresses, Wi-Fi details and firmware dumps out of the repo.

## The frame itself

- Reads over ADB are fine. Ask the owner before anything that writes to the frame (installing
  apps, changing settings, `/system`, the Home app) and record each change with its undo in
  docs/frame.md.

## Checks

```sh
cd dashboard && npm test && npm run build
```
