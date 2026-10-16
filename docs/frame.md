# The frame

What Glance runs on, what that rules out, and how the page gets onto it.

## Hardware

Read over ADB on 2026-10-16.

| | |
| --- | --- |
| Model | Akimart ZN-DP1002, 10.1" (reports itself as model `Frame`, brand `SSA`) |
| SoC | Rockchip RK3326: 4× Cortex-A35 at 1.5 GHz (32-bit userland, `armeabi-v7a`), Mali-G31 GPU (OpenGL ES 3.2) |
| Memory / storage | 1 GB RAM (360 MB zRAM), 32 GB logical NAND (`rknand0`, `/dev/block/by-name` present) |
| Screen | 1280 × 800 landscape at **47 Hz**, density 160 (devicePixelRatio 1), touch; no navigation bar |
| Wi-Fi | AIC8800 (`aicwf_sdio`) |
| OS | Android 8.1 (API 27), firmware `SSA_Frame_20250928`, security patch 2020-06-05, SELinux permissive |
| Browser engine | Android System WebView 106.0.5249.126, put in `/system` by this project (it shipped with 61) |
| Access | USB ADB once enabled in Frameo (Settings → About → Beta Program → ADB access); root as `su 0 <cmd>` |
| Came with | Frameo (`net.frameo.frame`) as the Home app; vendor updaters `com.adups.fota` and `android.rockchip.update.service` |
| Runs | Glance's kiosk app ([`kiosk/`](../kiosk/README.md)), one fullscreen WebView, as the Home app |

