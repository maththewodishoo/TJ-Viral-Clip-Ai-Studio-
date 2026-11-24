# Testing Report

Recorded during development of TJ Viral Clip AI Studio, November 2026.
Environment: Bun 1.4.2, Node 22, TypeScript 5.6, Vite 5.4, Playwright 1.49 + Chromium 159 (headless), viewports 1440×1000 and iPhone 13 (390×844).

## Automated checks — all passing

| Check | Command | Result |
| --- | --- | --- |
| Dependency install | `bun install` | Pass |
| App typecheck (strict) | `bun tsc -b --noEmit` | Pass — 0 errors |
| Worker typecheck | `bun tsc -p worker/tsconfig.json --noEmit` | Pass — 0 errors |
| Unit + render tests | `bun run test` | Pass — 49/49 in 5 files |
| Production build | `bun run build` | Pass — static `dist/` emitted |
| Browser smoke test | `bun run test:ui` (preview running) | Pass — 17 routes, 0 runtime errors |
| Layout checks | `bun run test:ui` | Pass — 17/17 |
| Deploy configuration | `freebuff-deploy check` | Pass — deployable, no problems |

### Browser smoke test (real Chromium)

- All 17 routes return HTTP 200, render an `<h1>`, and report **zero page or console errors**.
- No horizontal overflow on any route at desktop width.
- Invalid URL submission (`vimeo.com`) shows the inline “Unsupported platform” error — no fake success.
- A saved project seeded into `localStorage` persists across reload and is retrievable in the Project Library.
- Mobile (iPhone 13): no horizontal overflow; 5-item bottom navigation visible; drawer opens and exposes all sections; “Analyse Video” button is 44 px tall.
- Sidebar is 232 px wide and full height; topbar spans the content area; 13 dashboard panels render inside the content column.

### Layout checks (measured, not eyeballed)

- Dashboard contains hero, URL analyser, performance chart, quick actions, API setup, recent projects, trending topics and system status.
- Six quick actions are wired; no panel overlaps the sidebar or exits the viewport.
- Mobile bottom-nav targets measure 78×53 px (above touch minimum).
- Dark base background resolves to `rgb(5, 3, 13)`.

## Failure found and repaired

**Mobile type floor too small.** The first layout run found rendered text at 8 px, 9 px and 9.5 px on iPhone width. Fix: a phone-only rule in `src/index.css` raises metadata text below 10 px to 10.5 px while leaving the desktop composition unchanged. Re-ran layout checks: **17/17 pass**, no new overflow.

Earlier in development one unit assertion was overly strict (“Not connected” legitimately appears in two panels); it was corrected and the suite re-ran green.

## Unit test coverage

| File | Cases | What is verified |
| --- | --- | --- |
| `src/lib/platforms.test.ts` | 8 | YouTube/TikTok/Instagram/Facebook/X detection, Shorts, youtu.be normalisation, lookalike-domain rejection (`youtube.com.evil.example`), non-http schemes, direct-media detection, id extraction |
| `src/lib/srt.test.ts` | 7 | SRT/VTT formatting, subtitle blocks, SRT + bracketed + plain-text import, empty input |
| `src/lib/stats.test.ts` | 7 | Stats count only real records, zero state, 7D/30D/90D/1Y buckets, correct day placement, out-of-range exclusion, no fabricated series |
| `src/lib/ai.test.ts` | 7 | JSON recovery from fenced/prose responses, invalid-output error, segment normalisation, inverted timestamps, negative starts |
| `src/app.render.test.tsx` | 20 | jsdom render of all 17 routes, 17 sidebar links, visible URL input, honest empty states, no fabricated deltas, unknown-route redirect |

## Not verified — with reasons

| Item | Status | Reason |
| --- | --- | --- |
| Pixel-level visual match to the supplied screenshot | **Not inspected** | This agent host cannot display image files (image reads return bytes), so no human/visual comparison was possible. Layout geometry, text and absence of overflow were measured instead; a visual pass by the owner is still required. |
| Live transcription with Gemini/Groq/Whisper | Not executed | No provider API key is configured in this workspace. Request paths are implemented and type-checked but were not exercised against a live key. |
| AI analysis, hooks, scripts, social output quality | Not executed | Same — requires a configured key. Locked states are shown instead of fabricated content. |
| Image generation (Gemini image model) | Not executed | Model access depends on the user's key/region. |
| Voiceover MP3 render (ElevenLabs) | Not executed | Requires an ElevenLabs key. |
| MP4 clip rendering | Not implemented in-browser | Browsers/Workers cannot run ffmpeg; the app exports a render script and documents the processor contract. Not claimed as working. |
| Cloudflare deployment | Not deployed | Requires the owner's Cloudflare account. `freebuff-deploy check` passes; deployment itself was not run. |
| Multi-device sync / accounts | Not implemented | No backend accounts in this build; documented limitation. |
| Automated social publishing | Not implemented | No platform OAuth credentials; the UI records intent only. |
| Database migrations against live D1 | Not executed | No Cloudflare D1 instance exists yet. SQL is additive and included. |

## Reproduce

```bash
bun install
bun run test          # unit + DOM render tests
bun tsc -b --noEmit
bun run build
# with the preview running:
bun run test:ui       # prompts-free browser smoke + layout checks
```

`scripts/smoke.mjs` and `scripts/layout-check.mjs` use the Playwright-installed Chromium, or `PLAYWRIGHT_CHROMIUM_PATH` when set. Screenshots are written to `tmp-screens/` (git-ignored) for manual review.

Test data: synthetic in-memory fixtures and a temporary seeded project only. No production credentials or personal data are used.
