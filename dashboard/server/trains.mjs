// /api/trains: live WMATA rail predictions for one station, served by the Mac's dev and preview
// servers, with the API key kept here. The frame build (`vite build --mode frame`) calls WMATA
// itself instead; see docs/frame.md.
//
//   GET /api/trains?station=K04  →  { updated, trains: [{ line, dest, group, min }] }
//
// The shape is described in src/tiles/trains-data.js.
import { normalize } from '../src/tiles/trains-data.js';

const CACHE_MS = 20000; // WMATA refreshes predictions about every 20 s

export function trainsMiddleware(apiKey) {
  const cache = new Map(); // station → { at, body }

  return async (req, res) => {
    const station = new URL(req.url, 'http://x').searchParams.get('station') || '';
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(body));
    };
    if (!/^[A-Z]\d\d$/.test(station)) return send(400, { error: 'station must look like K04' });
    if (!apiKey) return send(503, { error: 'WMATA_API_KEY is not set in dashboard/.env.local' });

    const hit = cache.get(station);
    if (hit && Date.now() - hit.at < CACHE_MS) return send(200, hit.body);
    try {
      const r = await fetch('https://api.wmata.com/StationPrediction.svc/json/GetPrediction/' + station, {
        headers: { api_key: apiKey },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error('WMATA answered ' + r.status);
      const body = normalize(await r.json(), Date.now());
      cache.set(station, { at: Date.now(), body });
      send(200, body);
    } catch (e) {
      send(502, { error: String(e.message || e) });
    }
  };
}
