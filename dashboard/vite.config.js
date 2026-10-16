import { defineConfig, loadEnv } from 'vite';
import { trainsMiddleware } from './server/trains.mjs';
import { icsMiddleware } from './server/ics.mjs';

// Live data the frame can't fetch itself, served from the same origin as the page. Secrets come
// from dashboard/.env.local (gitignored) and stay on this server: no VITE_ prefix, so Vite never
// puts them in the bundle.
function liveData(env) {
  const trains = trainsMiddleware(env.WMATA_API_KEY);
  const ics = icsMiddleware(env);
  // No return value: Vite treats a returned function as a post-middleware hook.
  const mount = (server) => {
    server.middlewares.use('/api/trains', trains);
    server.middlewares.use('/ics', ics);
  };
  return { name: 'glance-live-data', configureServer: mount, configurePreviewServer: mount };
}

// Built files in /assets/ have content hashes in their names, so they can be cached forever.
// That lets the frame keep showing fonts and photos it has already loaded while the Mac sleeps.
// index.html stays `no-cache` (Vite's default), so a new build still appears on the next reload.
function cacheHashedAssets() {
  return {
    name: 'glance-cache-hashed-assets',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/')) {
          // Vite's static server sets its own `no-cache` after this runs, so override it there too.
          const setHeader = res.setHeader.bind(res);
          res.setHeader = (name, value) =>
            setHeader(name, name.toLowerCase() === 'cache-control' ? 'public, max-age=31536000, immutable' : value);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        next();
      });
    },
  };
}

// The frame runs Android WebView 106 on Android 8.1. JS stays within Chromium 106.
// cssTarget is lower on purpose: these WebViews reject 4/8-digit hex colours, and a newer target
// lets the minifier rewrite rgba() into that form (found on-device in wesbos/photo-frame-dashboard).
//
// `--mode frame` builds the copy that goes inside the kiosk app (`npm run frame`): it reads photos
// from the frame's storage and calls WMATA directly, so it needs no Mac. Only that build carries
// the WMATA key and calendar addresses, and it goes to dist-frame/ and the APK, both gitignored,
// never to dist/.
// CAL_PERSONAL=https://… → { personal: 'https://…' }
function calendarUrls(env) {
  const out = {};
  Object.keys(env).forEach((k) => { if (k.startsWith('CAL_')) out[k.slice(4).toLowerCase().replace(/_/g, '-')] = env[k]; });
  return out;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, new URL('.', import.meta.url).pathname, '');
  const frame = mode === 'frame';
  if (frame && !env.WMATA_API_KEY) throw new Error('--mode frame needs WMATA_API_KEY in dashboard/.env.local');
  return {
    plugins: [cacheHashedAssets(), liveData(env)],
    // The frame build leaves photos out of the bundle; they live on the frame's storage.
    resolve: frame ? { alias: [{ find: /^\.\/photo-files\.js$/, replacement: './photo-files-frame.js' }] } : {},
    define: {
      // Lets the page tell a real date from the frame's fallback clock (see clockIsSane).
      __BUILT_AT__: String(Date.now()),
      __FRAME__: String(frame),
      __WMATA_KEY__: JSON.stringify(frame ? env.WMATA_API_KEY : ''),
      // Google calendars' secret addresses (CAL_<ID> in .env.local), also only in the frame build.
      __CALENDARS__: JSON.stringify(frame ? calendarUrls(env) : {}),
    },
    build: {
      target: 'chrome106',
      cssTarget: 'chrome61',
      outDir: frame ? 'dist-frame' : 'dist',
    },
  };
});
