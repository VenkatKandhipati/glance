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
//   painting            paintings (Art Institute of Chicago, darker ones; Cleveland Museum of Art)
//   south-asian-art     Mughal, Rajput, Pahari and Himalayan paintings (Cleveland, Art Institute)
//   apod                NASA's Astronomy Picture of the Day
//   earth               Earth photographed from the International Space Station (NASA)
//   nature              featured photos of landscapes, mountains, lakes, fog, forests, waterfalls,
//                       coasts, clouds, caves and the night sky (Wikimedia Commons)
//   south-asian-nature  the Himalayas, India, Nepal, Kerala and Sri Lanka (Wikimedia Commons), and
//                       the subcontinent from the Space Station (NASA)
// The frame measures each one first and shows only sharp, well-sized pictures in `style`:
//   'dark' (mostly dark, little white, to sit with the navy dashboard), 'blue' (dark and mostly
//   blue or teal) or 'any'.
export const featured = {
  every: 4,
  style: 'dark',
  sources: ['painting', 'nature', 'south-asian-nature', 'painting', 'nature', 'apod',
    'south-asian-art', 'earth'],
};

// Time screen: what you're doing at the desk. Tap a category to track it (another switches, Stop
// ends it), or start a Pomodoro: `work` minutes of deep work, then a `break`. `goalHours` is a
// day's goal in hours of focus: focus time tracked, and an hour for each full Pomodoro (its break
// included); a streak day has at least `streakHours` of focus. Tracking one of
// `remind.categories` chimes and flashes every `remind.minutes` as a nudge to stop. A tracker
// with no touch on the frame for `autoStopHours` stops by itself at the last touch. `focus` categories count as focus in the insights. An `id` is what the log
// keeps, so rename a `name` freely but keep its id; colours follow this order.
export const time = {
  work: 45,
  break: 15,
  goalHours: 4,
  streakHours: 1,
  remind: { categories: ['scrolling', 'break'], minutes: 10 },
  autoStopHours: 2,
  categories: [
    { id: 'interview-prep', name: 'Recruiting', focus: true },
    { id: 'geico', name: 'GEICO', focus: true },
    { id: 'learning', name: 'Masters', focus: true },
    { id: 'projects', name: 'Projects', focus: true },
    { id: 'chores', name: 'Chores' },
    { id: 'bathroom', name: 'Bathroom' },
    { id: 'scrolling', name: 'Doom scrolling' },
    { id: 'break', name: 'Break' },
    { id: 'other', name: 'Other' },
  ],
};

// Telugu screen: the letters to look up at while writing them. It stays up for `stayMinutes` after
// the last touch on it (then Home and night as usual), and moves up to `shift.px` in each direction
// once every `shift.minutes` against burn-in; px 0 turns that off.
export const telugu = {
  stayMinutes: 45,
  shift: { px: 4, minutes: 30 },
};

export const settings = {
  weekStartsOn: 0,          // 0 = Sunday (like Google Calendar), 1 = Monday
  photoSeconds: 120,        // how long each photo stays up
  // After `idleSeconds` with no touch: a red clock from `clock` until `off`, then the screen off
  // until `on` (24 h hours). A tap brings the dashboard back.
  night: { clock: 22, off: 0, on: 8, idleSeconds: 120 },
  // Burn-in: Home moves up to `px` in each direction, one step every `minutes`. px 0 turns it off.
  shift: { px: 6, minutes: 10 },
};
