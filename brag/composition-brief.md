# Hyperframes Composition Brief: Glance

## Objective
Create a short launch-style brag video for Glance.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080, 30 fps
- Duration: 36.2 seconds (the owner asked for a longer cut: more on Time, plus Week)

## Source Material
- Project root: `/Users/venkat/code/glance`
- Primary files read: `README.md`, `dashboard/src/style.css` (tokens, tile styles), `docs/design.md`,
  the built demo page's DOM and CSS (captured from `?demo&idle&trouble` for Home and
  `?demo&screen=pomodoro` for Time), `docs/images/night-clock.png`
- Product name: Glance
- Tagline / strongest claim: "A calm home dashboard for a cheap Android photo frame" … "about
  21 KB of gzipped JavaScript and CSS, built to stay smooth on that hardware and to keep running
  for weeks with nobody touching it."
- Key UI or visual moment to recreate: the Home board (clock tile with the serif time and the
  two-tone greeting, calendar, photo, Metro banner with the red trouble sign), the Time screen's
  ring, the night clock
- Copy that must appear verbatim (all from README.md or the demo UI):
  - "8:42 am" / "Good morning." / "Partly cloudy." (the demo clock tile)
  - "A calm home dashboard for a cheap Android photo frame."
  - "What you're doing at the desk." (README, trimmed from "…, on a screen of its own.")
  - "From 10 p.m., a dim red clock on black." (README, trimmed)
  - "Glance."
  - "About 21 KB of JavaScript and CSS." (README: "about 21 KB of gzipped JavaScript and CSS")
  - "Android 8.1 · 1 GB of RAM · 1280 × 800" (README / AGENTS.md)

## Creative Direction
- Tone preset: polished
- Creative direction: a quiet product film for a cheap photo frame
- Interpretation: four compositions, long holds, soft seams; titles land and stay dead still;
  no bounce, no pulsing loops, no click rings; the product's own type and copy carry it
- Angle: a premium product film for something that cost almost nothing; everything on screen is
  the product's own voice (its typography, its greeting, its README). The final card quietly
  says what it runs on.
- Hook: black; "8:42 am" blurs in huge in Instrument Serif, then "Good morning." (gold) and
  "Partly cloudy." (ink) land under it: the real Home clock tile at frame scale
- Outro / punchline: "Glance." in gold; "About 21 KB of JavaScript and CSS."; a small muted
  "Android 8.1 · 1 GB of RAM · 1280 × 800"
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign (use the project's CSS as-is for the board)
  - Anything personal (real photos, calendar names): demo content only

## Visual Identity
- Background: `#0c0f14`; tiles `#11151c`; calendar tile `#131925`; night `#000000`
- Text: `#f3f0e9` (ink), `#c9ccd3` (ink-2), `#858a95` (mute)
- Accent: `#cbb47c` (gold); night red `#8f2418` (only inside the night screenshot)
- Display font: Instrument Serif, regular and italic (`assets/fonts/instrument-serif*.woff2`,
  needs `@font-face`)
- Body font: Plus Jakarta Sans variable (`assets/fonts/plus-jakarta-sans.woff2`, `@font-face`
  with `font-weight: 200 800`)
- Visual references from the project: `docs/images/home.png`, `docs/images/pomodoro.png`,
  `docs/images/night-clock.png`; the captured DOM in the session scratchpad (`dom/home.html`, photo tile swapped for Porter's Floral Still Life from Commons,
  `dom/time.html`) with the built `style.css`

LOOK: ground `#0c0f14` solid (no full-frame gradients: they band under H.264); hero type
Instrument Serif 400 at 340 px (hook) / 200 px (outro) / 48 px (captions) in `#f3f0e9` with the
gold `#cbb47c` for am/pm, the greeting's first line and the brand line; captions sit in the
title-safe band at the top (y ≈ 108–160); the product pages render at 1:1 (1280 × 800) centred
below the caption (x 320–1600, y 180–980) inside a 1 px `rgba(255,255,255,0.07)` bezel with the
product's 30 px radius; a gold radial glow (15–22% opacity, ~900 px) behind the hook clock only.
BANNED: Inter, drop shadows, blur on the ground, bounce eases, pulsing loops, waveform graphics,
a slide-up-and-fade on every element.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary (compositions):
1. `home` — 9.29s (0.00–9.29) — hook clock "8:42 am" + greeting at frame scale; carry across
   into the real Home board as it assembles on the beat grid; Metro banner lands at 8.74
   (beat-locked) with "Now · 6 · 13" and the red "Alert · Elevator out" sign; caption "A calm
   home dashboard for a cheap Android photo frame."
2. `time` — 3.82s (9.29–13.11) — whip to the Time page; the ring draws (1.2 s, expo.out);
   caption "What you're doing at the desk."
3. `night` — 4.36s (13.11–17.47) — colour flood to black at 13.11 (beat-locked); the night
   clock screenshot fades in; caption in mute grey "From 10 p.m., a dim red clock on black."
4. `outro` — 4.53s (17.47–22.00) — flood back to the ground; "Glance." at 17.47 (beat-locked);
   "About 21 KB of JavaScript and CSS."; spec line; music fades out 20.5–22.0

## Audio
- Audio role: warm, steady bed with sparse professional accents
- Audio arc: fades in under the clock; one soft impact as the banner lands; a bell at the night
  flood; a bell under the name; the bed falls away
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: start 0, `data-fade-in` 0.8, volume 0.30, `data-fade-out` 1.5 ending at 22.0
- Music cue guidance: preset at `assets/music/…vol-12…music-cues.json` (109.96 BPM). Strong cue
  locks: 8.74 (banner), 13.11 (night flood), 17.47 (name). Beat grid for the tile arrivals:
  5.34, 6.00, 6.56, 7.09, 7.64; Metro times at 8.74 and 9.29 (the third with the second).
- Audio-reactive treatment: subtle; the gold glow behind the hook clock breathes with RMS
  (opacity 0.15–0.22) via the media-use extraction script if its Python deps are present;
  otherwise documented and skipped
- Audio-coupled moments:
  - Metro banner landing — `impact/impactSoft_medium_001.ogg` at 8.74, volume 0.6
  - Night flood — `interface/bong_001.ogg` at 13.11, volume 0.5
  - "Glance." — `impact/impactBell_heavy_000.ogg` at 17.47, volume 0.55, rings under the fade
- SFX selection guidance: three cues only; low HF risk; no clicks, no typing, no per-tile pops
- SFX analysis guidance: `<brag skill>/assets/sfx/sfx-analysis.md` (all three picks are in its
  safest list)
- Exact SFX choice: as above; adjust timestamps by ±0.1 s to the implemented motion
- Audio files: already copied into `brag-output/composition/assets/`

## Hyperframes Instructions
Skills read from the pinned CLI's bundle (`hyperframes`, `hyperframes-cli`, `media-use`; the
registry skill isn't bundled, so no registry items). /brag is its own workflow: no storylines,
no SPEC.md, no REVIEW.md; `check` is the gate.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (the Home board
  and the Time page are the project's own DOM and CSS; the night clock is its screenshot).
- Keep all text readable in the final render (reading floors in the plan).
- Keep the video within 15–25 seconds (22).
- Include the planned music and the three SFX.
- Beat locks at 8.74, 13.11, 17.47 (±0.15 s); tile arrivals on the beat grid (±0.10 s).
- Local assets only; local check and render; no publishing.
