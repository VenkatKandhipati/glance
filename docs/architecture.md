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

TODO: document the shapes of `dates`, `chores` and `settings` in `dashboard/src/content.js`, and
what's stored on the frame (`localStorage` keys `glance-chores` and `glance-diag`).

## Key flows

TODO: the minute-aligned tick, the midnight calendar redraw, photo rotation and preload (including
the offline fallback), the chores daily reset, and the night clock's idle trigger.
