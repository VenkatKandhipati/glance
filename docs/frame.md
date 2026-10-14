# The frame

What Glance runs on, what that rules out, and how the page gets onto it.

## Hardware

| | |
| --- | --- |
| Model | Akimart ZN-DP1002, 10.1" |
| SoC | Rockchip RK3126: 4× Cortex-A7, Mali-400 GPU (OpenGL ES 2.0) |
| Memory / storage | 1 GB RAM (128 MB zRAM), 32 GB eMMC |
| Screen | 1280 × 800 landscape, devicePixelRatio 1, touch |
| Wi-Fi | `rk915_sdio` (SDIO) |
| OS / browser engine | Android 6.0.1, Android System WebView 107 |
| Access | USB ADB and root, out of the box |
| Runs | One fullscreen kiosk WebView app as the Home screen |

The same product name ships with different boards. Another ZN-DP1002 has an RK3326 and
Android 8.1 ([wesbos/photo-frame-dashboard `docs/akimart-zn-dp1002.md`](https://github.com/wesbos/photo-frame-dashboard/blob/main/docs/akimart-zn-dp1002.md)).
This one matches the RK3126 / Android 6 unit in that repo's
[PR #42](https://github.com/wesbos/photo-frame-dashboard/pull/42) (`rk312x` build fingerprint).
Check `adb shell getprop ro.build.fingerprint` before following any guide for this model.

## What the browser can't do

Chrome 106/107 features, plus a few things these WebViews rejected in practice. The build
enforces most of them: `npm run build` runs [`scripts/check-compat.mjs`](../dashboard/scripts/check-compat.mjs).

| Avoid | Why | Use instead |
| --- | --- | --- |
| 4/8-digit hex (`#0008`) | Rejected on these frames | `rgba()`; Vite's `cssTarget: 'chrome61'` stops the minifier producing them |
| `oklch()`, `color-mix()`, Tailwind v4 | Not in Chrome 106 | `#rrggbb`, `rgba()` |
| CSS nesting, `:has()` | Not supported / didn't work on-device | Flat selectors, classes |
| `dvh`, `svh` | Chrome 108+ | `px` (the page is a fixed 1280 × 800) |
| `toSorted()`, `Object.groupBy()`, … | Chrome 110+ | Older equivalents; the bundler doesn't polyfill |
| `backdrop-filter`, big blurs, shadows | Too slow for the Mali-400 | Pre-darkened images, flat fills |
| `alert()`, pop-ups, `target="_blank"` | The kiosk has no handler / no way back | In-page UI |
| Two-finger hold | Opens the kiosk's own menu | Single taps |

## Performance rules

- Animate only `opacity` and `transform`.
- Update only what changed: the clock once a minute, the calendar at midnight.
- Images at display size: photos are resized to ≤ 1280 px before the frame sees them, and at
  most two are decoded at once.
- Measure on the frame with `?diag` (fps, long frames, DOM nodes, image megapixels, heap) before
  and after a change.

## Running unattended

- **Boot:** Wi-Fi comes up after the kiosk. The kiosk retries the page every 5 s; the page reloads
  itself if its script hasn't started within 10 s.
- **Clock after a power cut:** it can read 1970 until network time arrives. The calendar waits for
  a plausible date and redraws when it arrives.
- **Leaks:** the page reloads itself daily at 3 a.m.

## Network

- The frame talks to **one origin we control**, over plain HTTP on the LAN, by IP address
  (Android 6 doesn't resolve `.local` names).
- It never calls third-party APIs itself. Android 6's trust store predates Let's Encrypt's roots,
  including the newer ISRG Root YR that Open-Meteo now chains to, so those HTTPS requests fail. API
  keys also have to stay off a device anyone on the network can read.
- Fonts and images are bundled; nothing loads from a CDN.

## Serving the page from the Mac

While developing, over USB:

```sh
cd dashboard && npm run dev
adb reverse tcp:5173 tcp:5173
adb shell 'am start -a android.intent.action.VIEW -d "http://127.0.0.1:5173/" -n com.wesbos.homehq/.MainActivity --ez debug true'
# then chrome://inspect on the Mac for the console
```

Day to day, over Wi-Fi:

```sh
cd dashboard && npm run build && npm run preview          # port 4173
adb shell am start -n com.wesbos.homehq/.MainActivity --es url http://<mac-lan-ip>:4173/
```

Give the Mac a DHCP reservation so its IP doesn't change. When the Mac sleeps, the kiosk shows
"Can't reach the dashboard" and keeps retrying, so the frame recovers when the Mac wakes.

## Changes made to this frame

Record every change with its undo, newest last. None made by this project yet.

| Date | Change | Undo |
| --- | --- | --- |
