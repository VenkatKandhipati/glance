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
| Touch | gslX680, 480 × 800 raw (Android scales X by 2.66). No jitter, but near the bottom edge it reports taps 25–50 px **below** the finger |
| Wi-Fi | AIC8800 (`aicwf_sdio`) |
| OS | Android 8.1 (API 27), firmware `SSA_Frame_20250928`, security patch 2020-06-05, SELinux permissive |
| Browser engine | Android System WebView 106.0.5249.126, put in `/system` by this project (it shipped with 61) |
| Access | USB ADB once enabled in Frameo (Settings → About → Beta Program → ADB access); root as `su 0 <cmd>` |
| Came with | Frameo (`net.frameo.frame`) as the Home app; vendor updaters `com.adups.fota` and `android.rockchip.update.service` |
| Runs | Glance's kiosk app ([`kiosk/`](../kiosk/README.md)), one fullscreen WebView, as the Home app; boots into the dashboard over Wi-Fi |

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

## Touch

Measured 2026-10-16 with `getevent` on six taps aimed at a 46 px chip (screen y 702–748): each was
a clean press with no movement, reported at y 750–775, just under the chip. Only 2–3 of 6
registered. Design for it: big targets, and no small controls along the bottom edge. (The
chores strip, since replaced by the Metro banner, counted a tap anywhere in its tile.)

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

