package app.glance.kiosk;

import android.content.Context;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;
import java.io.File;

/**
 * Lets the dashboard turn the screen's backlight fully off at night and back on with a tap, as
 * `GlanceKiosk.setScreenOn(false/true)`. Android's lowest brightness only dims this panel (0 → 20
 * of 255), so it writes the backlight itself through root (`su 0`, as on the RK3326 frames). The
 * touch screen keeps working while the light is off. "On" restores Android's own brightness
 * setting, and so does the kiosk leaving the foreground, so the screen is never left dark.
 * Frames without root or this backlight file just ignore it.
 */
final class Backlight {
  private static final String PATH = "/sys/class/backlight/backlight/brightness";
  private final Context context;
  private boolean off;

  Backlight(Context context) {
    this.context = context;
  }

  @JavascriptInterface
  public void setScreenOn(boolean on) {
    if (on) restore();
    else turnOff();
  }

  synchronized void turnOff() {
    if (off || !new File(PATH).exists()) return;
    off = true;
    write(0);
  }

  synchronized void restore() {
    if (!off) return;
    off = false;
    write(Settings.System.getInt(context.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, 128));
  }

  // On a background thread: su can take a moment, and the page shouldn't wait for it.
  private void write(final int value) {
    new Thread(() -> {
      try {
        Process p = Runtime.getRuntime().exec(new String[] {"su", "0", "sh", "-c", "echo " + value + " > " + PATH});
        int code = p.waitFor();
        Log.i(MainActivity.TAG, "Backlight → " + value + (code == 0 ? "" : " failed (" + code + ")"));
      } catch (Exception e) {
        Log.w(MainActivity.TAG, "Backlight → " + value + " failed", e);
      }
    }).start();
  }
}
