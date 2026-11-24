# TJ Viral Clip AI Studio

**Build. Analyse. Recreate. Go viral.**

A free-first, browser-based AI content studio: transcribe videos, analyse why they hold attention, generate hooks and original scripts, plan storyboards, write voiceovers, produce image prompts and social packs, and organise everything in a project library.

Built with **React + TypeScript + Vite + Tailwind CSS**, with an optional **Cloudflare Worker + D1 + R2 + KV** backend included in the same repository.

---

## What is genuinely functional (no mockups)

| Area | Status | Requires |
| --- | --- | --- |
| Dashboard, stats, charts, navigation | Working — computed from your saved records | Nothing |
| Video URL validation + platform detection | Working | Nothing |
| Public metadata lookup (title, thumbnail, author) | Implemented — oEmbed; endpoint verified, in-app flow not browser-driven | Internet |
| Transcription | Working — files up to 25 MB sent to your provider | AI key (Gemini or Groq recommended) |
| Paste/import transcripts (SRT, VTT, timestamped, plain) | Working | Nothing |
| Viral analysis, hooks, clip candidates | Working — grounded in the transcript | AI key |
| Script / image prompt / storyboard / social generation | Working | AI key |
| Voiceover MP3 rendering | Working | ElevenLabs key |
| Image rendering | Working when the model is enabled on your key | Gemini key with image access |
| Save/edit/delete/search projects, export backups | Working — browser storage | Nothing |
| Calendar, queue, automation runs | Working — local records + AI execution | AI key (generation only) |
| MP4 clip rendering | **Not available in-browser** — export the included ffmpeg script, or deploy a processing service | ffmpeg / external processor |
| Auto-publishing to social platforms | **Not enabled** — no platform OAuth is configured | Platform API credentials |

The studio never fabricates results: if no provider is connected, features stay locked and say so. Scores are editorial estimates, not virality guarantees.

## Quick start

```bash
bun install
bun run dev          # http://localhost:3000 (Freebuff preview manages this)
bun run test         # 49 unit + render tests
bun run typecheck    # TypeScript project references
bun run build        # static production build in dist/
```

### Connect a free AI key

1. Open **AI Providers**.
2. Recommended free starting point: **Google Gemini** — create a key at <https://aistudio.google.com/app/apikey>, paste it, choose `gemini-2.5-flash`, **Save & test**.
3. Alternatives: **GroqCloud** (fast Whisper transcription), **OpenRouter** (`:free` models), **NVIDIA NIM**, any **OpenAI-compatible** endpoint (Ollama, LM Studio…), **Anthropic**, **ElevenLabs** (speech).

Keys are stored in this browser only, in a separate storage key from workspace content. They are never committed, logged, exported or attached to project records. For production, store keys as Cloudflare Worker secrets and switch the provider to **proxy** mode.

Transcription paths:

- **Gemini** — audio/video uploaded inline (max ~20 MB), returns timestamped JSON.
- **Groq / OpenAI** — `/audio/transcriptions`, Whisper, max 25 MB, segment granularity.
- Word-level timestamps and speaker diarisation depend on the provider; the UI labels what it actually received.

## Architecture

```
src/
  components/            design system, app shell, dashboard widgets
  lib/
    ai.ts                provider gateway, transcription, analysis, image, speech
    providers.ts         provider catalogue + connection storage
    generation.ts        prompt contracts for hooks/scripts/clips/social/etc.
    platforms.ts         URL validation + platform detection
    srt.ts               SRT/VTT/Markdown export + transcript import parsing
    stats.ts             real activity series for the dashboard chart
    store.ts             local-first workspace store (useSyncExternalStore)
  pages/                 all 17 studio sections
worker/index.ts          optional Cloudflare Worker API (AI proxy, D1 projects, clips)
migrations/0001_init.sql D1 schema
wrangler.jsonc           Worker + D1 + R2 + KV configuration
```

Rules the implementation follows:

- **Cloudflare Workers cannot run GPU, ffmpeg or yt-dlp work.** Those are separate adapters, not fake code paths.
- Provider calls go direct from the browser **or** through the Worker proxy when keys must stay server-side.
- Fallback: if the selected provider fails, the next connected provider that supports the feature is tried.
- Every section of the sidebar is a real page. No decorative controls.

### Sections

Dashboard · Transcription Studio · Viral Video Analyser · Content Intelligence · Hook Generator · Script Studio · Image Prompt Studio · Video Storyboard · Voiceover Studio · Social Media Content · Trend Research · Content Calendar · Automation Workflows · Social Media Command · Project Library · AI Providers · Settings & Diagnostics.

### Privacy & security

- Local-first: no account, no server, no telemetry.
- Video URLs are validated against an allowlist of platform hosts; lookalike domains are rejected.
- Uploads are size-checked (25 MB browser path) and type-checked.
- AI output is parsed defensively; malformed JSON surfaces a readable error instead of fake data.
- Exports exclude API keys.
- Worker routes can be protected with `API_AUTH_TOKEN` and a restricted `ALLOWED_ORIGIN`.

## Cloudflare deployment

See [DEPLOYMENT.md](DEPLOYMENT.md). Configuration, D1 migrations, secrets, R2/KV bindings and build commands are included. Nothing has been deployed from this repository yet — deployment requires your Cloudflare account.

## Open-source credits

See [OPEN_SOURCE_CREDITS.md](OPEN_SOURCE_CREDITS.md). The app is built on MIT/ISC-licensed libraries; heavier engines (Whisper, faster-whisper, yt-dlp, FFmpeg, PySceneDetect, WhisperX) are documented with their roles and licences. No third-party repository was copied wholesale.

## Limitations

- The reference-inspired dashboard is an original implementation, not a pixel copy; artwork is hand-built SVG.
- Multi-device sync, accounts and team isolation require the optional Worker plus an auth layer (not included).
- Clip MP4 rendering and automated publishing require infrastructure this repository documents but does not host.
- AI quality, quotas, model access and pricing are controlled by each provider and can change.

## Licence

Application code: see `LICENSE` in this repository. Third-party components retain their own licences.
