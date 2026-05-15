# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal website deployed via Cloudflare Workers (using Wrangler), serving plain HTML/CSS/JS files — no build step, no framework, no bundler. The Wrangler config (`wrangler.jsonc`) sets the entire repo root as the assets directory.

Large game assets that exceed Cloudflare Worker asset limits live in an R2 bucket named `sn4k`, served at `https://r2.sn4k.org/...`. The corresponding files are listed in `.gitignore` and `break.html` links to them by absolute URL.

## Development

Preview locally with Wrangler:
```
npx wrangler dev
```

Deploy to Cloudflare:
```
npx wrangler deploy
```

There is no build, lint, or test pipeline.

Uploading a file to R2:
```
npx wrangler r2 object put sn4k/<key> --file <local-path> --content-type <mime>
```

## Structure and conventions

Every page is a self-contained HTML file with inline `<style>` and `<script>` tags — no external CSS or JS files. Pages share the same design system implemented by convention, not by import:

- **Fonts**: `DM Sans` (body) and `DM Mono` (labels, specs, code-adjacent text) from Google Fonts
- **Color tokens**: CSS custom properties on `:root` with a `body.dark` override — `--bg`, `--text`, `--muted`, `--line`, and optionally `--bg2`, `--tag-bg`, accent variables
- **Theme toggle**: `+` / `−` buttons (top-right, fixed) that call `setTheme('light'|'dark')` and persist to `localStorage`
- **Animations**: `fadeUp` keyframe (`opacity 0 → 1`, `translateY(16–20px) → 0`) used on page load via `animation-delay` stagger
- **Back link**: top-left fixed, `DM Mono`, `0.7rem`, `← index` pattern

## Pages

| File | Purpose |
|---|---|
| `index.html` | Landing page — links to Cloudflare, GitHub, and the yoshiro portfolio |
| `tools.html` | Tool directory — grid of `.tool-card` links |
| `break.html` | Game launcher, linked from the index sub-links row |
| `portfolio.html` | Portfolio page |
| `tools/bell-schedule.html` | GWHS school bell countdown (live clock, SFUSD schedule) |
| `tools/email-signature.html` | Gmail HTML signature generator |
| `tools/diff-check.html` | Side-by-side text diff tool |
| `break-times/run.html`, `break-times/gambit.html` | Custom canvas games (committed in-repo) |
| `break-times/1.12-wasm.html`, `break-times/amog.html`, `break-times/balatro (gba)/` | Embedded games — files live in R2, not in git |
| R2 `sn4k` bucket | Hosts the large embedded games (eaglercraft, among us, balatro, drift, karlson, ultrakill, webfishing) at `r2.sn4k.org/<folder-or-file>` |

## Canvas game conventions (run.html, gambit.html)

The custom games share patterns worth matching when adding new ones:

- Theme: read `localStorage.theme`, toggle `body.dark`, and cache CSS-var colors into a `C` object via a `cacheColors()` function that reads `getComputedStyle(document.body)`. Recall colors on resize and theme toggle, **not** every frame.
- Mobile/touch: `canvas { touch-action: none }` + `body { overscroll-behavior: none }`. Use `pointerdown` (or synthesize `click` from `touchstart` with `preventDefault`) so taps don't trigger the browser's synthetic click.
- Hit areas: rebuild an array of `{x,y,w,h,action}` rectangles each frame in `draw()`; the pointerdown handler iterates in push order and the first match wins, with a fallback action (e.g. jump / advance) when nothing is hit.
- Pause: a `'paused'` state that early-returns from `update()` so physics/timers freeze; on-screen pause button is a hit area, `P` key toggles.
- Layout: detect narrow viewports (`W < 640` or "doesn't fit") and reflow HUD below the play area instead of beside it.
- Back link + theme toggle: HTML elements (`#back`, `#theme`) positioned at `top: 1.5rem` left/right, `var(--line)` muted color, matching `break.html`.

## Adding a new tool

1. Create `tools/<name>.html` as a self-contained page following the shared design conventions above.
2. Add a `.tool-card` entry to `tools.html`.

## Adding a new game

- **Custom canvas game**: create `break-times/<name>.html` as a self-contained page, follow the canvas-game conventions above, add a `.game-link` entry to `break.html` with `href="/break-times/<name>.html"`.
- **Large embedded/WASM game**: upload to the R2 `sn4k` bucket (typically as `<name>/index.html` plus assets), add a `.game-link` to `break.html` with the absolute `https://r2.sn4k.org/<name>/index.html` URL, and add the corresponding paths to `.gitignore` if any copy lives locally.

External game links and only those use `target="_blank"`; internal site navigation stays in the same tab.
