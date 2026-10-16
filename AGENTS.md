# Working on Glance

Notes for AI agents and contributors. Read [docs/frame.md](docs/frame.md) before changing
`dashboard/`.

## Target

- Akimart ZN-DP1002 with the SSA **RK3326** board: Android 8.1, WebView 106 (put in `/system` by
  this project; it shipped with 61), Mali-G31, 1 GB RAM, 1280 × 800 at DPR 1. Another board ships
  under the same name (RK3126, Android 6); its guides and scripts don't apply here.
- The page is a fixed 1280 × 800 layout. Check every change at exactly that size.

## Rules

- Keep `build.target: 'chrome106'` and `cssTarget: 'chrome61'` in `dashboard/vite.config.js`.
- No `oklch()`, `color-mix()`, CSS nesting, `:has()`, 4/8-digit hex, `dvh`, `backdrop-filter`,
  blurs or shadows. `npm run build` fails on most of these; don't work around the check.
- No framework, no runtime dependencies beyond fonts. A new dependency has to earn its weight on
  a Cortex-A35.
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
- Root is `su 0 <cmd>`; `su -c` fails on this board. Check `ro.build.fingerprint` starts with
  `rockchip/rk3326_go/` before any write.
- Don't put the frame on the internet with the vendor updaters enabled, and don't turn on ADB over
  Wi-Fi.

## Checks

```sh
cd dashboard && npm test && npm run build
bash kiosk/build.sh        # when kiosk/ changes; needs JDK 17 and the Android SDK (kiosk/README.md)
```
