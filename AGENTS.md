# Working on Glance

Notes for AI agents and contributors. Read [docs/frame.md](docs/frame.md) before changing
`dashboard/`.

## Where things are

- Architecture: [docs/architecture.md](docs/architecture.md) for the data model and key flows; it
  links to the hardware, network and layout notes in frame.md and design.md. Read before
  structural changes.
- Decisions: [docs/decisions.md](docs/decisions.md). Append one dated line for any non-obvious
  choice.
- Runbook: [docs/connect-the-frame.md](docs/connect-the-frame.md) (setup, troubleshooting) and
  [docs/frame.md#serving-the-page-from-the-mac](docs/frame.md#serving-the-page-from-the-mac)
  (run it on the frame).
- Direction: [docs/roadmap.md](docs/roadmap.md). Work itself lives in GitHub Issues.
- Cross-project context: ../hq/PORTFOLIO.md
- About me and past lessons: read ../hq/wiki/index.md, then ../hq/wiki/projects/glance.md
  (TODO: not written yet).

## Target

- Akimart ZN-DP1002 with an **RK3126** board: Android 6.0.1, WebView 107, Mali-400, 1 GB RAM,
  1280 × 800 at DPR 1. Another board ships under the same name (RK3326, Android 8.1); its guides
  don't apply here.
- The page is a fixed 1280 × 800 layout. Check every change at exactly that size.

## Rules

- Keep `build.target: 'chrome106'` and `cssTarget: 'chrome61'` in `dashboard/vite.config.js`.
- No `oklch()`, `color-mix()`, CSS nesting, `:has()`, 4/8-digit hex, `dvh`, `backdrop-filter`,
  blurs or shadows. `npm run build` fails on most of these; don't work around the check.
- No framework, no runtime dependencies beyond fonts. A new dependency has to earn its weight on
  a Cortex-A7.
- The frame never calls third-party services directly; everything comes from the page's own
  origin (see "Network" in docs/frame.md).
- Animate only `opacity` and `transform`. Update only what changed.
- No two-finger hold gestures (the kiosk uses one), no `alert()`, no external links.
- Wrap every `localStorage` access in `try`/`catch`.

## Privacy

- Never commit photos: `dashboard/photos/` and `dashboard/.photos-resized/` are gitignored.
- Keep serial numbers, MAC and IP addresses, Wi-Fi details and firmware dumps out of the repo.

## The frame itself

- Reads over ADB are fine. Ask the owner before anything that writes to the frame (installing
  apps, changing settings, `/system`, the Home app) and record each change with its undo in
  docs/frame.md.

## Checks

```sh
cd dashboard && npm test && npm run build
```

## How to work

1. Work from a GitHub Issue. Run `gh issue view <n>` first.
2. Branch: `<n>-short-slug`.
3. Plan in the conversation before editing. For size L, post the plan as an issue comment.
4. The checks above must pass before you open a PR.
5. PR body includes "Closes #<n>" and the docs checkbox answered.
6. If you change the shape of `content.js`, what's stored on the frame, how the page is served,
   or the frame itself, update docs/ in the same PR.
7. If you think of a new idea, file it as an Issue labeled inbox, add it to the board
   (`gh project item-add 1 --owner VenkatKandhipati --url <issue-url>`), and keep going on the
   current task. If I approve it in this session, relabel it ready and work it on its own branch
   and PR.

## Never

- Commit `.env` or any secret value.
- Push to main or merge your own PR.
- Start work on an issue that isn't labeled ready.
