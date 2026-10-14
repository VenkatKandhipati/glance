import { defineConfig } from 'vite';

// The frame runs Android WebView 107 on Android 6. JS stays within Chromium 106.
// cssTarget is lower on purpose: these WebViews reject 4/8-digit hex colours, and a newer target
// lets the minifier rewrite rgba() into that form (found on-device in wesbos/photo-frame-dashboard).
export default defineConfig({
  build: {
    target: 'chrome106',
    cssTarget: 'chrome61',
  },
});
