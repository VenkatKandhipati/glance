# kiosk

The Android app the frame boots into: one fullscreen WebView showing the dashboard, nothing else.
Package `app.glance.kiosk`, Android 6+ (built for API 23).

Adapted from the Home HQ kiosk in
[wesbos/photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard/tree/main/dashboard/kiosk)
(commit `48b4ab0`) with Wes Bos's permission; see [CREDITS.md](../CREDITS.md). Glance changes the
package name and labels, and the default URL: the upstream app opens a hosted demo, this one opens
the Mac's dev server through `adb reverse`, so the frame never loads a third-party site.

## On the frame

- **Controls:** hold two fingers still for 1.5 s → **Open launcher**, **Android settings**,
  **Wi-Fi settings**, **Reload dashboard**. The dashboard must not use a two-finger hold itself.
- **Offline:** if the page fails to load, a native "Connect to Wi-Fi?" or "Can't reach the
  dashboard" screen covers WebView's error page and the kiosk retries every 5 s.
- **Remote debugging** (`chrome://inspect`) is on only for a launch with `--ez debug true`.

## Commands

```sh
# Save the dashboard URL, used on every later launch
adb shell am start -n app.glance.kiosk/.MainActivity --es url http://<mac-lan-ip>:4173/

# Show a URL once without saving it, with remote debugging on
adb shell 'am start -a android.intent.action.VIEW -d "http://127.0.0.1:5173/?diag" -n app.glance.kiosk/.MainActivity --ez debug true'

# Make it the Home app (undo: set Frameo back, then --ez home false)
adb shell am start -n app.glance.kiosk/.MainActivity --ez home true
adb shell cmd package set-home-activity --user 0 app.glance.kiosk/.Home
```

The Home entry is off until `--ez home true`, so installing the app doesn't bring up a Home
chooser. Full steps, with undo, are in [docs/connect-the-frame.md](../docs/connect-the-frame.md).

## Frames without Home or Back buttons

This frame has no navigation bar. The two-finger hold only works inside the kiosk, so from
Android settings there's no way back except `adb shell am start -n app.glance.kiosk/.MainActivity`.
For floating **Back** and **Dashboard** buttons outside the kiosk, turn on **Glance navigation** in
Android **Settings → Accessibility**. It reads no screen content and needs no root. If firmware
keeps dropping it, this optional grant lets the kiosk put it back each time it starts:

```sh
adb shell pm grant app.glance.kiosk android.permission.WRITE_SECURE_SETTINGS   # undo: pm revoke …
```

## Build

Needs JDK 17, Android build-tools 34.0.0 and platform 34, with no Gradle:

```sh
brew install openjdk@17
brew install --cask android-commandlinetools
export JAVA_HOME=$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home PATH="$(brew --prefix openjdk@17)/bin:$PATH"
sdkmanager --sdk_root=/opt/homebrew/share/android-commandlinetools "build-tools;34.0.0" "platforms;android-34"
```

`sdkmanager` asks you to accept Google's Android SDK licence. Then, from the repository root:

```sh
bash kiosk/build.sh
adb install -r kiosk/build/glance-kiosk.apk
```

The APK is signed with the Mac's Android debug key (`~/.android/debug.keystore`, created on the
first build). An update must be signed with the same key, so keep that file; with a different
key, `adb install -r` fails and the app has to be uninstalled first, which clears its saved URL.