The same product name ships with different boards. This one matches the RK3326 unit in
[wesbos/photo-frame-dashboard `docs/akimart-zn-dp1002.md`](https://github.com/wesbos/photo-frame-dashboard/blob/main/docs/akimart-zn-dp1002.md),
partition table included, but with older firmware (`20250928` against `20260420`), which is why
it still had WebView 61. Another ZN-DP1002 has an RK3126 and Android 6
([PR #42](https://github.com/wesbos/photo-frame-dashboard/pull/42)); its script and partition
offsets don't apply. Check `adb shell getprop ro.build.fingerprint` (`rockchip/rk3326_go/…`)
before following any guide for this model.

Frameo uses the built-in root itself: at boot it runs `/system/xbin/su` and disables
`com.android.systemui` (status bar and notifications; `enabledCaller="shell:0"` in
`package-restrictions.xml`). That stays disabled even with Frameo off. Undo, if ever needed:
`su 0 pm enable com.android.systemui`.

A verified firmware backup (the first 8 MiB of the NAND and partitions 1–15, everything except
userdata) was taken with [`scripts/frame-backup.sh`](../scripts/frame-backup.sh) before the first
change. It lives outside the repo.

## What the browser can't do

Chrome 106 features, plus a few things these WebViews rejected in practice. The build enforces
most of them: `npm run build` runs [`scripts/check-compat.mjs`](../dashboard/scripts/check-compat.mjs).

| Avoid | Why | Use instead |
| --- | --- | --- |
| 4/8-digit hex (`#0008`) | Rejected on frames like this | `rgba()`; Vite's `cssTarget: 'chrome61'` stops the minifier producing them |
| `oklch()`, `color-mix()`, Tailwind v4 | Not in Chrome 106 | `#rrggbb`, `rgba()` |
| CSS nesting, `:has()` | Not supported / didn't work on-device | Flat selectors, classes |
| `dvh`, `svh` | Chrome 108+ | `px` (the page is a fixed 1280 × 800) |
| `toSorted()`, `Object.groupBy()`, … | Chrome 110+ | Older equivalents; the bundler doesn't polyfill |
| `backdrop-filter`, big blurs, shadows | Too slow for a Mali-G31 at 1280 × 800 | Pre-darkened images, flat fills |
| `alert()`, pop-ups, `target="_blank"` | The kiosk has no handler / no way back | In-page UI |
| Two-finger hold | Opens the kiosk's own menu | Single taps |

## Performance rules

- Animate only `opacity` and `transform`.
- Update only what changed: the clock once a minute, the calendar at midnight.
- Images at display size: photos are resized to ≤ 1280 px before the frame sees them, and at
  most two are decoded at once.
- Measure on the frame with `?diag` (fps, long frames, DOM nodes, image megapixels, heap) before
  and after a change. The panel runs at 47 Hz, so 47 fps is full speed.

Baseline, 2026-10-16 (dev server over USB, no photos yet): **47 fps** at rest, 2–3 long frames,
all at page load; 106 DOM nodes; JS heap 10 MB; kiosk 40 MB PSS plus 33 MB for the WebView
renderer. The kiosk window is up 1.5 s after launch.

## Running unattended

- **Boot:** Wi-Fi comes up after the kiosk. The kiosk retries the page every 5 s; the page reloads
  itself if its script hasn't started within 10 s.
- **Clock after a power cut:** until network time arrives the frame reads its firmware build date,
  28 Sep 2025 (other frames read 1970). The calendar only trusts a time later than the dashboard's
  own build, and redraws when the real date arrives.
- **Leaks:** the page reloads itself daily at 3 a.m.

## Network

- The frame talks to **one origin we control**, over plain HTTP on the LAN, by IP address
  (Android 8.1 doesn't resolve `.local` names).
- It never calls third-party APIs itself. Its trust store is frozen at 2020: it has ISRG Root X1
  and X2, but not newer roots such as the ISRG Root YR that Open-Meteo now chains to. API keys
  also have to stay off a device anyone on the network can read.
- Fonts and images are bundled; nothing loads from a CDN.
- Keep it on a guest or IoT network: Android 8.1 with a 2020 security patch, and any app can
  get root.

## Serving the page from the Mac

While developing, over USB:

```sh
cd dashboard && npm run dev
adb reverse tcp:5173 tcp:5173
adb shell 'am start -a android.intent.action.VIEW -d "http://127.0.0.1:5173/" -n app.glance.kiosk/.MainActivity --ez debug true'
# then chrome://inspect on the Mac for the console
```

Day to day, over Wi-Fi:

```sh
cd dashboard && npm run build && npm run preview          # port 4173
adb shell am start -n app.glance.kiosk/.MainActivity --es url http://<mac-lan-ip>:4173/
```

Give the Mac a DHCP reservation so its IP doesn't change.

**With the Mac asleep:** a dashboard that's already loaded keeps running. Hashed files (JS, CSS,
fonts, photos) are served as cacheable forever, so the photo tile rotates through photos it has
already shown; the daily 3 a.m. reload waits until the server answers. Only a frame that *starts
up* while the Mac sleeps shows the kiosk's "Can't reach the dashboard" screen, until the Mac wakes.

## Changes made to this frame

Record every change with its undo, newest last. All `su 0` commands run through `adb shell`.

| Date | Change | Undo |
| --- | --- | --- |
| 2026-10-16 | Turned on ADB from Frameo's own settings (Settings → About → Beta Program → ADB access). Wi-Fi was skipped in Frameo's setup | Turn the same switches off |
| 2026-10-16 | Disabled the vendor updaters: `su 0 pm disable-user --user 0 com.adups.fota` and `… android.rockchip.update.service` (read back `enabled=3`, no process) | `su 0 pm default-state --user 0 <package>` |
| 2026-10-16 | WebView 61 → 106.0.5249.126 in `/system/app/webview`: LineageOS prebuilt `webview.apk` (SHA-256 `e2edc1f8…0580`, same file as wesbos PR #42), its three `.so` files unpacked into `lib/arm/`, old `oat/` removed. It can't go in as an update: the stock WebView has a different signing key. Original kept as `webview.apk.bak` (SHA-256 `db1f9a14…bc3b`), old `oat/` in `/data/local/tmp/glance/oat-61` | `su 0 mount -o remount,rw /system`, move `webview.apk.bak` back to `webview.apk`, `rm -rf lib`, copy `oat-61` back as `oat`, remount read-only, reboot. Last resort: write `p11-system` from the firmware backup back to the partition |
| 2026-10-16 | Installed Glance's kiosk `app.glance.kiosk` 0.1 (`adb install -r kiosk/build/glance-kiosk.apk`), signed with the Mac's debug key. Home app unchanged (Frameo), no URL saved | `adb uninstall app.glance.kiosk` |
