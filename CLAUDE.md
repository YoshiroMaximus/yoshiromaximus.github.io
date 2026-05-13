# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal website deployed via Cloudflare Workers (using Wrangler), serving plain HTML/CSS/JS files — no build step, no framework, no bundler. The Wrangler config (`wrangler.jsonc`) sets the entire repo root as the assets directory.

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
| `break.html` | Hidden game launcher (linked via invisible `.secret-link` on index) |
| `portfolio.html` | Portfolio page |
| `tools/bell-schedule.html` | GWHS school bell countdown (live clock, SFUSD schedule) |
| `tools/email-signature.html` | Gmail HTML signature generator |
| `break-times/` | Embedded WebAssembly games (Minecraft 1.8/1.12, Among Us) |

## Adding a new tool

1. Create `tools/<name>.html` as a self-contained page following the shared design conventions above.
2. Add a `.tool-card` entry to `tools.html`.
