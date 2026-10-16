// WMATA rail predictions → { updated, trains: [{ line, dest, group, min }] }, soonest first.
// Shared by the Mac's /api/trains and the frame build, which calls WMATA directly.
// `group` is WMATA's platform track (at Ballston 1 = towards DC, 2 = towards Vienna/Ashburn).
// `min` is minutes away, 0 for arriving, -1 for boarding.

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
