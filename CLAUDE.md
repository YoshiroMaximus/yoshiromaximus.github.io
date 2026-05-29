# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal site on Cloudflare Workers. Hand-written, self-contained HTML files (no build/framework/bundler). `src/worker.js` serves a small `/api/*` JSON API and falls through to static assets (repo root) for everything else. `wrangler.jsonc` has the wiring.

## Commands

```
npx wrangler dev        # preview
npx wrangler deploy     # ship (does NOT run D1 migrations)
npx wrangler d1 execute gambit-leaderboard --file migrations/<f>.sql --remote
npx wrangler r2 object put sn4k/<key> --file <path> --content-type <mime>
```

No build, lint, or test pipeline.

## Layout

- `tools/` — tool pages, listed on `tools.html` as `.tool-card`s.
- `break-times/` — games, listed on `break.html` as `.game-link`s. Custom canvas games are committed; large/WASM games live in R2 (gitignored), linked by absolute `r2.sn4k.org` URL.
- `src/worker.js` — entire backend, one file. R2 bucket `sn4k`, D1 `gambit-leaderboard`, per-IP rate limiter.
- `migrations/` — D1 schema (applied manually).
- `decks/` — static deck JSON (deep-linked), separate from the R2 `/api/decks` store.

## Conventions

- Pages are self-contained (inline `<style>`/`<script>`, no shared files). Copy a sibling and match it: `DM Sans`/`DM Mono`, `:root` + `body.dark` theme vars, `+`/`−` toggle → `localStorage`, `← index` back link.
- API handlers all follow: validate → rate-limit writes → return `json()`. Read the handler before extending.
- Internal links same-tab; external/embedded games use `target="_blank"`.
- Adding a tool/game = new file + register it in `tools.html`/`break.html`.

## Gotchas

- `tools/notes-sw.js` caches an app shell — bump `VERSION` or edits to `notes.html` won't reach installed PWA users.
- `wrangler deploy` does not apply D1 migrations; run `d1 execute … --remote`.
- `notes_auth` cookie holds the raw password (constant-time compared) — deliberate for this single-user app.
- Many `break-times/` paths are gitignored (live in R2); they won't exist locally.
