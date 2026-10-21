# Architecture

Components, data model and key flows. Most of it already lives elsewhere; this page links to it
and holds only what isn't written down yet.

- **Components and how the page reaches the frame:** [README](../README.md#how-it-works) and
  [Project layout](../README.md#project-layout).
- **Hardware, browser limits, network:** [frame.md](frame.md).
- **Layout and tiles on screen:** [design.md](design.md).
- **Running unattended (boot, clock after a power cut, daily reload):**
  [frame.md](frame.md#running-unattended).

## Data model

Settings live in `dashboard/src/content.js`, each export commented in place: `dates`,
`calendars`, `metro`, `weather`, `featured` (public pictures), `pomodoro` and `settings` (week
start, photo time, night hours). Secrets (the WMATA key, `CAL_<ID>` calendar addresses) live in
`dashboard/.env.local` only.

Stored on the frame:

| Where | What |
| --- | --- |
| `localStorage` `glance-pictures` | Verdicts on public pictures already measured (up to 3,000), so each is measured once |
| `localStorage` `glance-diag` | `?diag` overlay on or off |
| `localStorage` `glance-weather` | The last forecast that arrived and when, shown after a reload during an outage (up to 7 days) |
| `localStorage` `glance-calendars` | Each calendar's last occurrences and when they arrived (up to 7 days) |
| `localStorage` `glance-pomodoro` | The Pomodoro timer and session log (format in `src/pomodoro-data.js`) |
| `/sdcard/Android/data/app.glance.kiosk/files/pomodoro.json` | The same, as a backup written by the kiosk (`GlanceFiles`) |
| `/sdcard/Android/data/app.glance.kiosk/files/photos/` | Your photos, resized, pushed by `npm run frame` |
| The app's cache, `img/` | Public pictures fetched through the kiosk's `/img`, kept a week |

## Key flows

TODO: the minute-aligned tick, the midnight calendar redraw, photo rotation and preload (including
the offline fallback and public pictures every 4th turn), the night clock's idle trigger and
screen-off, and the Pomodoro timer's resume after a power cut.
