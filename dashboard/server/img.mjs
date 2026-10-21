// /img?url=<https://…>: a picture from a public collection whose host sends no CORS headers, for
// the copy of the dashboard the Mac serves, so the page can measure its pixels before showing it
// (src/picture-check.js). The frame build asks the kiosk app instead (kiosk/…/LocalSite.java).
// Only the hosts below, only HTTPS; kept in memory for an hour.

const HOSTS = /^https:\/\/(openaccess-cdn\.clevelandart\.org|images-assets\.nasa\.gov)\//;
const MAX_BYTES = 8 << 20;
const CACHE_MS = 3600e3;

export function imgMiddleware() {
  const cache = new Map(); // url → { at, type, body }

  return async (req, res) => {
    const url = new URL(req.url, 'http://x').searchParams.get('url') || '';
    const send = (status, type, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', type);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(body);
    };
    if (!HOSTS.test(url)) return send(404, 'text/plain', 'not an allowed picture host');
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < CACHE_MS) return send(200, hit.type, hit.body);
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.startsWith('image/') || !HOSTS.test(r.url)) throw new Error('picture fetch failed: ' + r.status + ' ' + type);
      const body = Buffer.from(await r.arrayBuffer());
      if (body.length > MAX_BYTES) throw new Error('picture too large');
      if (cache.size > 200) cache.clear();
      cache.set(url, { at: Date.now(), type, body });
      send(200, type, body);
    } catch (e) {
      send(502, 'text/plain', String(e.message || e));
    }
  };
}
