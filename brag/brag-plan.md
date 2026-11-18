# Brag Plan: Glance

## What is this app?
A calm home dashboard for a cheap Android photo frame: the time, the weather, your calendar,
your photos and the next Metro trains, readable from across the room. One static web page, about
21 KB of gzipped JavaScript and CSS, built to stay smooth on a 1 GB, Android 8.1 frame and to keep
running for weeks with nobody touching it.

## The 9-question rubric (Step 1)
1. **What is the app?** A dashboard web page that runs inside a kiosk app on a 10.1" Android photo frame (1280 × 800). Home shows clock, weather, month calendar, photos and WMATA Metro times; taps open Week, Transit, Weather, Time (Pomodoro and desk time tracking) and Telugu screens; at night it becomes a dim red clock.
2. **Funniest or most impressive claim?** "Glance runs on a 10.1" photo frame bought for its screen: a budget quad-core chip, 1 GB of RAM and Android 8.1 … about 21 KB of gzipped JavaScript and CSS … built to keep running for weeks with nobody touching it." A serious, elegant product on a $60 frame.
3. **Visual hook?** The big Instrument Serif clock with the italic gold am/pm, and the two-tone greeting under it ("Good morning." gold, "Partly cloudy." ink) on the navy ground.
4. **What to show from the UI?** The Home screen itself, recreated from the project's own built CSS and demo DOM (no personal data: demo events, a public-domain painting in the photo tile (Porter, Floral Still Life, 1881)). Then the Time screen's ring, and the night clock (the README's own screenshot).
5. **Shortest satisfying video?** About 22 s; the owner then asked for a longer cut (41.6 s) with more on the Time screen and the Week and Telugu screens.
6. **Tone?** Preset `polished`; direction: *a quiet product film for a cheap photo frame*. The product is earnest and exact; restraint is the point.
7. **Audio?** A clean, steady bed (vol-12) at 0.3, three soft SFX, subtle audio-reactive glow behind the hook clock.
8. **Share caption?** "Introducing Glance: a calm home dashboard for a cheap Android photo frame. The time, the weather, your calendar, your photos and the next Metro trains, readable from across the room. About 21 KB of JavaScript and CSS, on 1 GB of RAM."
9. **User flow worth showing?** The frame on the wall, glanced at: Home's clock and greeting → the Metro banner's times (with the new trouble sign) → the Time screen while tracking → the red night clock. The product is *read*, not operated, so the flow is the day: morning, desk, night.

## The angle
A premium product film for something that cost almost nothing. Everything is the product's own
voice: its typography, its greeting, its README lines. The joke, if there is one, is quiet: the
final card says what it runs on.

## Hook (first 2-3 seconds)
Black. The clock's time "8:42" blurs in, huge, in Instrument Serif, with the italic gold "am",
then the two-tone greeting lands under it: "Good morning." in gold, "Partly cloudy." in ink. It is
the actual Home clock tile, at frame scale.

## Key moments (the middle)
- The big clock shrinks and settles into its tile as the whole Home screen assembles around it:
  the date pill, the weather pill, the month calendar, the photo, then the Metro banner landing on
  the strongest beat with "Now · 6 · 13" and the red "Delay · Elevator out" sign popping in.
- The Time screen: the 240 px ring drawing itself around "21:04 · since 8:21 am", the Projects
  chip lit, the stats tiles to the right.
- Night: the ground floods to black and the dim red clock appears (a real screenshot of the demo
  at 10:42 pm, captured from the built page; the README's own is at 8:42 am), alone.

## Outro / punchline
"Glance." in gold, then in ink: "About 21 KB of JavaScript and CSS." And a small muted line of
what it runs on: "Android 8.1 · 1 GB of RAM · 1280 × 800".

## User flow worth showing
Morning (Home: clock, greeting, trains) → the desk (Time screen tracking) → night (red clock).
Glance is read from across the room, so the flow is the day's three glances rather than clicks.

## Tone
- Preset: polished
- Creative direction: a quiet product film for a cheap photo frame
- Interpretation: few scenes, long holds, soft seams (blur swap, carry across, colour flood), no
  bounce, titles land and stay dead still; the product's own type and copy carry everything.

## Format: landscape — 1920x1080
## Duration: 36.2 seconds (the owner asked for a longer cut with more on Time plus Week; Telugu was added, then dropped as too long; 2026-11-18)

## Visual identity (from the project)
- Background: `#0c0f14` (`--ground`); tiles `#11151c` (`--tile`), calendar tile `#131925`
- Accent: `#cbb47c` (`--gold`); night red `#8f2418` (`--night`)
- Text: `#f3f0e9` (`--ink`), `#c9ccd3` (`--ink-2`), `#858a95` (`--mute`)
- Display font: Instrument Serif (regular and italic; files in `composition/assets/fonts/`)
- Body font: Plus Jakarta Sans (variable; file in `composition/assets/fonts/`)
- Strongest visual element: the serif clock with italic gold am/pm and the two-tone greeting;
  the Home board's 30 px-radius tiles on navy; the Metro banner's line-coloured dots and bold
  tabular numbers.
- Source material: `dashboard/src/style.css` (tokens), the built demo page's DOM and CSS captured
  with `?demo&idle&trouble` and `?demo&screen=pomodoro` (made-up events, NPS public-domain photo
  `tidal-basin.jpg`), `docs/images/night-clock.png`, `README.md` copy. Nothing personal: no real
  photos, calendar names or addresses.

## Share copy (draft)
Introducing Glance: a calm home dashboard for a cheap Android photo frame. The time, the weather,
your calendar, your photos and the next Metro trains, readable from across the room. About 21 KB
of JavaScript and CSS, on 1 GB of RAM.

## Audio direction
- Role: warm, steady bed with sparse professional accents
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (steady and clean; the polished pick)
- Music treatment: starts at 0, fade in 0.8 s, volume 0.30, fade out over the last 1.5 s under
  the outro card
- Music cue guidance: preset read (`assets/music/cues/…vol-12…music-cues.md`, 109.96 BPM, beat
  ≈ 0.546 s). Strong cues to target: **8.74 s** (Home fully assembled, Metro banner lands),
  **13.11 s** (colour flood to night), **17.47 s** (outro "Glance." lands). Beat-grid windows:
  Home's tiles arrive on 5.34 · 6.00 · 6.56 · 7.09 · 7.64 (non-text accents, fine on every beat);
  the three Metro times on 8.74 · 9.29 · 9.83 (numbers, each held to the end of the scene).
- Audio-reactive treatment: subtle; a gold radial glow behind the hook clock (15–25% opacity)
  breathes with music RMS. No waveform or equaliser visuals, nothing on text scale.
- SFX posture: sparse, polished: three cues, all low high-frequency risk, 0.5–0.65 volume
- Audio-coupled moments: the Metro banner landing (soft impact on the strong cue), the night
  flood (one soft bell), the outro name (one soft bell, let it ring under the fade)
- Restraint rule: no per-tile pops, no clicks, no typing sounds; nothing above the bed except the
  three cues; the bed never above 0.3

## Storyboard

### Scene 1 — Hook (the clock) — 4.4s (0.00–4.39)
Black ground (`#0c0f14`). At 0.56 s "8:42" with italic gold "am" blurs in as one line (8 px → 0,
0.2 s), Instrument Serif at about 340 px, centred, then dead still. At 1.64 s "Good morning." in
gold, at 2.19 s "Partly cloudy." in ink, each word from light grey to ink 0.08 s apart, no
position change. Behind the clock a faint gold radial glow breathes with the music. Holds to 4.39.
Sequential/interaction: yes — the time, then the two greeting lines, one after the other
Audio intent: the bed fades in under the clock; calm
Audio-coupled idea: the glow's opacity follows RMS; no SFX
Music: steady, clean bed from 0
Transition mood: soft (carry across) → Scene 2

### Scene 2 — Reveal (Home assembles) — 4.9s (4.39–9.29)
A caption lands at the top (Instrument Serif, ~48 px, ink): "A calm home dashboard for a cheap
Android photo frame." (README, verbatim). The big clock shrinks (scale 1 → 0.39, blur peaking
6 px mid-move, 0.65 s) and lands inside the clock tile of the real Home page (1280 × 800 at 1:1,
centred below the caption, inside a thin bezel) as the page builds around it: the clock tile's
pills, then the calendar tile, the photo tile, then the Metro banner, each arriving 40–80 ms
apart on the beat grid (5.34, 6.00, 6.56, 7.09, 7.64) with a blur-in and no bounce. The Metro
banner's times "Now · 6 · 13" land on 8.74 (beat-locked, strong cue), 9.29, 9.83 is skipped (the
scene ends at 9.29; the third time lands with the second). The red "Delay · Elevator out" sign
pops in with the banner. Everything is the project's own markup and CSS with demo content.
Sequential/interaction: yes — tiles arrive one by one; Metro times land in sequence
Audio intent: the assembly feels inevitable; one soft weight when the banner lands
Audio-coupled idea: beat-grid tile arrivals; one soft impact (`impactSoft_medium_001`) on 8.74
Music: bed continues
Transition mood: clean (whip) → Scene 3

