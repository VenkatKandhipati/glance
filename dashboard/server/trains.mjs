// /api/trains: live WMATA rail predictions for one station, served by the Mac (later the home
// server). The API key stays here; the frame only ever calls this origin, and WMATA's certificate
// chains to a root the frame's 2020 trust store doesn't have anyway.
//
//   GET /api/trains?station=K04  →  { updated, trains: [{ line, dest, group, min }] }
//
// `group` is WMATA's platform track (at Ballston 1 = towards DC, 2 = towards Vienna/Ashburn).
// `min` is minutes away, 0 for arriving, -1 for boarding.

const CACHE_MS = 20000; // WMATA refreshes predictions about every 20 s
const LINES = new Set(['RD', 'OR', 'SV', 'BL', 'YL', 'GR']);
// WMATA abbreviates some destinations to fit platform signs.
const NAMES = { 'New Crlton': 'New Carrollton', 'Vienna/Fairfax-GMU': 'Vienna', 'Mt Vern Sq': 'Mt Vernon Sq' };

export function minutes(min) {
  if (min === 'BRD') return -1;
  if (min === 'ARR') return 0;
  const n = Number(min);
  return min !== '' && Number.isInteger(n) && n >= 0 ? n : null;
}

// Keeps passenger trains with a usable time, soonest first.
export function normalize(json, now) {
  const trains = [];
  for (const t of (json && json.Trains) || []) {
    const min = minutes(t.Min);
    if (!LINES.has(t.Line) || min === null) continue;
    const name = t.DestinationName || t.Destination || '';
    trains.push({ line: t.Line, dest: NAMES[name] || name.split('/')[0], group: t.Group, min });
  }
  trains.sort((a, b) => a.min - b.min);
  return { updated: now, trains };
}

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
