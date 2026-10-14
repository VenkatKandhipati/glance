# Connecting the frame and running Glance on it

A step-by-step guide for **this** frame: getting the Mac ready, connecting the frame over USB,
checking what's on it (Phase 0), and getting the MVP dashboard running on it (the end of Phase 1).
Everything here is copy-paste, run from Terminal on the Mac.

**Nothing in Parts 1–4 changes the frame.** Part 5 changes one setting: the kiosk's saved URL,
which you can change back with the same command. Every step that touches the frame says so first.

| Part | What you'll have at the end | Time |
| --- | --- | --- |
| [1. Get the Mac ready](#1-get-the-mac-ready) | `adb` installed | 5 min |
| [2. Connect the frame](#2-connect-the-frame) | `adb devices` lists the frame | 5–20 min |
| [3. Check the frame (Phase 0)](#3-check-the-frame-phase-0) | A report of what's on the frame | 5 min |
| [4. Run the dashboard on the frame over USB](#4-run-the-dashboard-on-the-frame-over-usb) | The MVP on the frame's screen, live-reloading | 15 min |
| [5. Make it the frame's everyday screen](#5-make-it-the-frames-everyday-screen) | The frame boots into Glance over Wi-Fi | 15 min |
| [Troubleshooting](#troubleshooting) | | |

## Your frame

| | |
| --- | --- |
| Model | Akimart ZN-DP1002, 10.1" |
| Board | Rockchip **RK3126**: 4× Cortex-A7, Mali-400 GPU |
| Memory / storage | 1 GB RAM (128 MB zRAM), 32 GB eMMC |
| Screen | 1280 × 800, touch |
| Wi-Fi | `rk915_sdio` |
| Software | Android 6.0.1, WebView 107, USB ADB and root built in, fullscreen kiosk |
| USB vendor ID | `0x2207` (Rockchip). This is how the Mac recognises it |

> [!WARNING]
> **Two different boards are sold as the ZN-DP1002.** Yours should be the RK3126 / Android 6
> one. The other has an RK3326 and Android 8.1, and its guide
> ([wesbos `akimart-zn-dp1002.md`](https://github.com/wesbos/photo-frame-dashboard/blob/main/docs/akimart-zn-dp1002.md))
> uses commands and partition offsets that don't apply to yours. Part 3 confirms which one you
> have. **Don't run anything from either repo's setup scripts on this frame;** this guide doesn't need them.

### What you need

- [ ] The frame and its power adapter.
- [ ] A **USB-A to USB-C data cable**. On these frames a USB-C to USB-C cable usually gives no power
      and no data (their USB-C port doesn't announce itself the way the Mac expects). The cable that
      came with the frame is often power-only.
- [ ] If your Mac has only USB-C ports: a **USB-C to USB-A adapter**, plugged **directly** into the
      Mac. Hubs and docks often don't work for this.
- [ ] The frame and the Mac on the **same Wi-Fi network** (only for Part 5).

## 1. Get the Mac ready

Homebrew, Node and git are already on this Mac. If you're setting up a different Mac, run the
optional block first.

<details>
<summary>Optional: a Mac without Homebrew or Node</summary>

```sh
# Homebrew (the official installer; it asks for your Mac password)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Apple silicon: put brew on your PATH (the installer prints this too)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile && eval "$(/opt/homebrew/bin/brew shellenv)"

brew install node git
```
</details>

**1.1 Install `adb`** (Android Debug Bridge, Google's tool for talking to Android devices):

```sh
brew install --cask android-platform-tools
```

**1.2 Check it works:**

```sh
adb version
```

✅ You should see `Android Debug Bridge version 1.0.41` (or newer) and a `Version 37.x` line.

**1.3 Get the project ready** (skip if you've already run it):

```sh
cd ~/Documents/Projects/glance/dashboard
npm install
npm test && npm run build
```

✅ `pass 12`, then `Frame compatibility check passed`.

## 2. Connect the frame

**2.1** Plug the frame into power and turn it on. Wait until it has fully started (its photo app or
dashboard is showing).

**2.2** Connect the USB-A to USB-C data cable from the frame to the Mac (through the adapter if
needed). If the frame's only port is the USB-C one, this cable powers it too.

**2.3** Check that the Mac sees a Rockchip device on USB:

```sh
system_profiler SPUSBHostDataType | grep -i -B3 -A8 "2207"
```

✅ A block with `Vendor ID: 0x2207`. The Mac can see the frame. Go on to 2.4.<br>
❌ Nothing printed: the Mac can't see it at all. This is almost always the cable, adapter or port.
Go to [Mac doesn't see the frame](#mac-doesnt-see-the-frame-nothing-for-2207).

**2.4** Ask `adb` for devices:

```sh
adb devices -l
```

| You see | Meaning | Do this |
| --- | --- | --- |
| `<serial>  device  ... model:...` | ✅ Connected and authorised | Go to Part 3 |
| `<serial>  unauthorized` | The frame is waiting for you to allow this Mac | **2.5** |
| `<serial>  offline` | Half-connected | `adb kill-server && adb devices -l`; replug the cable |
| Empty list, but 2.3 found `0x2207` | USB debugging is off on the frame | [USB debugging is off](#usb-debugging-is-off) |

**2.5 Allow the Mac.** Look at the frame's screen: an **"Allow USB debugging?"** box with the
Mac's key fingerprint. Tick **Always allow from this computer**, then tap **OK**. Run
`adb devices -l` again; it should now say `device`.

> If no box appears, unplug and replug the cable, then look again. On some frames the box hides
> behind the kiosk; the [troubleshooting section](#unauthorized-but-no-prompt-on-screen) covers it.

**2.6 Quick sanity check:**

```sh
adb shell getprop ro.build.fingerprint
```

✅ Starts with `rockchip/rk312x/rk312x:6.0.1/`. That's the RK3126 board this guide is for.<br>
⚠️ Starts with `rockchip/rk3326_go/` or says Android 8.1: you have the **other** board. Stop and
check before going further; Parts 3–5 should still work, but nothing else here has been checked
against that board.

## 3. Check the frame (Phase 0)

One read-only script collects everything we need to know: identity, screen, root, WebView
version, the kiosk app and its saved URL, the Home app, apps that were disabled before, network and
clock. **It changes nothing on the frame.**

```sh
cd ~/Documents/Projects/glance
scripts/frame-check.sh
```

It prints a report and saves it to `frames/check-<date>.txt`. That folder is gitignored, because
the report contains the frame's serial number and network details. Never commit it.

> If the script seems to hang at the start, look at the frame: a few `su` builds show a
> **root permission prompt**. Tap **Grant/Allow**.

**What to look for in the report**

| Section | Good | If not |
| --- | --- | --- |
| Identity | fingerprint `rockchip/rk312x/rk312x:6.0.1/…`, SDK `23` | See 2.6 |
| Screen | `Physical size: 1280x800`, `Physical density: 160` | Density not 160 means the bottom of the dashboard gets cut off. See [Dashboard is cut off or too big](#dashboard-is-cut-off-or-too-big) |
| Root | `yes` | Not needed for Glance; only the saved-URL and Home-app lines need it |
| WebView | `versionName=106…` or `107…` | 44 or similar means the WebView was never upgraded, and the dashboard won't render. Stop and check before upgrading anything |
| Kiosk app | `com.wesbos.homehq installed`, with a URL in its saved settings | Different kiosk, or none: see [No kiosk, or a different one](#no-kiosk-or-a-different-one) |
| Default Home app | `com.wesbos.homehq` | Fine either way for testing; matters for Part 5 |
| Disabled apps | Frameo / FOTA / `mxota` / Rockchip update service | If Frameo or an updater is still enabled, keep the frame off the internet until we decide what to do |
| Network and time | an `inet 192.168…` address; frame time ≈ Mac time | Wi-Fi only matters for Part 5. A wrong time means the clock tile will be wrong too |

**3.1 Record it.** Send me the report (paste it in the chat). I'll fill in the device record in
[`docs/frame.md`](frame.md) with everything except the serial number and addresses, and tick off
Phase 0 in the [roadmap](roadmap.md).

## 4. Run the dashboard on the frame over USB

This uses the frame's existing kiosk app (`com.wesbos.homehq`) and reaches the Mac through the USB
cable, so Wi-Fi doesn't matter yet. Edits on the Mac show up on the frame within a second.

**4.1 Start the dev server** (leave this Terminal window open):

```sh
cd ~/Documents/Projects/glance/dashboard
npm run dev
```

**4.2 In a second Terminal window,** connect the frame's port 5173 to the Mac's through the cable:

```sh
adb reverse tcp:5173 tcp:5173
```

This lasts until the cable is unplugged or the frame restarts; rerun it after either.

**4.3 Open the dashboard in the kiosk,** with remote debugging on for this launch only:

```sh
adb shell 'am start -a android.intent.action.VIEW -d "http://127.0.0.1:5173/?diag" -n com.wesbos.homehq/.MainActivity --ez debug true'
```

This shows the page without changing the kiosk's saved URL. The next normal launch goes back to it.

✅ The dashboard on the frame, with the green `?diag` box in the bottom-right corner.

> **No `com.wesbos.homehq` on the frame?** Use the frame's default browser for now:
> `adb shell am start -a android.intent.action.VIEW -d "http://127.0.0.1:5173/?diag"`.
> If that opens Firefox, it isn't a fair test: Firefox brings its own engine, not the WebView the
> kiosk uses. See [No kiosk, or a different one](#no-kiosk-or-a-different-one).

**4.4 Watch it from the Mac.** Open **Google Chrome** on the Mac and go to `chrome://inspect`.
Under the frame's name you'll see the dashboard page; click **inspect** to get its console,
elements and network tab, live from the frame.

**4.5 Test checklist** (this is the end of Phase 1 in the [roadmap](roadmap.md)):

- [ ] **Fits the screen:** all four tiles visible, nothing cut off at the bottom or right.
- [ ] **No errors:** the `chrome://inspect` console has no red lines.
- [ ] **Clock:** matches the Mac's time; the greeting fits the time of day.
- [ ] **Chores:** tap a few; they tick. Reload the page (in the `chrome://inspect` window press
      ⌘R, or on the frame hold two fingers for 1.5 s → **Reload dashboard**). The ticks are still there.
- [ ] **Speed:** in the `?diag` box, fps should sit near 60 when nothing moves, with long frames
      rising only when a photo changes.
- [ ] **Photos:** copy a few photos into `dashboard/photos/`, run `npm run photos` (in a third
      Terminal, from `dashboard/`), then reload. They should appear and change every 2 minutes.
- [ ] **Memory:** `adb shell dumpsys meminfo com.wesbos.homehq | grep TOTAL`. Note the number now
      and again after an hour of photos; it shouldn't keep climbing.
- [ ] **Night clock:** don't wait for 10 p.m. In `dashboard/src/content.js`, temporarily set
      `night: { from: 0, to: 24, idleSeconds: 10 }`, save, and leave the frame alone for 10 s. The
      red clock should appear; one tap brings the dashboard back **without** ticking the chore under
      your finger. **Put the setting back** to `{ from: 22, to: 6, idleSeconds: 120 }` afterwards.

Write down the `?diag` numbers and the memory figure; they go into `docs/frame.md` as the
baseline for later changes.

## 5. Make it the frame's everyday screen

Now the frame should load Glance from the Mac over Wi-Fi, with no cable, and come back to it after a
power cut.

> **When does the Mac need to be awake?** Only when the page **loads**: when the frame starts up,
> when the kiosk restarts, and for the daily refresh. Once the dashboard is on screen it runs on
> the frame by itself, so you can put the Mac to sleep:
>
> - The clock, calendar, chores and night clock keep working as normal.
> - The photo tile keeps rotating through the photos it has already shown. New photos appear
>   again once the Mac wakes.
> - The daily 3 a.m. refresh waits until the Mac is awake, so the frame never swaps a working
>   dashboard for an error screen.
>
> The one case the Mac matters: if the frame **starts up** while the Mac is asleep (after a power
> cut), it shows "Can't reach the dashboard" until the Mac wakes. Removing that is on the
> [roadmap](roadmap.md#phase-15--no-mac-needed) (Phase 1.5).

**5.1 Build and serve the production version** (leave it running):

```sh
cd ~/Documents/Projects/glance/dashboard
npm run build && npm run preview
```

If macOS asks **"Do you want the application node to accept incoming network connections?"**,
click **Allow**. Otherwise the frame can't reach the Mac.

**5.2 Find the Mac's address** on the Wi-Fi network:

```sh
ipconfig getifaddr en0
```

You'll get something like `192.168.1.23`. Check it from a phone on the same Wi-Fi first: open
`http://192.168.1.23:4173/` in its browser and the dashboard should load.

> This address can change when the Mac reconnects. To stop that, give the Mac a **DHCP
> reservation** in your router's settings. Don't use the Mac's `.local` name; Android 6 can't
> look those up.

**5.3 ⚠️ Changes the frame:** save that address as the kiosk's dashboard URL (use your address):

```sh
adb shell am start -n com.wesbos.homehq/.MainActivity --es url http://192.168.1.23:4173/
```

**Undo:** run the same command with the URL that `scripts/frame-check.sh` showed under
"Saved settings" in Part 3.

**5.4 Check the kiosk is the Home app** (so the frame boots into it). The Part 3 report's
"Default Home app" section should mention `com.wesbos.homehq`. If it doesn't, stop here and
send me the report: making it the Home app is a frame change we'll do deliberately.

**5.5 Power-cut test** (Mac awake). Unplug the USB cable, then pull the frame's power, wait 10 s,
and plug it back in.

✅ Within a couple of minutes it shows the Glance dashboard on its own. While Wi-Fi is still
connecting you may briefly see the kiosk's "Connect to Wi-Fi?" or "Can't reach the dashboard"
screen; it retries every 5 s and clears itself.

**5.6 Mac asleep test.** With the dashboard showing, put the Mac to sleep (Apple menu → Sleep) and
leave it 10 minutes.

✅ The dashboard stays up: the clock keeps time, chores still tick, and the photo tile keeps
changing (between photos it has already shown). Wake the Mac; nothing on the frame should flicker
or reload.

When 5.5 and 5.6 pass, Phase 1 is done. 🎉

## Troubleshooting

### Mac doesn't see the frame (nothing for `2207`)

Work down the list; most fixes are in the first three.

1. **Cable.** Use a USB-A to USB-C cable you know carries data (it works for file transfer with a
   phone). Many cables are charge-only. USB-C to USB-C usually does nothing on these frames.
2. **Adapter, hub or dock.** Plug the adapter straight into the Mac. Try the other USB-C port.
3. **The right port on the frame.** If the frame has more than one port, the data one is usually
   USB-C (marked, or next to the power jack). A micro-USB or barrel jack may be power-only.
4. **Power.** Some frames don't power up properly from a Mac port alone. If the frame has a
   separate power input, keep its adapter plugged in as well.
5. **Restart both:** unplug, restart the frame, plug in again once it has started.

### USB debugging is off

The Mac sees `0x2207`, but `adb devices` stays empty. Turn it on from the frame's screen:

- **If the kiosk is showing:** hold **two fingers** on the screen, a few centimetres apart, for
  1.5 s → **Android settings**.
- **If Frameo is showing:** Frameo **Settings → About → Beta program → ADB access** on. (On the
  other ZN-DP1002 board, this turned on USB ADB only.)
- **In Android Settings:** **About tablet** → tap **Build number** 7 times ("You are now a
  developer") → back → **Developer options** → **USB debugging** on.

Then unplug and replug the cable and run `adb devices -l` again.

### `unauthorized` but no prompt on screen

```sh
adb kill-server
adb devices -l
```

Unplug and replug, then look at the frame again. If the kiosk covers the prompt, hold two fingers
for 1.5 s → **Open launcher**; the prompt is often behind it. Still nothing: on the frame,
**Developer options → Revoke USB debugging authorizations**, then replug.

### `adb: more than one device/emulator`

Another Android device (a phone) is connected. Find the frame's serial in `adb devices -l` and
pick it for this Terminal window:

```sh
export ANDROID_SERIAL=<the frame's serial>
```

### Dashboard shows "Can't reach the dashboard" over USB (Part 4)

- `npm run dev` stopped: check its window.
- The `adb reverse` was lost (cable replugged, frame restarted): run
  `adb reverse tcp:5173 tcp:5173` again.
- Check from the frame's side: `adb shell 'curl -sI http://127.0.0.1:5173/ | head -1'`
  (if `curl` isn't on the frame, skip this).

### Frame can't reach the Mac over Wi-Fi (Part 5)

- `npm run preview` stopped, or the Mac was asleep when the frame started up. Wake it; the kiosk
  retries every 5 s and the dashboard appears by itself.
- The Mac's address changed: `ipconfig getifaddr en0`, then redo 5.3.
- macOS firewall: **System Settings → Network → Firewall → Options**, allow incoming connections
  for `node`.
- Different networks: the frame must be on the same Wi-Fi as the Mac, not a guest network
  that isolates devices from each other. The Part 3 report shows the frame's address; its first
  three numbers should match the Mac's.

### Dashboard is cut off or too big

`wm density` wasn't 160 in Part 3. **Changes the frame** (undo: `adb shell wm density reset`):

```sh
adb shell wm density 160
```

Android's own menus get smaller too. The setting survives a restart.

### No kiosk, or a different one

If `com.wesbos.homehq` isn't installed, or the frame shows something else full screen, stop and
send me the Part 3 report. The roadmap's plan is to bring in Glance's own kiosk app at that point
instead of in Phase 3. Don't install anything on the frame yet.

### Dashboard looks broken (unstyled, missing fonts, wrong colours)

- Open `chrome://inspect` and read the console.
- Check the WebView version in the Part 3 report. Below 106, the page can't render.
- Run `npm run build` on the Mac: the compatibility check names any CSS or JS the frame can't run.

### Clock shows the wrong time

Android's own clock is off. Check that the frame has Wi-Fi and network time on (**Settings → Date &
time → Automatic date & time**). Right after a power cut the frame may read 1970 for a minute; the
dashboard waits for the real date before drawing the calendar.

### Useful commands

| Command | What it does |
| --- | --- |
| `adb devices -l` | List connected devices |
| `adb kill-server` | Restart `adb` on the Mac (fixes most odd states) |
| `adb shell` | Open a shell on the frame (`exit` to leave) |
| `adb shell input keyevent KEYCODE_HOME` | Press Home on the frame |
| `adb shell am start -n com.wesbos.homehq/.MainActivity` | Open the kiosk |
| `adb exec-out screencap -p > frame.png` | Screenshot of the frame's screen, on the Mac |
| `adb logcat -d \| grep -iE "chromium\|HomeHQ" \| tail -40` | Recent page errors and kiosk logs |
| `adb reboot` | Restart the frame |

## Safety notes

- This frame runs Android 6 with years-old security patches (the Part 3 report shows the date)
  and gives root to any app without asking.
  Keep it on your home Wi-Fi (ideally a guest or IoT network once you're past Part 5), and don't
  sign into any personal accounts on it.
- Don't turn on ADB over Wi-Fi (`adb tcpip`). On a rooted frame it gives root to anyone on the
  network.
- Before anything that **changes** the frame beyond what this guide does, take a backup first.
  wesbos's [BIUFRAME guide](https://github.com/wesbos/photo-frame-dashboard/blob/main/docs/biuframe-setup-guide.md#step-3-back-up-the-firmware)
  covers the same chip, but its script stops on this frame's partition layout (no
  `/dev/block/by-name`), so we'd adapt it, not run it as-is.
