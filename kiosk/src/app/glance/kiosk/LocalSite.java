package app.glance.kiosk;

import android.content.Context;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.regex.Pattern;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;

/**
 * Serves the dashboard from inside the app at https://glance.local/, so the frame needs no server:
 * - the built page (`npm run frame` copies dashboard/dist-frame/ into assets/www/)
 * - /photos/ lists, and /photos/<name> serves, the JPEGs `npm run frame` pushes to
 *   /sdcard/Android/data/app.glance.kiosk/files/photos/ (no permission needed, no reinstall)
 * - /ics?url=<https://calendar.google.com/…> fetches a Google calendar's iCal feed, which the page
 *   can't fetch itself (Google sends no CORS headers). Only that host, only HTTPS.
 * - /img?url=<https://…> fetches a picture from a public collection whose host sends no CORS
 *   headers (Cleveland Museum of Art, NASA's image library), so the page can measure its pixels
 *   before showing it (dashboard/src/picture-check.js). Only those hosts, only HTTPS. Kept for a
 *   week in the app's cache folder, so a picture shown many times is downloaded once.
 * The host only exists inside this WebView; only /ics and /img go over the network.
 */
final class LocalSite {
  static final String ORIGIN = "https://glance.local/";
  private static final String HOST = "glance.local";
  private static final Map<String, String> TYPES = new HashMap<>();
  static {
    TYPES.put("html", "text/html");
    TYPES.put("js", "text/javascript");
    TYPES.put("css", "text/css");
    TYPES.put("json", "application/json");
    TYPES.put("woff2", "font/woff2");
    TYPES.put("woff", "font/woff");
    TYPES.put("svg", "image/svg+xml");
    TYPES.put("png", "image/png");
    TYPES.put("jpg", "image/jpeg");
  }

  private static final Pattern IMAGE_HOSTS =
      Pattern.compile("^https://(openaccess-cdn\\.clevelandart\\.org|images-assets\\.nasa\\.gov)/.*");
  private static final long IMAGE_MAX_BYTES = 8 << 20;
  private static final long IMAGE_KEEP_MS = 7 * 24 * 3600 * 1000L;

  private final Context context;

  LocalSite(Context context) {
    this.context = context;
    pruneImages();
  }

  /** A response for glance.local URLs, or null to let the WebView load anything else itself. */
  WebResourceResponse handle(Uri url) {
    if (!HOST.equals(url.getHost())) return null;
    String path = url.getPath() == null ? "/" : url.getPath();
    try {
      if (path.equals("/ics")) return calendar(url.getQueryParameter("url"));
      if (path.equals("/img")) return image(url.getQueryParameter("url"));
      if (path.equals("/photos/")) return listPhotos();
      if (path.startsWith("/photos/")) return photo(path.substring("/photos/".length()));
      return asset(path.equals("/") ? "/index.html" : path);
    } catch (IOException e) {
      Log.w(MainActivity.TAG, "Not found: " + path);
      return respond(404, "text/plain", new ByteArrayInputStream(new byte[0]));
    }
  }

  private File photoDir() {
    return new File(context.getExternalFilesDir(null), "photos");
  }

  private WebResourceResponse listPhotos() {
    String[] names = photoDir().list((dir, name) -> name.endsWith(".jpg"));
    if (names == null) names = new String[0];
    Arrays.sort(names);
    byte[] json = new JSONArray(Arrays.asList(names)).toString().getBytes(StandardCharsets.UTF_8);
    return respond(200, "application/json", new ByteArrayInputStream(json));
  }

  private WebResourceResponse photo(String name) throws IOException {
    // Only plain file names from the photo folder: no paths, no climbing out of it.
    if (name.isEmpty() || name.contains("/") || name.startsWith(".")) throw new IOException(name);
    return respond(200, "image/jpeg", new FileInputStream(new File(photoDir(), name)));
  }

