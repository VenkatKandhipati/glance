#!/usr/bin/env bash
# Read-only snapshot of the photo frame over ADB. It changes nothing on the frame.
# Prints a report and saves a copy to frames/<date>.txt (gitignored: it contains the frame's
# serial number and network details, so never commit it).
#
#   scripts/frame-check.sh
#
# With more than one Android device attached, pick one first: export ANDROID_SERIAL=<serial>
set -u

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install it with: brew install --cask android-platform-tools" >&2
  exit 1
fi

state=$(adb get-state 2>&1 | tr -d '\r')
case "$state" in
  device) ;;
  *unauthorized*) echo "The frame hasn't allowed this Mac yet. Tap 'Allow' on its screen (tick 'Always allow'), then rerun." >&2; exit 1 ;;
  *more\ than\ one*) echo "More than one device attached. Run 'adb devices -l', then: export ANDROID_SERIAL=<serial>" >&2; exit 1 ;;
  *) echo "No frame found ($state). See 'Troubleshooting' in docs/connect-the-frame.md." >&2; exit 1 ;;
esac

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$ROOT_DIR/frames"
REPORT="$ROOT_DIR/frames/check-$(date +%Y%m%d-%H%M%S).txt"

sh_()  { adb shell "$1" 2>&1 | tr -d '\r'; }
prop() { printf '%-32s %s\n' "$1" "$(sh_ "getprop $1")"; }

# Root: `su 0 <cmd>` on this RK3326 frame (`su -c` fails there); SuperSU-style `su -c` on others.
SU=none
if sh_ "su 0 id" | grep -q 'uid=0'; then SU=0
elif sh_ "su -c id" | grep -q 'uid=0'; then SU=c
fi
root() {
  case $SU in
    c) sh_ "su -c \"$1\"" ;;
    0) sh_ "su 0 sh -c \"$1\"" ;;
    *) echo "(needs root, which wasn't found)" ;;
  esac
}

{
  echo "Glance frame check · $(date '+%Y-%m-%d %H:%M:%S')"
  echo
  echo "== Identity"
  prop ro.build.fingerprint
  prop ro.product.model
  prop ro.product.brand
  prop ro.product.manufacturer
  prop ro.board.platform
  prop ro.build.version.release
  prop ro.build.version.sdk
  prop ro.build.version.security_patch
  prop ro.serialno
  echo "Expected for this frame: fingerprint starting 'rockchip/rk3326_go/rk3326_go:8.1.0', SDK 27."
  echo
  echo "== Screen (want 1280x800 and density 160)"
  sh_ "wm size"
  sh_ "wm density"
  echo
  echo "== Memory and swap"
  sh_ "cat /proc/meminfo" | head -3
  sh_ "cat /proc/swaps"
  echo
  echo "== Root"
  case $SU in
    c) echo "root: yes, via 'su -c <cmd>'" ;;
    0) echo "root: yes, via 'su 0 <cmd>'" ;;
    *) echo "root: not found" ;;
  esac
  echo
  echo "== WebView (want 106 or newer)"
  for p in com.android.webview com.google.android.webview; do
    v=$(sh_ "dumpsys package $p" | grep -m1 versionName | sed 's/^ *//')
    [ -n "$v" ] && echo "$p $v"
  done
  echo
  echo "== Kiosk app"
  if sh_ "pm list packages" | grep -q 'app.glance.kiosk'; then
    echo "app.glance.kiosk installed"
    sh_ "dumpsys package app.glance.kiosk" | grep -m1 versionName | sed 's/^ *//'
    echo "Saved settings (look for the dashboard URL):"
    root "cat /data/data/app.glance.kiosk/shared_prefs/*.xml"
  else
    echo "app.glance.kiosk not installed. Other likely kiosk/browser apps:"
    sh_ "pm list packages" | grep -iE 'kiosk|homehq|frame|browser|firefox|lightning|launcher' | sed 's/^package://'
  fi
  echo
  echo "== What's on screen now"
  sh_ "dumpsys window windows" | grep -E 'mCurrentFocus|mFocusedApp' | sed 's/^ *//'
  echo
  echo "== Default Home app"
  sh_ "cmd package resolve-activity --brief -c android.intent.category.HOME -a android.intent.action.MAIN" | tail -1
  echo
  echo "== Apps you (or a previous owner) installed"
  sh_ "pm list packages -3" | sed 's/^package://' | sort
  echo
  echo "== Disabled apps (vendor apps switched off earlier)"
  sh_ "pm list packages -d" | sed 's/^package://' | sort
  echo
  echo "== Network and time"
  sh_ "ip -f inet addr show wlan0" | grep inet | sed 's/^ *//'
  sh_ "dumpsys wifi" | grep -m1 'mNetworkInfo' | sed 's/^ *//' | cut -c1-160
  echo "frame time: $(sh_ date)   Mac time: $(date)"
  prop persist.sys.timezone
  echo
  echo "== Let's Encrypt roots in the system trust store (informational)"
  sh_ "ls /system/etc/security/cacerts" | grep -E '6187b673|8794b4e3' || echo "none"
} | tee "$REPORT"

echo
echo "Saved to $REPORT (gitignored; don't commit it)."
