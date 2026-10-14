# Design

Calm, dark, glanceable: something you read from across the room in two seconds. Every tile
answers one question, and every pixel has to be cheap for an old phone GPU to paint.

## Target

The long-term design is a seven-tile board: clock, top news, weather, last played, next match,
air quality and chores. The MVP keeps its visual language and swaps the tiles that need live data
for ones that don't (calendar, photos). The rest return once the home server exists
([roadmap](roadmap.md)).

![The MVP dashboard](images/dashboard.png)

## Layout

A fixed 1280 × 800 grid (the frame's exact resolution at DPR 1), 20 px outer margin, 16 px gaps.

```
┌────────────────────────┬─────────────────────────────────┐
│ Clock      509 × 330   │                                 │
├────────────────────────┤ Photo            715 × 633      │
│ Calendar   509 × 287   │                                 │
├────────────────────────┴─────────────────────────────────┤
│ Chores                                       1240 × 111  │
└──────────────────────────────────────────────────────────┘
```

## Tokens

All in [`dashboard/src/style.css`](../dashboard/src/style.css) as custom properties.

| Token | Value | Use |
| --- | --- | --- |
| `--ground` | `#0c0f14` | Page background |
| `--tile` | `#11151c` | Default tile surface |
| `--tile-blue` | `#131925` | Calendar tile (each tile gets its own faint tint) |
| `--tile-line` | `rgba(255,255,255,.07)` | 1 px tile border |
| `--chip` / `--chip-line` | `rgba(255,255,255,.04)` / `.09` | Pills: date, chores |
| `--ink` / `--ink-2` / `--mute` | `#f3f0e9` / `#c9ccd3` / `#858a95` | Text, from primary to quiet |
| `--gold` / `--gold-fill` | `#cbb47c` / `#d4b54e` | Accent text, today, ticks |
| `--violet` | `#b4a6ff` | Icon chips |
| `--night` | `#8f2418` | Night clock |
| `--r` / `--r-chip` | `30px` / `14px` | Tile and pill radii |

## Type

- **Instrument Serif** for display: the time, the greeting, the month. Italic for small flourishes
  (am/pm, the gold comma in "October,").
- **Plus Jakarta Sans** (variable) for everything else: labels, pills, chores.
- Both are bundled as woff2 through Fontsource. The frame never loads fonts from the web.

## Patterns

- **Two-tone headings:** a gold first line and a white second ("Good night. / Here's your day.",
  "Chores, / 2 left today").
- **Pills** for metadata and actions, with an optional 28 px tinted icon chip at the start.
- **Done state:** filled gold circle with a dark tick, muted strikethrough label.
- **No** shadows, blur, gradients that animate, or motion other than photo crossfades and the
  night clock's drift.
