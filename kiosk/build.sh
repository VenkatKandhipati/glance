#!/usr/bin/env bash
# Builds kiosk/build/glance-kiosk.apk without Gradle. Adapted from wesbos/photo-frame-dashboard
# (dashboard/kiosk/build.sh, commit 48b4ab0) with permission; see CREDITS.md.
# Needs JDK 17 + Android build-tools 34 + platform 34:
#   brew install --cask android-commandlinetools
#   sdkmanager --sdk_root=$ANDROID_HOME "build-tools;34.0.0" "platforms;android-34"
# Install on the frame: adb install -r kiosk/build/glance-kiosk.apk
set -euo pipefail
cd "$(dirname "$0")"

ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
# d8 from build-tools 34 crashes (NullPointerException) on classes from some newer JDKs; then
# point BUILD_TOOLS at a newer version, e.g. BUILD_TOOLS=$ANDROID_HOME/build-tools/36.1.0
BT="${BUILD_TOOLS:-$ANDROID_HOME/build-tools/34.0.0}"
JAR="$ANDROID_HOME/platforms/android-34/android.jar"
KS="$HOME/.android/debug.keystore"

rm -rf build && mkdir -p build/gen build/classes

# assets/www/ holds the built dashboard (`npm run frame` fills it; gitignored). Without it the app
# still builds, and shows whatever URL is saved.
ASSETS=()
[ -d assets ] && ASSETS=(-A assets)

"$BT/aapt2" compile --dir res -o build/res.zip
"$BT/aapt2" link -o build/base.apk -I "$JAR" --manifest AndroidManifest.xml build/res.zip ${ASSETS[@]+"${ASSETS[@]}"} \
  --java build/gen --min-sdk-version 23 --target-sdk-version 23 --version-code 2 --version-name 0.2

javac -nowarn -source 8 -target 8 -classpath "$JAR" -d build/classes \
  src/app/glance/kiosk/*.java build/gen/app/glance/kiosk/R.java

"$BT/d8" --min-api 23 --lib "$JAR" --output build $(find build/classes -name '*.class')
(cd build && zip -qj base.apk classes.dex)
"$BT/zipalign" -f 4 build/base.apk build/aligned.apk

if [ ! -f "$KS" ]; then
  mkdir -p "$(dirname "$KS")"
  keytool -genkeypair -keystore "$KS" -storepass android -keypass android -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --out build/glance-kiosk.apk build/aligned.apk
echo "Built kiosk/build/glance-kiosk.apk"
