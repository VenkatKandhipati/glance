# Ideas

A parking lot. Anything here is out of scope until it moves into [roadmap.md](roadmap.md).
Add new ideas at the bottom of the right section, with a source when there is one.

## Tiles and data
- **Spotify now playing, not just last played:** show the cover full screen while music plays,
  then return to the dashboard ~2 min after a pause. *(mado)*
- **Tap-to-control music** (play/pause/skip) through the home server; never play sound on the frame itself.
- **Calendar:** merge Google "secret iCal address" feeds on the server; show "what's next today" first. *(kitchen-frame)*
- **News hero rotation:** cycle the hero story every few minutes, thumbnails resized server-side.
- **Football:** live score mode on match day; switch team/league from settings.
- **AQI:** Indian CPCB NAQI bands as an option alongside US AQI; nearest station vs. modelled.
- **Weather:** rain alert ("rain in 40 min"), sunrise/sunset, a second city line ("Mum & Dad"). *(mado)*
- **Chores:** recurring schedule (daily/weekly), who did it, a streak; sync to a shared list (Todoist?).
- **Photo slideshow / ambient mode** after N minutes idle, from a shared album proxied by the server. *(wesbos, kitchen-frame)*
- **Art of the day** as the clock tile background. *(mado)*
- **Commute/traffic** to work at leave-time.
- **Package deliveries** / reminders.

## Home server and agents
- **Agent messages:** a push channel (WebSocket/SSE) so agents and scripts can post a note or an
  urgent alert that stays until tapped. *(mado, kitchen-frame)*
- **MCP endpoint on the home server** (`frame_notify`, `frame_look` screenshot) so Claude can drive
  and check the frame. *(mado)*
- **Settings page on the home server** (cities, team, feeds, chores) instead of editing files.
- **Home Assistant** integration: lights, scenes, who's home.

## Frame and hardware
- **Night mode:** dim red clock after 22:00, blank or dim the backlight at night.
- **PIR motion sensor** (exists on BIUFRAME-class boards as a GPIO) to wake the screen when someone walks by.
- **Burn-in protection:** small periodic shifts of static elements.
- **Custom boot splash** replacing the vendor logo (writes /system, needs backups). *(mado)*
- **Fork the kiosk APK** as `glance` with its own package name and default URL.
- **Light theme by day**, switching at sunrise/sunset. *(kitchen-frame)*
- **Serve from the frame itself** so it works when the Mac is asleep: push the static build to the
  frame and serve it locally (needs an HTTP server on-device, since module scripts don't load from `file://`).

## Offline tiles (no API needed) — considered for the MVP, not picked yet
- **Sun & moon:** sunrise, sunset, day length, moon phase, calculated from coordinates and date.
- **Coming up:** countdown list from the calendar's `dates` list.
- **World clocks:** 2–3 time zones with day/night markers.
- **Kitchen timer:** tap presets (5/10/15/30 min), countdown, flash when done.
- **Scheduled chores:** repeat rules ("every 3 days", "Tuesdays", "the 5th"); show only what's due today.
- **Thought for the day:** quote, word or family note from a list, one per day.
