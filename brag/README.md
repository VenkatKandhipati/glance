# The brag video

A 36-second launch video for Glance, made with [Hyperframes](https://hyperframes.heygen.com) on
2026-11-18: `brag.mp4` (1920 × 1080, 30 fps), `brag.jpg` (the poster, baked in as frame 0 so
thumbnails show the dashboard) and `share-copy.txt`. The creative plan is `brag-plan.md`; the
hand-off to Hyperframes is `composition-brief.md`.

Everything on screen is the product's own: `composition/assets/glance.css` is
`dashboard/src/style.css` with the page sizing and transitions removed, and the Home, Time and
Week pages inside `composition/compositions/*.html` are the built demo page's markup
(`?demo`, so made-up events and nothing personal) captured from headless Chrome. The night clock
is a screenshot of the demo at 10:42 pm. The photo tile shows a public-domain painting.

## Change it

```sh
cd brag/composition
npx hyperframes@0.9.68 preview      # the Studio at http://localhost:3002/#project/composition
npx hyperframes@0.9.68 check        # the gate: lint, runtime, layout, contrast; fix every error
npx hyperframes@0.9.68 render --quality looks --output ../brag.mp4
```

Then pick the poster frame and bake it as frame 0 (from `brag/`):

```sh
ffmpeg -y -ss 8.95 -i brag.mp4 -frames:v 1 -q:v 2 brag.jpg
ffmpeg -y -i brag.mp4 -i brag.jpg -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]" \
  -map "[v]" -map "0:a?" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a copy \
  -movflags +faststart brag.poster.mp4 && mv brag.poster.mp4 brag.mp4
```

Scenes are one file each under `compositions/`, timed from `index.html`; the music's beat grid
and strong cues are in `assets/music/*.music-cues.json` (109.96 BPM), and `audio-data.json` is
the per-frame loudness the hook's glow follows. To refresh a page's markup after the dashboard
changes, capture `document.body.innerHTML` of the built demo page at 1280 × 800 and paste the
`<main>` element back into its scene; `glance.css` is regenerated from `dashboard/src/style.css`
by dropping the `@import`s, the `html, body` block and every `transition:`.

## Credits

- Music: "Happy Beats / Business Moves Vol. 12" by Sascha Ende, [ende.app](https://ende.app/en),
  [CC BY 4.0](https://ende.app/en/standard-license). Not covered by the repo's MIT licence.
- Sound effects: [Kenney](https://kenney.nl/), CC0.
- Painting: Charles Ethan Porter, *Floral Still Life*, 1881, Detroit Institute of Arts, public
  domain, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Charles_Ethan_Porter_-_Floral_Still_Life_-_2018.48_-_Detroit_Institute_of_Arts.jpg).
- Fonts: Instrument Serif, Plus Jakarta Sans and Noto Sans Telugu (OFL), the dashboard's own.
