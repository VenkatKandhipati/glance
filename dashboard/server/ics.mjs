// /ics?cal=<id>: a Google calendar's iCal feed, for the copy of the dashboard the Mac serves.
// The secret addresses stay here (CAL_<ID> in dashboard/.env.local); Google sends no CORS headers,
// so the page couldn't fetch them itself anyway. The frame build asks the kiosk app instead
// (kiosk/…/LocalSite.java), which does the same for /ics?url=.

const CACHE_MS = 2 * 60000;

export function icsMiddleware(env) {
  const cache = new Map(); // id → { at, body }

  return async (req, res) => {
    const id = new URL(req.url, 'http://x').searchParams.get('cal') || '';
    const url = /^[a-z0-9-]+$/.test(id) ? env['CAL_' + id.toUpperCase().replace(/-/g, '_')] : '';
    const send = (status, type, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'no-store');
      res.end(body);
    };
    if (!url || !url.startsWith('https://calendar.google.com/')) return send(404, 'text/plain', 'unknown calendar');

    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < CACHE_MS) return send(200, 'text/calendar', hit.body);
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error('Google answered ' + r.status);
      const body = await r.text();
      cache.set(id, { at: Date.now(), body });
      send(200, 'text/calendar', body);
    } catch (e) {
      send(502, 'text/plain', String(e.message || e));
    }
  };
}
