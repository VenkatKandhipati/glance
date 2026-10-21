package app.glance.kiosk;

import android.content.Context;
import android.util.Log;
import android.webkit.JavascriptInterface;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * Small files the dashboard keeps outside the WebView's own storage, as `GlanceFiles.read(name)`
 * and `GlanceFiles.write(name, text)`: the Pomodoro log, so it survives the WebView's storage
 * being cleared and can be copied off the frame without root:
 *   adb pull /sdcard/Android/data/app.glance.kiosk/files/pomodoro.json
 * Only plain `name.json` files in the app's own folder, up to 2 MB each. A write goes to a
 * temporary file that is synced, then renamed over the old one, so a power cut mid-write leaves
 * the previous copy whole.
 */
final class FileStore {
  private static final Pattern NAME = Pattern.compile("[a-z0-9-]{1,40}\\.json");
  private static final int MAX = 2 * 1024 * 1024;
  private final Context context;

  FileStore(Context context) {
    this.context = context;
  }

  private File file(String name) {
    if (name == null || !NAME.matcher(name).matches()) return null;
    File dir = context.getExternalFilesDir(null);
    return dir == null ? null : new File(dir, name);
  }

  /** The file's text, or "" when there is none. */
  @JavascriptInterface
  public synchronized String read(String name) {
    File f = file(name);
    if (f == null || !f.isFile() || f.length() > MAX) return "";
    try (InputStream in = new FileInputStream(f)) {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      byte[] buf = new byte[8192];
      for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
      return new String(out.toByteArray(), StandardCharsets.UTF_8);
    } catch (Exception e) {
      Log.w(MainActivity.TAG, "Reading " + name + " failed", e);
      return "";
    }
  }

  @JavascriptInterface
  public synchronized boolean write(String name, String text) {
    File f = file(name);
    if (f == null || text == null) return false;
    byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
    if (bytes.length > MAX) return false;
    File tmp = new File(f.getPath() + ".tmp");
    try (FileOutputStream out = new FileOutputStream(tmp)) {
      out.write(bytes);
      out.getFD().sync();
    } catch (Exception e) {
      Log.w(MainActivity.TAG, "Writing " + name + " failed", e);
      return false;
    }
    return tmp.renameTo(f);
  }
}
