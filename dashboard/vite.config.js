import { defineConfig, loadEnv } from 'vite';
import { trainsMiddleware } from './server/trains.mjs';

// Live data the frame can't fetch itself, served from the same origin as the page. Secrets come
// from dashboard/.env.local (gitignored) and stay on this server: no VITE_ prefix, so Vite never
// puts them in the bundle.
function liveData(env) {
  const trains = trainsMiddleware(env.WMATA_API_KEY);
  // No return value: Vite treats a returned function as a post-middleware hook.
  const mount = (server) => { server.middlewares.use('/api/trains', trains); };
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
export default defineConfig(({ mode }) => ({
  plugins: [cacheHashedAssets(), liveData(loadEnv(mode, new URL('.', import.meta.url).pathname, ''))],
  // Lets the page tell a real date from the frame's fallback clock (see clockIsSane).
  define: { __BUILT_AT__: String(Date.now()) },
  build: {
    target: 'chrome106',
    cssTarget: 'chrome61',
  },
}));
