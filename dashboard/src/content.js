// Everything on the dashboard that isn't the clock, your photos or a tap.
// Edit this file, save, and the frame picks it up on its next reload.

// Dates marked on the month calendar. The next one is shown under it with a countdown.
//   'MM-DD'       repeats every year (birthdays, anniversaries, fixed holidays)
//   'YYYY-MM-DD'  happens once (trips, festivals whose date moves each year)
export const dates = [
  { date: '01-01', title: "New Year's Day" },
  { date: '01-26', title: 'Republic Day' },
  { date: '08-15', title: 'Independence Day' },
  { date: '10-02', title: 'Gandhi Jayanti' },
  { date: '12-25', title: 'Christmas' },
  { date: '2026-10-20', title: 'Dussehra' },
  { date: '2026-11-08', title: 'Diwali' },
  { date: '10-26', title: 'Birthday (example — edit me)' },
];

// Google calendars, read live by their secret iCal address (CAL_<ID> in dashboard/.env.local, never
// in git). Their events mark days on the month and fill "Next up". A `quiet` calendar (a busy group
// one) never marks days or takes "Next up": it gets one line when something starts today or tomorrow.
export const calendars = [
  { id: 'personal' },
  { id: 'friend' },
  { id: 'duckville', name: 'Duckville', quiet: true },
];

// Metro banner along the bottom: live WMATA arrivals for one station, through the Mac's
// /api/trains (the API key lives in dashboard/.env.local). Station codes: WMATA's jStations list.
// `group` is the platform track; name each one by where its trains go.
export const metro = {
  station: 'K04',
  name: 'Ballston',
  directions: [
    { group: '1', label: 'To DC' },
    { group: '2', label: 'To Vienna' },
  ],
};

export const settings = {
  weekStartsOn: 1,          // 0 = Sunday, 1 = Monday
  photoSeconds: 120,        // how long each photo stays up
  night: { from: 22, to: 6, idleSeconds: 120 }, // red clock window (24 h) and idle time before it shows
};
