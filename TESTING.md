# Testing Report

Recorded during development of TJ Viral Clip AI Studio, November 2026.
Environment: Bun 1.4.2, Node 22, TypeScript 5.6, Vite 5.4, Chromium/Safari-class browser target.

## Automated checks (run and passed)

| Check | Command | Result |
| --- | --- | --- |
| Dependency install | `bun install` | Pass |
| App typecheck (strict) | `bun tsc -b --noEmit` | Pass — 0 errors |
| Worker typecheck | `bun tsc -p worker/tsconfig.json --noEmit` | Pass — 0 errors |
| Unit + render tests | `bun run test` | Pass — 49/49 in 5 files |
| Production build | `bun run build` | Pass — 1633 modules, dist emitted |

### Unit test coverage

| File | Cases | What is verified |
| --- | --- | --- |
| `src/lib/platforms.test.ts` | 8 | YouTube/TikTok/Instagram/Facebook/X detection, Shorts, youtu.be normalisation, rejection of lookalike domains (`youtube.com.evil.example`), non-http schemes, direct-media detection, id extraction |
| `src/lib/srt.test.ts` | 7 | SRT/VTT timestamp formatting, subtitle block structure, SRT + bracketed + plain-text import, empty input |
| `src/lib/stats.test.ts` | 7 | Stats only count real records, zero state, 7D/30D/90D/1Y bucket counts, correct day placement, out-of-range exclusion, no fabricated series |
| `src/lib/ai.test.ts` | 7 | JSON extraction from fenced/prose responses, invalid output error, segment normalisation, inverted timestamps, negative starts |
| `src/app.render.test.tsx` | 20 | jsdom render of all 17 routes (correct heading, 17 sidebar links), dashboard URL input visible, honest empty states, no fabricated deltas, unknown route redirect |

## Verification performed

| Area | Result | Notes |
| --- | --- | --- |
| All 17 sections mount without runtime errors | Pass | jsdom render suite (20 tests) |
| Dashboard shows the video URL input, honest empty stats and no fabricated deltas | Pass | jsdom assertions |
| SPA preview serves | Pass | `freebuff-preview start` reached readiness; `/`, `/analyser`, JS and CSS return HTTP 200; dev-server log clean |
| Metadata endpoints | Pass (endpoint level) | `curl` against noembed and YouTube oEmbed returned a real title/author/thumbnail for a public YouTube URL |
| URL validation | Pass | Unit tested, including lookalike-domain and scheme rejection |
| Desktop visual match to the reference | **Not visually verified** | No browser/screenshot tooling available (Chromium system libraries could not be installed — disk full). Layout structure follows the reference; a human visual pass is still required. |
| Mobile layout (iPhone) | **Not visually verified** | Responsive classes implemented (drawer, 5-item bottom bar, stacked cards); rendered mobile view not inspected. |
| Save/reload project persistence | **Not exercised in a browser** | Store logic is implemented with localStorage, but no end-to-end browser run was possible. |
| Diagnostics run | **Not exercised** | Requires a browser session; the checks themselves perform real network/storage calls. |

## Not verified (and why)

| Item | Status | Reason |
| --- | --- | --- |
| Live transcription with Gemini/Groq/Whisper | Not executed | No provider API key is configured in this workspace. The request paths are implemented and type-checked; they were not exercised against a live key. |
| Browser-based URL submission flow (metadata → transcript → analysis) | Not executed end-to-end | Metadata endpoint verified separately with curl; the UI flow was not driven in a browser. |
| Viral analysis / hooks / scripts / social output quality | Not executed | Same — requires a configured key. Locked states are shown instead of fabricated content. |
| Image generation (Gemini image model) | Not executed | Model access depends on the user's key/region. |
| Voiceover MP3 render (ElevenLabs) | Not executed | Requires an ElevenLabs key. |
| MP4 clip rendering | Not implemented in-browser | Cloudflare/browsers cannot run ffmpeg; the app exports a render script and documents the processor contract. Not claimed as working. |
| Cloudflare deployment | Not deployed | Requires the owner's Cloudflare account/credentials. Configuration and migrations are provided. |
| Multi-device sync / auth | Not implemented | No backend accounts in this build; documented limitation. |
| Automated social publishing | Not implemented | No platform OAuth credentials; UI records intent only. |

## Reproduce

```bash
bun install
bun run test
bun tsc -b --noEmit
bun run build
```

Test data: unit tests use synthetic in-memory fixtures only. No production credentials or personal data are used.