### Scene 3 — Time (at the desk) — 3.8s (9.29–13.11)
The Home page whips out left (0.2 s smear) and the Time page whips in from the right, landing
blurred and sharpening in 0.13 s. Caption at the top: "What you're doing at the desk." (README,
trimmed). On the page, the 240 px ring draws from empty to its position over 1.2 s (`expo.out`)
around "21:04 / since 8:21 am", the Projects chip lit in lime, the stats tiles to the right.
Then dead still. Caption holds ≥ 2.3 s.
Sequential/interaction: yes — the ring draws itself
Audio intent: quiet; the bed carries it
Audio-coupled idea: none (restraint)
Music: bed continues
Transition mood: dramatic (colour flood) → Scene 4

### Scene 4 — Night — 4.4s (13.11–17.47)
Colour flood: at 13.11 (strong cue) the whole ground goes to `#000000` in 0.4 s (`power2.inOut`)
while the Time page fades and blurs out. At 13.5 the night clock appears: the README's own
screenshot `night-clock.png` (the dim red clock on black), fading in over 0.5 s at frame scale,
then still. Caption, muted grey `#858a95` on black, at the top: "From 10 p.m., a dim red clock on
black." (README). Holds to 17.47.
Sequential/interaction: none
Audio intent: a breath; the one soft bell
Audio-coupled idea: `interface/bong_001` at the flood, quiet (0.5)
Music: bed continues, slightly lower feel by the scene's stillness
Transition mood: soft (colour flood back) → Scene 5

