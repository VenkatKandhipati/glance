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

// Chores shown in the bottom strip. Ticks are saved on the frame and cleared every morning.
// `id` must stay the same when you rename a chore, or its tick is lost for the day.
export const chores = [
  { id: 'recycling', title: 'Recycling out' },
  { id: 'plants', title: 'Water the plants' },
  { id: 'power-bill', title: 'Pay power bill' },
  { id: 'coffee', title: 'Order coffee beans' },
  { id: 'laundry', title: 'Laundry' },
];

export const settings = {
  weekStartsOn: 1,          // 0 = Sunday, 1 = Monday
  photoSeconds: 120,        // how long each photo stays up
  night: { from: 22, to: 6, idleSeconds: 120 }, // red clock window (24 h) and idle time before it shows
};
