# Connecting the frame and running Glance on it

A step-by-step guide for **this** frame, starting from a new one out of the box: getting the Mac
ready, connecting over USB, checking and backing up the frame (Phase 0), preparing it, and getting
the dashboard running on it (the end of Phase 1). Everything here is copy-paste, run from Terminal
on the Mac.

**Parts 1–3 change nothing on the frame** apart from switching on ADB in Frameo's own settings.
From Part 4 on, every step that writes to the frame is marked ⚠️, with its undo. Record each one in
the table at the end of [frame.md](frame.md#changes-made-to-this-frame).

| Part | What you'll have at the end | Time |
| --- | --- | --- |
| [1. Get the Mac ready](#1-get-the-mac-ready) | `adb` installed | 5 min |
| [2. Connect the frame](#2-connect-the-frame) | `adb devices` lists the frame | 10–30 min |
| [3. Check and back up the frame (Phase 0)](#3-check-and-back-up-the-frame-phase-0) | A report and a verified firmware backup | 15 min |
| [4. Prepare the frame](#4-prepare-the-frame) | Updaters off, WebView 106, Glance's kiosk installed | 30 min |
| [5. Run the dashboard on the frame over USB](#5-run-the-dashboard-on-the-frame-over-usb) | The MVP on the frame's screen, live-reloading | 15 min |
| [6. Make it the frame's everyday screen](#6-make-it-the-frames-everyday-screen) | The frame boots into Glance over Wi-Fi | 15 min |
| [Troubleshooting](#troubleshooting) | | |

## Your frame

| | |
| --- | --- |
| Model | Akimart ZN-DP1002, 10.1" (reports model `Frame`, brand `SSA`) |
| Board | Rockchip **RK3326**: 4× Cortex-A35, Mali-G31 GPU |
| Memory / storage | 1 GB RAM, 32 GB NAND |
| Screen | 1280 × 800, density 160, touch, no navigation bar |
| Software | Android 8.1, stock Frameo, WebView 61 out of the box; root built in (`su 0`) |
| USB vendor ID | `0x2207` (Rockchip). This is how the Mac recognises it |

> [!WARNING]
> **Two different boards are sold as the ZN-DP1002.** This guide is for the RK3326 / Android 8.1
> one. The other has an RK3126 and Android 6
> ([wesbos PR #42](https://github.com/wesbos/photo-frame-dashboard/pull/42)) and needs different
> commands. Step 2.6 tells you which you have. **Don't run setup scripts from wesbos's repo on this
> frame;** this guide covers everything they would do that Glance needs.

### What you need

- [ ] The frame and its power adapter.
- [ ] A **USB-A to USB-C data cable**. The cable in the box is power-only, and a USB-C to USB-C
      cable gives no power and no data (the frame's USB-C port doesn't announce itself the way the
      Mac expects). A cable that lights the frame up isn't necessarily a data cable.
- [ ] If your Mac has only USB-C ports: a USB-C to USB-A adapter or hub. An Aukey USB-C hub
      works for this frame.
- [ ] The frame and the Mac on the **same Wi-Fi network** (only from Part 6).

## 1. Get the Mac ready

**1.1 Install `adb`** (Android Debug Bridge, Google's tool for talking to Android devices):

```sh
brew install --cask android-platform-tools
adb version
```

✅ `Android Debug Bridge version 1.0.41` (or newer) and a `Version 37.x` line.

**1.2 Get the project ready:**

```sh
cd ~/Documents/Projects/glance/dashboard
npm install
npm test && npm run build
```

✅ All tests pass, then `Frame compatibility check passed`.

## 2. Connect the frame

**2.1 Go through Frameo's welcome screens, but don't connect to Wi-Fi.** Pick a language, and
when it asks for Wi-Fi, choose **Skip**. Skip pairing a phone too. With the updaters still on,
the frame shouldn't go online until Part 4 is done.

**2.2 Turn on ADB in Frameo.** On the photo screen, tap to show the menu → **Settings** →
**About** → turn on **Beta Program**. A new **ADB access** switch appears below it; turn it on.

**2.3** Connect the data cable from the frame to the Mac and check the Mac sees it:

```sh
system_profiler SPUSBHostDataType | grep -i -B3 -A8 "2207"
```

✅ A block named `Frame` with `Vendor ID: 0x2207`. Go on to 2.4.<br>
❌ Nothing printed: the Mac can't see the frame at all. This is almost always the cable. See
[Mac doesn't see the frame](#mac-doesnt-see-the-frame-nothing-for-2207).

**2.4** Ask `adb` for devices:

```sh
adb devices -l
```

| You see | Meaning | Do this |
| --- | --- | --- |
| `<serial>  device  ... model:Frame` | ✅ Connected and authorised | Go to 2.6 |
| `<serial>  unauthorized` | The frame is waiting for you to allow this Mac | **2.5** |
| `<serial>  offline` | Half-connected | `adb kill-server && adb devices -l`; replug the cable |
| Empty list, but 2.3 found `0x2207` | ADB access is off | Redo 2.2, then replug the cable |

**2.5 Allow the Mac.** The frame shows **"Allow USB debugging?"**. Tick **Always allow from this
computer**, then tap **OK**. Run `adb devices -l` again; it should now say `device`.

**2.6 Check the board:**

```sh
adb shell getprop ro.build.fingerprint
```

✅ Starts with `rockchip/rk3326_go/rk3326_go:8.1.0/`. That's the board this guide is for.<br>
⚠️ Starts with `rockchip/rk312x/` or says Android 6: you have the **other** board. Stop here.

## 3. Check and back up the frame (Phase 0)

**3.1 Check the frame.** One read-only script collects identity, screen, root, WebView version,
the kiosk app and its saved URL, the Home app, disabled apps, network and clock:

```sh
cd ~/Documents/Projects/glance
scripts/frame-check.sh
```

It saves the report to `frames/check-<date>.txt`. That folder is gitignored because the report
contains the frame's serial number; never commit it.

| Section | Good | If not |
| --- | --- | --- |
| Identity | fingerprint `rockchip/rk3326_go/…`, SDK `27` | See 2.6 |
| Screen | `Physical size: 1280x800`, `Physical density: 160` | See [Dashboard is cut off or too big](#dashboard-is-cut-off-or-too-big) |
| Root | `yes, via 'su 0 <cmd>'` | Needed for the WebView step in Part 4; stop and check |
| WebView | `versionName=106…` | `61…` on a new frame: Part 4.2 fixes it |
| Kiosk app | `app.glance.kiosk installed` | Not yet on a new frame: Part 4.3 |
| Default Home app | `app.glance.kiosk/.Home` | Frameo on a new frame: Part 6 |
| Disabled apps | `com.adups.fota`, `android.rockchip.update.service` | Part 4.1, before any Wi-Fi |
| Network and time | frame time ≈ Mac time | Before Wi-Fi the clock reads an old date; that's expected |

**3.2 Back up the firmware.** Read-only: it copies everything except your photos and app data
(the first 8 MiB of the NAND and partitions 1–15, about 3.4 GB, 600 MB gzipped) and checks each
part against a SHA-256 taken on the frame. It takes about 5 minutes over USB.

```sh
scripts/frame-backup.sh
```

✅ Every line ends in `ok`, then `Saved to …/frames/backup-<date>`. Copy that folder somewhere off
the Mac. Do this before anything in Part 4.

## 4. Prepare the frame

Already done on the first frame (2026-10-16, see [frame.md](frame.md#changes-made-to-this-frame));
needed again only on a new or reset frame.

**4.1 ⚠️ Turn off the vendor updaters,** so the frame can go online without a firmware update
taking away root or replacing the WebView:

```sh
adb shell su 0 pm disable-user --user 0 com.adups.fota
adb shell su 0 pm disable-user --user 0 android.rockchip.update.service
```

✅ Each prints `new state: disabled-user`.
**Undo:** `adb shell su 0 pm default-state --user 0 <package>`.

**4.2 ⚠️ Put WebView 106 in `/system`.** The frame ships with WebView 61 and the dashboard needs
106. The stock WebView is signed with the vendor's key, so a newer one can't be installed as an
update; it has to replace the file in `/system`. This uses the same file as wesbos PR #42, the
LineageOS prebuilt 106.0.5249.126:

```sh
mkdir -p ~/Downloads/webview106 && cd ~/Downloads/webview106
curl -fLO https://raw.githubusercontent.com/LineageOS/android_external_chromium-webview_prebuilt_arm/4b0ae494a7dd/webview.apk
shasum -a 256 webview.apk     # must be e2edc1f89ec1608b169da9e7ffc037190b70c7825f0be29694f4cae719980580
unzip -q -j webview.apk 'lib/armeabi-v7a/*' -d lib    # the libraries are compressed; Android needs them unpacked
adb shell mkdir -p /data/local/tmp/glance/lib
adb push webview.apk /data/local/tmp/glance/
adb push lib/. /data/local/tmp/glance/lib/
adb shell su 0 sh -c "'
  set -e; T=/data/local/tmp/glance; W=/system/app/webview
  mount -o remount,rw /system
  [ -f \$W/webview.apk.bak ] || cp -p \$W/webview.apk \$W/webview.apk.bak
  [ -d \$T/oat-61 ] || cp -a \$W/oat \$T/oat-61
  cp \$T/webview.apk \$W/webview.apk
  rm -rf \$W/oat \$W/lib; mkdir -p \$W/lib/arm; cp \$T/lib/*.so \$W/lib/arm/
  chown -R 0:0 \$W; chmod 0755 \$W \$W/lib \$W/lib/arm; chmod 0644 \$W/*.apk* \$W/lib/arm/*.so
  restorecon -R \$W; sync; mount -o remount,ro /system
  rm -rf \$T/webview.apk \$T/lib
'"
adb reboot
```

After the reboot:

```sh
adb shell dumpsys webviewupdate | grep 'Current WebView'
```

✅ `(com.android.webview, 106.0.5249.126)`.
**Undo:** `su 0 mount -o remount,rw /system`, move `webview.apk.bak` back to `webview.apk`,
`rm -rf /system/app/webview/lib`, copy `/data/local/tmp/glance/oat-61` back as
`/system/app/webview/oat`, remount read-only, reboot.

**4.3 ⚠️ Install Glance's kiosk app.** It shows one URL full screen and nothing else. Build it
once (setup in [kiosk/README.md](../kiosk/README.md)), then install it:

```sh
cd ~/Documents/Projects/glance
bash kiosk/build.sh
adb install -r kiosk/build/glance-kiosk.apk
```

✅ `Success`. Installing it doesn't change the Home app; Part 6 does that.
**Undo:** `adb uninstall app.glance.kiosk` (make another app Home first if it's Home).

## 5. Run the dashboard on the frame over USB

This reaches the Mac through the USB cable, so Wi-Fi doesn't matter yet. Edits on the Mac show
up on the frame within a second.

**5.1 Start the dev server** (leave this Terminal window open):

```sh
cd ~/Documents/Projects/glance/dashboard
npm run dev
```

**5.2 In a second Terminal window,** connect the frame's port 5173 to the Mac's through the cable:

```sh
adb reverse tcp:5173 tcp:5173
```

This lasts until the cable is unplugged or the frame restarts; rerun it after either.

**5.3 Open the dashboard in the kiosk,** with remote debugging on for this launch only:

```sh
adb shell 'am start -a android.intent.action.VIEW -d "http://127.0.0.1:5173/?diag" -n app.glance.kiosk/.MainActivity --ez debug true'
```

This shows the page without changing the kiosk's saved URL.

✅ The dashboard on the frame, with the green `?diag` box in the bottom-right corner.

**5.4 Watch it from the Mac.** Open **Google Chrome** on the Mac and go to `chrome://inspect`.
Under the frame you'll see the dashboard page; click **inspect** for its console, elements and
network tab, live from the frame.

**5.5 Test checklist** (this is the end of Phase 1 in the [roadmap](roadmap.md)):

- [ ] **Fits the screen:** all four tiles visible, nothing cut off at the bottom or right.
- [ ] **No errors:** the `chrome://inspect` console has no red lines.
- [ ] **Clock:** before Wi-Fi the frame's clock is wrong, so check the clock after Part 6, or set
      the time by hand in Android settings for now.
- [ ] **Chores:** tap a few; they tick. Reload the page (⌘R in the `chrome://inspect` window, or
      on the frame hold two fingers for 1.5 s → **Reload dashboard**). The ticks are still there.
- [ ] **Speed:** in the `?diag` box, fps should sit at 47 when nothing moves (the panel runs at
      47 Hz, not 60), with long frames rising only at load and when a photo changes.
- [ ] **Photos:** copy a few photos into `dashboard/photos/`, run `npm run photos` (in a third
      Terminal, from `dashboard/`), then reload. They should appear and change every 2 minutes.
- [ ] **Memory:** `adb shell dumpsys meminfo app.glance.kiosk | grep TOTAL`. Note the number now
      and again after an hour of photos; it shouldn't keep climbing.
- [ ] **Night clock:** before Wi-Fi the frame's clock reads about 4 a.m., inside the night window,
      so the red clock appears on its own after 2 minutes. Otherwise, in `dashboard/src/content.js`, temporarily set
      `night: { from: 0, to: 24, idleSeconds: 10 }`, save, and leave the frame alone for 10 s. The
      red clock should appear; one tap brings the dashboard back **without** ticking the chore under
      your finger. **Put the setting back** to `{ from: 22, to: 6, idleSeconds: 120 }` afterwards.

Write down the `?diag` numbers and the memory figure; they go into `docs/frame.md` as the
baseline for later changes.

## 6. Make it the frame's everyday screen

Now the frame should load Glance from the Mac over Wi-Fi, with no cable, and come back to it after a
power cut.

> **When does the Mac need to be awake?** Only when the page **loads**: when the frame starts up,
> when the kiosk restarts, and for the daily refresh. Once the dashboard is on screen it runs on
> the frame by itself; the clock, calendar, chores and night clock keep working, and the photo
> tile rotates through photos it has already shown. If the frame **starts up** while the Mac is
> asleep, it shows "Can't reach the dashboard" until the Mac wakes. Removing that is Phase 1.5 in
> the [roadmap](roadmap.md#phase-15--no-mac-needed).

**6.1 Check Part 4.1 is done** (`scripts/frame-check.sh` lists both updaters under "Disabled
apps"). Then connect the frame to Wi-Fi: hold two fingers on the kiosk for 1.5 s → **Wi-Fi
settings**, or from Frameo's own settings. Use a guest or IoT network if you have one.

**6.2 Build and serve the production version** (leave it running):

```sh
cd ~/Documents/Projects/glance/dashboard
npm run build && npm run preview
```

If macOS asks **"Do you want the application node to accept incoming network connections?"**,
click **Allow**.

**6.3 Find the Mac's address:** `ipconfig getifaddr en0` gives something like `192.168.1.23`.
Check `http://192.168.1.23:4173/` loads from a phone on the same Wi-Fi. Give the Mac a **DHCP
reservation** in your router so the address doesn't change. Don't use the Mac's `.local` name;
Android 8.1 can't look those up.

**6.4 ⚠️ Save that address as the kiosk's URL** (use your address):

```sh
adb shell am start -n app.glance.kiosk/.MainActivity --es url http://192.168.1.23:4173/
```

**Undo:** the same command with another URL.

**6.5 ⚠️ Make the kiosk the Home app,** so the frame boots into it:

```sh
adb shell am start -n app.glance.kiosk/.MainActivity --ez home true
adb shell cmd package set-home-activity --user 0 app.glance.kiosk/.Home
adb shell cmd package resolve-activity --brief -c android.intent.category.HOME -a android.intent.action.MAIN
```

✅ The last line is `app.glance.kiosk/.Home`.
**Undo:** `adb shell cmd package set-home-activity --user 0 net.frameo.frame/.ui.activities.AWaitForDeferredInitCompleted`,
then `adb shell am start -n app.glance.kiosk/.MainActivity --ez home false`.

**6.6 ⚠️ Turn off Frameo** (optional, recommended). Frameo keeps running in the background,
updates itself over the internet, and can take the screen back.

```sh
adb shell su 0 pm disable-user --user 0 net.frameo.frame
```

**Undo:** `adb shell su 0 pm default-state --user 0 net.frameo.frame`. Frameo also holds the **ADB
access** switch: with Frameo off, USB debugging stays as it is, and you change it from Android
Settings → Developer options instead (two-finger hold → **Android settings**).

**6.7 Power-cut test** (Mac awake). Unplug the USB cable, then pull the frame's power, wait 10 s,
and plug it back in.

✅ Within a couple of minutes it shows the Glance dashboard on its own. While Wi-Fi is still
connecting you may briefly see the kiosk's "Connect to Wi-Fi?" or "Can't reach the dashboard"
screen; it retries every 5 s and clears itself.

**6.8 Mac asleep test.** With the dashboard showing, put the Mac to sleep and leave it 10 minutes.

✅ The dashboard stays up: the clock keeps time, chores still tick, and the photo tile keeps
changing. Wake the Mac; nothing on the frame should flicker or reload.

When 6.7 and 6.8 pass, Phase 1 is done.

## Troubleshooting

### Mac doesn't see the frame (nothing for `2207`)

1. **Cable.** The frame lighting up only proves power. Use a USB-A to USB-C cable you know carries
   data (it works for file transfer with a phone). This was the problem on the first frame: the
   first cable charged it but carried no data.
2. **Hub port.** Try another port on the hub, or plug a USB stick into the same port to check it
   carries data.
3. **USB-C to USB-C** doesn't work with this frame at all.
4. **Restart the frame** with the cable connected.

### `unauthorized` but no prompt on screen

```sh
adb kill-server
adb devices -l
```

Unplug and replug, then look at the frame again. If there's still no prompt, turn **ADB access**
off and on in Frameo's settings (or Developer options), then replug.

### `adb: more than one device/emulator`

Another Android device (a phone) is connected. Pick the frame for this Terminal window:

```sh
export ANDROID_SERIAL=<the frame's serial from adb devices -l>
```

### Dashboard shows "Can't reach the dashboard" over USB (Part 5)

- `npm run dev` stopped: check its window.
- The `adb reverse` was lost (cable replugged, frame restarted): run
  `adb reverse tcp:5173 tcp:5173` again.

### Frame can't reach the Mac over Wi-Fi (Part 6)

- `npm run preview` stopped, or the Mac was asleep when the frame started up. Wake it; the kiosk
  retries every 5 s.
- The Mac's address changed: `ipconfig getifaddr en0`, then redo 6.4.
- macOS firewall: **System Settings → Network → Firewall → Options**, allow incoming connections
  for `node`.
- Different networks: the frame must be on the same Wi-Fi as the Mac, not a guest network that
  isolates devices from each other.

### Dashboard is cut off or too big

`wm density` isn't 160. ⚠️ Changes the frame (undo: `adb shell wm density reset`):

```sh
adb shell wm density 160
```

### Dashboard looks broken (unstyled, missing fonts, wrong colours)

- Open `chrome://inspect` and read the console.
- Check the WebView is 106 (Part 4.2). On 61, the page can't render.
- Run `npm run build` on the Mac: the compatibility check names any CSS or JS the frame can't run.

### Clock shows the wrong time

Android's own clock is off. Before the frame has been online it reads its firmware date
(28 Sep 2025); the dashboard leaves the calendar alone until the real date arrives. Once on Wi-Fi,
check **Settings → Date & time → Automatic date & time** is on.

### Stuck in another app with no way back

The frame has no navigation bar. `adb shell input keyevent KEYCODE_HOME` goes Home, and
`adb shell am start -n app.glance.kiosk/.MainActivity` opens the kiosk. For on-screen Back and
Dashboard buttons, see "Frames without Home or Back buttons" in [kiosk/README.md](../kiosk/README.md).

### Useful commands

| Command | What it does |
| --- | --- |
| `adb devices -l` | List connected devices |
| `adb kill-server` | Restart `adb` on the Mac (fixes most odd states) |
| `adb shell` | Open a shell on the frame (`exit` to leave) |
| `adb shell input keyevent KEYCODE_HOME` | Press Home on the frame |
| `adb shell am start -n app.glance.kiosk/.MainActivity` | Open the kiosk |
| `adb exec-out screencap -p > frame.png` | Screenshot of the frame's screen, on the Mac |
| `adb logcat -d \| grep -iE "chromium\|Glance" \| tail -40` | Recent page errors and kiosk logs |
| `adb reboot` | Restart the frame |

## Safety notes

- This frame runs Android 8.1 with a 2020 security patch and gives root to any app that asks.
  Keep it on a guest or IoT network, and don't sign into any personal accounts on it.
- Don't turn on ADB over Wi-Fi (`adb tcpip`). On a rooted frame it gives root to anyone who can
  get a key approved.
- Before anything that **changes** the frame beyond this guide, make sure the Part 3.2 backup
  exists and is copied off the Mac. Restoring from it is untested.
