# Decisions

One dated line per non-obvious choice and why, newest last. Link to the doc that explains it in
full. Entries marked *(backfilled)* were recorded after the fact, dated from git history.

- 2026-10-14 — Build for Chrome 106 (`build.target`) and CSS for Chrome 61 (`cssTarget`): the frame's WebView 107 rejects newer syntax, and the lower CSS target stops the minifier producing 4/8-digit hex. See [frame.md](frame.md#what-the-browser-cant-do). *(backfilled)*
- 2026-10-14 — No framework, no runtime dependencies beyond fonts: every kilobyte is parsed on a Cortex-A7 with 1 GB RAM. See [frame.md](frame.md#performance-rules). *(backfilled)*
- 2026-10-14 — The frame talks to one origin we control and never calls third-party APIs: Android 6's trust store fails modern HTTPS chains, and keys must stay off the device. See [frame.md](frame.md#network). *(backfilled)*
- 2026-10-14 — Photos never go into git; they're resized to ≤ 1280 px on the Mac and at most two are decoded at once. See [frame.md](frame.md#performance-rules). *(backfilled)*
- 2026-10-14 — Reuse the kiosk app from wesbos/photo-frame-dashboard (with permission) instead of writing one. See [CREDITS.md](../CREDITS.md). *(backfilled)*
- 2026-10-14 — Serve hashed assets as immutable and make the 3 a.m. reload wait for the server, so a loaded dashboard keeps working while the Mac sleeps. See [frame.md](frame.md#serving-the-page-from-the-mac). *(backfilled)*
- 2026-10-14 — Bundle the dashboard into a forked kiosk app (Phase 1.5) instead of waiting for the home server, to remove the Mac from boot. See [roadmap.md](roadmap.md#phase-15--no-mac-needed). *(backfilled)*
