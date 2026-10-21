# dashboard

The Glance web app: plain ES modules built with Vite for the frame's WebView 106.
Project overview in the [root README](../README.md); constraints in [docs/frame.md](../docs/frame.md).

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 5173, also reachable on the LAN |
| `npm run build` | Production build into `dist/`, then the frame-compatibility check |
| `npm run preview` | Serves `dist/` on port 4173; this is what the frame loads day to day |
| `npm test` | Unit tests (`node --test`) |
| `npm run photos` | Resizes `photos/*` into `.photos-resized/` for the photo tile |

- `src/content.js` holds everything you edit: marked dates, the Metro station, timings.
- `server/` holds the live-data routes the dev and preview servers add (`/api/trains`). Secrets
  go in `.env.local` (copy `.env.example`); they stay on the server and never reach the bundle.
- Add `?diag` to the URL for the performance overlay on the frame; `?diag=0` hides it.