### Scene 5 — Outro — 4.5s (17.47–22.00)
The ground floods back to `#0c0f14` in 0.4 s. At 17.47 (strong cue, beat-locked) "Glance." in
gold Instrument Serif (~200 px) blurs in, then at 18.56 in ink: "About 21 KB of JavaScript and
CSS." and at 19.1 a small muted sans line: "Android 8.1 · 1 GB of RAM · 1280 × 800". All dead
still to the end; the last line holds > 2.5 s. Music fades out over 20.5–22.0.
Sequential/interaction: yes — name, claim, spec line, one after another
Audio intent: the name lands with weight, then the bed falls away
Audio-coupled idea: `impactBell_heavy_000` at 17.47, 0.55, left to ring under the fade
Music: fades out
Transition mood: end

**Music mood for this video:** polished, steady, clean
**Audio summary:** a quiet bed fades in under the clock, carries the reveal with one soft impact as
the Metro banner lands, breathes through the desk and the night with a single bell, and falls away
under the name.

## Revision (2026-11-18): the longer cut

The owner's brief: say why the time tracking exists ("I want to know exactly how I spend my
time at my desk, and this lets me juggle different projects at once by dedicating even 45
minutes to each a day"), and add the Week and Telugu screens. Scenes now:

1. Home — 0.00–9.29 — as before (the photo tile shows Porter's Floral Still Life)
2. Time — 9.29–22.37 — the tracker and ring ("What you're doing at the desk."), then at 13.11
   "Exactly how the time at the desk was spent.", then at 17.47 (strong cue, soft impact) the last
   7 days crossfade to the product's grid view, a row per project with each day's minutes and
   "Next: Chores, not since Tuesday", with "Several projects at once: 45 minutes each, and it
   says which is next."
3. Week — 22.37–27.30 — whip to the Week page, the seven day columns arriving 60 ms apart;
   "The next seven days, every calendar." (README)
4. Night — 27.30–31.67 — as before (the flood on the strong cue at 27.3)
5. Outro — 31.67–36.16 — the name on a beat, the claim on the strong cue at 32.74; music fades
   out over the last 1.5 s

(A Telugu scene, 27.3–32.74, was tried and dropped at the owner's request as too long.)

Strong cues used: 8.74, 13.11, 17.47, 22.37, 27.30, 32.74. Every caption holds at
least its reading floor (the longest, 12 words, holds 4.5 s).
