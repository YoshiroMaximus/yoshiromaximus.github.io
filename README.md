# yoshiromaximus.github.io

Personal site. Hand-written, self-contained HTML pages (no framework, no build step), served two ways:

- **sn4k.org**: Cloudflare Workers, built from the `2026` branch. The worker (`src/worker.js`) serves a small JSON API and falls through to static assets.
- **yoshiromaximus.github.io**: GitHub Pages, currently built from the `oreui` branch (the experimental Ore UI portfolio).

```
npx wrangler dev      # local preview
npx wrangler deploy   # ship to Cloudflare (does NOT run D1 migrations)
```

## Layout

| Path | What it is |
|---|---|
| `index.html`, `tools.html`, `break.html`, `portfolio.html` | Top-level pages. Each page is self-contained: inline CSS/JS, no shared files. |
| `404.html` | Custom 404 (GitHub Pages picks it up automatically). |
| `tools/` | Tool pages (pomodoro, flashcards, notes, diff-check, assignments, bell schedule). Registered as cards in `tools.html`. |
| `break-times/` | Games. Custom canvas games are committed; large/WASM games live in R2 (gitignored) and are linked by absolute `r2.sn4k.org` URL. |
| `src/worker.js` | The entire backend: decks, notes, and leaderboard APIs. R2 bucket `sn4k`, D1 `gambit-leaderboard`, per-IP rate limiter. |
| `migrations/` | D1 schema. Applied manually: `npx wrangler d1 execute gambit-leaderboard --file migrations/<f>.sql --remote`. |
| `images/` | Page images (webp). |
| `favistuff/` | Favicons and web manifest. |
| `.assetsignore` | Keeps `src/`, `migrations/`, config, and dot-dirs from being served as static assets on Cloudflare. |

## Conventions

- New tool or game = new self-contained file + register it in `tools.html` / `break.html`.
- Copy a sibling page and match it: DM Sans / DM Mono, theme toggle via `localStorage`, `← index` back link.
- Internal links same-tab; external or embedded games use `target="_blank"`.

## Gotchas

- Many `break-times/` paths are gitignored (they live in R2), so they won't exist in a fresh clone.
- `tools/notes-sw.js` caches an app shell; bump its `VERSION` or edits to `notes.html` won't reach installed PWA users.
- `wrangler deploy` does not apply D1 migrations; run them manually.