- Day to day the page comes from **inside the kiosk app** at `https://glance.local/`, a host that
  exists only in its WebView (see below); while developing, from the Mac over plain HTTP by IP
  address (Android 8.1 doesn't resolve `.local` names on the network).
- **One third-party call, by owner decision (2026-10-16): WMATA.** The frame build calls
  `api.wmata.com` directly with the key baked in at build time, so the Metro banner works with
  the Mac off. Anyone who can reach the frame can read that key (any app can get root), which is
  acceptable for a free, rate-limited key that can be regenerated. Move it to the home server
  when there is one. No other service, and no other key, goes on the frame.
- Trust store: the 2025 firmware ships a store from about 2023 (205 roots, newest March 2023),
  despite the 2020 security patch. It has ISRG Root X1 and X2, Sectigo R46 (WMATA's root), GTS,
  Amazon and DigiCert G2, but no roots from 2024 on, such as the ISRG Root YR that Open-Meteo
  now chains to. Checked 2026-10-16: the kiosk's WebView reached `https://api.wmata.com` and got
  WMATA's own reply.
- Fonts and images are bundled; nothing loads from a CDN.
- Keep it on a guest or IoT network: Android 8.1 with a 2020 security patch, and any app can
  get root.

## How the page gets onto the frame

**Day to day: inside the kiosk app.** `npm run frame` builds a frame copy of the dashboard
(`vite build --mode frame` into `dist-frame/`), packages it into the app's `assets/www/`, installs
the app over USB, copies the resized photos to `/sdcard/Android/data/app.glance.kiosk/files/photos/`,
and points the kiosk at `https://glance.local/`. The kiosk answers that host itself
([`LocalSite.java`](../kiosk/src/app/glance/kiosk/LocalSite.java)): pages from the APK, photos
and their list (`/photos/`) from storage. Nothing depends on the Mac or the LAN; the Metro banner
needs internet. Changing content, photos or design means running `npm run frame` again with the
frame on USB.

**Developing: from the Mac.** Over USB:

```sh
cd dashboard && npm run dev
adb reverse tcp:5173 tcp:5173
adb shell 'am start -a android.intent.action.VIEW -d "http://127.0.0.1:5173/" -n app.glance.kiosk/.MainActivity --ez debug true'
# then chrome://inspect on the Mac for the console
```

Or over Wi-Fi from `npm run build && npm run preview` (port 4173):
`adb shell am start -n app.glance.kiosk/.MainActivity --es url http://<mac-lan-ip>:4173/`. That
copy gets its Metro times from the Mac's `/api/trains`, which keeps the key on the Mac. Go back to
the built-in copy with `--es url https://glance.local/`.

## Changes made to this frame

Record every change with its undo, newest last. All `su 0` commands run through `adb shell`.

| Date | Change | Undo |
| --- | --- | --- |
| 2026-10-16 | Turned on ADB from Frameo's own settings (Settings → About → Beta Program → ADB access). Wi-Fi was skipped in Frameo's setup | Turn the same switches off |
| 2026-10-16 | Disabled the vendor updaters: `su 0 pm disable-user --user 0 com.adups.fota` and `… android.rockchip.update.service` (read back `enabled=3`, no process) | `su 0 pm default-state --user 0 <package>` |
| 2026-10-16 | WebView 61 → 106.0.5249.126 in `/system/app/webview`: LineageOS prebuilt `webview.apk` (SHA-256 `e2edc1f8…0580`, same file as wesbos PR #42), its three `.so` files unpacked into `lib/arm/`, old `oat/` removed. It can't go in as an update: the stock WebView has a different signing key. Original kept as `webview.apk.bak` (SHA-256 `db1f9a14…bc3b`), old `oat/` in `/data/local/tmp/glance/oat-61` | `su 0 mount -o remount,rw /system`, move `webview.apk.bak` back to `webview.apk`, `rm -rf lib`, copy `oat-61` back as `oat`, remount read-only, reboot. Last resort: write `p11-system` from the firmware backup back to the partition |
| 2026-10-16 | Installed Glance's kiosk `app.glance.kiosk` 0.1 (`adb install -r kiosk/build/glance-kiosk.apk`), signed with the Mac's debug key. Home app unchanged (Frameo), no URL saved | `adb uninstall app.glance.kiosk` |
| 2026-10-16 | Joined Wi-Fi (owner, on the frame); network time arrived at once. Timezone America/Los_Angeles → America/New_York: `su 0 service call alarm 3 s16 America/New_York` (AlarmManager.setTimeZone, so apps get the change without a restart; automatic timezone is off) | Same command with `America/Los_Angeles` |
| 2026-10-16 | Saved the kiosk URL `http://<mac-lan-ip>:4173/` (`am start -n app.glance.kiosk/.MainActivity --es url …`); the Mac has a DHCP reservation to set | The same command with another URL |
| 2026-10-16 | Kiosk as Home: `am start -n app.glance.kiosk/.MainActivity --ez home true`, then `cmd package set-home-activity --user 0 app.glance.kiosk/.Home` | `cmd package set-home-activity --user 0 net.frameo.frame/.ui.activities.AWaitForDeferredInitCompleted` (after re-enabling Frameo), then `--ez home false` |
| 2026-10-16 | Disabled Frameo: `su 0 pm disable-user --user 0 net.frameo.frame`. ADB stays on (`adb_enabled=1`); its switch is now in Developer options | `su 0 pm default-state --user 0 net.frameo.frame` |
| 2026-10-16 | Turned on Glance navigation (floating Back / Dashboard outside the kiosk): `settings put secure enabled_accessibility_services app.glance.kiosk/app.glance.kiosk.NavigationService`, `settings put secure accessibility_enabled 1` (both were unset/0) | `settings delete secure enabled_accessibility_services`, `settings put secure accessibility_enabled 0` |
| 2026-10-16 | Kiosk 0.2 with the dashboard built in (`npm run frame`): app updated (`adb install -r`), 40 resized photos (13 MB) pushed to `/sdcard/Android/data/app.glance.kiosk/files/photos/`, saved URL → `https://glance.local/`. The app now holds the WMATA API key (owner-approved). After `adb reboot` with no server running on the Mac, it came up on the dashboard with photos and live trains | Saved URL back to the Mac (`--es url http://<mac-lan-ip>:4173/`); `adb install -r` an older build; photos go with `adb uninstall app.glance.kiosk`. Regenerate the WMATA key if it leaks |