  // Runs on the WebView's network thread, not the UI thread, so blocking here is fine.
  private WebResourceResponse calendar(String target) throws IOException {
    if (target == null || !target.startsWith("https://calendar.google.com/")) throw new IOException("not a Google calendar");
    HttpURLConnection c = (HttpURLConnection) new URL(target).openConnection();
    c.setConnectTimeout(10000);
    c.setReadTimeout(20000);
    c.setInstanceFollowRedirects(false);
    if (c.getResponseCode() != 200) {
      Log.w(MainActivity.TAG, "Calendar fetch failed: HTTP " + c.getResponseCode());
      return respond(502, "text/plain", new ByteArrayInputStream(new byte[0]));
    }
    return respond(200, "text/calendar", c.getInputStream());
  }

  private File imageDir() {
    return new File(context.getCacheDir(), "img");
  }

  private void pruneImages() {
    File[] files = imageDir().listFiles();
    if (files == null) return;
    long cutoff = System.currentTimeMillis() - IMAGE_KEEP_MS;
    for (File f : files) {
      if (f.lastModified() < cutoff && !f.delete()) Log.w(MainActivity.TAG, "Could not delete " + f);
    }
  }

  // Runs on the WebView's network thread, like calendar().
  private WebResourceResponse image(String target) throws IOException {
    if (target == null || !IMAGE_HOSTS.matcher(target).matches()) throw new IOException("not an allowed picture host");
    File dir = imageDir();
    if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("no cache folder");
    File file = new File(dir, sha1(target) + ".jpg");
    if (!file.exists()) {
      HttpURLConnection c = (HttpURLConnection) new URL(target).openConnection();
      c.setConnectTimeout(10000);
      c.setReadTimeout(30000);
      String type = c.getContentType();
      if (c.getResponseCode() != 200 || type == null || !type.startsWith("image/")
          || !IMAGE_HOSTS.matcher(c.getURL().toString()).matches()) {
        Log.w(MainActivity.TAG, "Picture fetch failed: HTTP " + c.getResponseCode() + " " + type);
        return respond(502, "text/plain", new ByteArrayInputStream(new byte[0]));
      }
      File part = new File(dir, file.getName() + ".part");
      try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(part)) {
        byte[] buf = new byte[16384];
        long total = 0;
        for (int n; (n = in.read(buf)) > 0; ) {
          total += n;
          if (total > IMAGE_MAX_BYTES) throw new IOException("picture too large");
          out.write(buf, 0, n);
        }
      } catch (IOException e) {
        part.delete();
        throw e;
      }
      if (!part.renameTo(file)) throw new IOException("could not save picture");
    }
    return respond(200, "image/jpeg", new FileInputStream(file));
  }

  private static String sha1(String s) throws IOException {
    try {
      byte[] d = MessageDigest.getInstance("SHA-1").digest(s.getBytes(StandardCharsets.UTF_8));
      StringBuilder hex = new StringBuilder();
      for (byte b : d) hex.append(String.format("%02x", b));
      return hex.toString();
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IOException(e);
    }
  }

  private WebResourceResponse asset(String path) throws IOException {
    if (path.contains("..")) throw new IOException(path);
    InputStream in = context.getAssets().open("www" + path);
    String ext = path.substring(path.lastIndexOf('.') + 1);
    String type = TYPES.containsKey(ext) ? TYPES.get(ext) : "application/octet-stream";
    return respond(200, type, in);
  }

  private static WebResourceResponse respond(int status, String type, InputStream body) {
    Map<String, String> headers = new HashMap<>();
    headers.put("Cache-Control", "no-store");
    headers.put("Access-Control-Allow-Origin", "*");
    String charset = type.startsWith("text/") || type.endsWith("json") ? "utf-8" : null;
    String reason = status == 200 ? "OK" : status == 404 ? "Not Found" : "Bad Gateway";
    return new WebResourceResponse(type, charset, status, reason, headers, body);
  }
}
