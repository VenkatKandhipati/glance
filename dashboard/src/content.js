// Everything on the dashboard that isn't the clock, your photos or a tap.
// Edit this file, then run `npm run frame` with the frame on USB to put it on the frame.

// Extra dates to mark on the month calendar, on top of your Google calendars (empty: those cover it).
//   'MM-DD'       repeats every year (birthdays, anniversaries, fixed holidays)
//   'YYYY-MM-DD'  happens once (trips, festivals whose date moves each year)
export const dates = [
  // { date: '03-14', title: "Someone's birthday" },
];

// Google calendars, read live by their secret iCal address (CAL_<ID> in dashboard/.env.local, never
// in git). Their events mark days on the month and fill "Next up". A `quiet` calendar (a busy group
// one) never marks days or takes "Next up": it gets one line when something starts today or tomorrow.
export const calendars = [
  { id: 'personal' },
  { id: 'friend' },
  { id: 'duckville', name: 'Duckville', quiet: true },
];

// Metro banner along the bottom: live WMATA arrivals for one station (the API key lives in
// dashboard/.env.local), not asked for while the night clock is up. Station codes: WMATA's
// jStations list. `group` is the platform track; name each one by where its trains go.
export const metro = {
  station: 'K04',
  name: 'Ballston',
  lines: ['OR', 'SV'], // for the Transit screen's service alerts
  directions: [
    { group: '1', label: 'To DC' },
    { group: '2', label: 'To Vienna' },
  ],
};

// Weather on the clock tile, from the National Weather Service (US only, no key). Any spot near
// home works; two decimals (about 1 km) is plenty.
export const weather = { name: 'Arlington', lat: 38.88, lon: -77.11 };

// Pictures from public collections, shown between your photos with a credit line: every
// `every`th photo is one of them (0 turns them off). Sources are taken in turn; list one twice to
// see it twice as often, or drop it to stop it:
//   painting            a public-domain painting of the day (Art Institute of Chicago)
//   south-asian-art     Mughal, Rajput, Pahari, Kalighat and Himalayan paintings (Cleveland Museum
//                       of Art, the Met, Art Institute of Chicago)
//   apod                NASA's Astronomy Picture of the Day
//   earth               Earth photographed from the International Space Station (NASA)
//   nature              featured landscape, mountain, waterfall and forest photos (Wikimedia Commons)
//   south-asian-nature  the Himalayas, India, Nepal, Kerala and Sri Lanka (Wikimedia Commons), and
//                       the subcontinent from the Space Station (NASA)
// Half of these are South Asian.
export const featured = {
  every: 4,
  sources: ['south-asian-art', 'nature', 'south-asian-nature', 'painting',
    'south-asian-art', 'earth', 'south-asian-nature', 'apod'],
};

export const settings = {
  weekStartsOn: 0,          // 0 = Sunday (like Google Calendar), 1 = Monday
  photoSeconds: 120,        // how long each photo stays up
  // After `idleSeconds` with no touch: a red clock from `clock` until `off`, then the screen off
  // until `on` (24 h hours). A tap brings the dashboard back.
  night: { clock: 22, off: 0, on: 8, idleSeconds: 120 },
};
