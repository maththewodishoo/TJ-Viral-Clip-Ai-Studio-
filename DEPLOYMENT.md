# Deployment Guide

TJ Viral Clip AI Studio ships as a static SPA plus an optional Cloudflare Worker API. Both live in this repository.

- Frontend: Vite build → `dist/`
- Backend (optional): `worker/index.ts` → Cloudflare Worker
- Database (optional): D1 (`migrations/`)
- Storage (optional): R2 + KV bindings already declared

---

## 1. Local development

```bash
bun install
bun run dev          # dev server (Freebuff preview manages the port)
bun run test         # unit tests
bun run build        # static build → dist/
```

The app is fully usable with no backend. Add a free AI key in **AI Providers** to enable generation.

## 2. Freebuff Cloud preview / deploy

Freebuff runs the dev server and owns the preview. This repository's build script is `tsc -b && vite build` and produces static output in `dist/`, which is what the platform deploy expects. No install/build step starts a server.

## 3. Independent Cloudflare hosting

### 3.1 Prerequisites

```bash
bun install
bunx wrangler login
```

### 3.2 Create resources

```bash
# D1 database
bunx wrangler d1 create tj_viral_clip_studio

# KV namespace
bunx wrangler kv namespace create CACHE

# R2 bucket (optional media storage)
bunx wrangler r2 bucket create tj-viral-clip-studio-media
```

Copy the returned D1 `database_id` and KV `id` into `wrangler.jsonc`, replacing the `REPLACE_WITH_…` placeholders.

### 3.3 Apply migrations

```bash
bunx wrangler d1 migrations apply tj_viral_clip_studio --remote
```

The schema is additive (`CREATE TABLE IF NOT EXISTS`), so re-applying does not drop existing data.

### 3.4 Build the frontend

```bash
bun run build
```

`wrangler.jsonc` serves `./dist` as static assets with SPA fallback, so the Worker and frontend share one deployment.

### 3.5 Configure secrets

```bash
bunx wrangler secret put GEMINI_API_KEY
bunx wrangler secret put GROQ_API_KEY
bunx wrangler secret put OPENAI_API_KEY
bunx wrangler secret put OPENROUTER_API_KEY
bunx wrangler secret put ANTHROPIC_API_KEY
bunx wrangler secret put ELEVENLABS_API_KEY
bunx wrangler secret put API_AUTH_TOKEN        # optional but recommended
```

Set `ALLOWED_ORIGIN` in `wrangler.jsonc` → `vars` to your production origin (not `*`) before going live.

Optional clip processor (must run outside Workers because Workers cannot execute ffmpeg):

```bash
bunx wrangler secret put PROCESSOR_URL
bunx wrangler secret put PROCESSOR_TOKEN
```

### 3.6 Deploy

```bash
bunx wrangler deploy
```

Verify:

```bash
curl https://<your-worker>.workers.dev/api/health
```

Expected: `ok: true`, plus the list of configured providers and bindings. Missing keys appear as `false` — that is a real configuration report, not an error.

### 3.7 Point the frontend at the Worker (optional)

In **Settings & Diagnostics → Cloudflare Worker URL**, enter `https://<your-worker>.workers.dev`. Then in **AI Providers**, set a provider to **proxy** mode to use server-side keys. You can also preconfigure `VITE_CLOUD_API_BASE` at build time.

## 4. GitHub-connected Cloudflare build

1. Push this repository to GitHub (Freebuff's Changes panel handles commits/pushes).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository**.
3. Build command: `bun run build` (or `npm run build`).
4. Deploy command: `bunx wrangler deploy`.
5. Add the D1/KV/R2 bindings and secrets in the dashboard (or keep them in `wrangler.jsonc` + secrets).
6. Set `ALLOWED_ORIGIN` to the assigned workers.dev or custom domain.

Static-only alternative: deploy `dist/` to Cloudflare Pages (build `bun run build`, output `dist`). AI generation then works only in **direct** browser-key mode; D1 project sync and proxy-key mode require the Worker.

## 5. Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Worker secret | Gemini text, transcription, image |
| `GROQ_API_KEY` | Worker secret | Whisper transcription, Llama text |
| `OPENAI_API_KEY` | Worker secret | GPT + Whisper |
| `OPENROUTER_API_KEY` | Worker secret | Free-model access |
| `ANTHROPIC_API_KEY` | Worker secret | Claude |
| `ELEVENLABS_API_KEY` | Worker secret | Voiceover MP3 |
| `API_AUTH_TOKEN` | Worker secret | Bearer auth for `/api/*` |
| `ALLOWED_ORIGIN` | Worker var | CORS allowlist |
| `PROCESSOR_URL` / `PROCESSOR_TOKEN` | Worker secret | External ffmpeg clip service |
| `VITE_CLOUD_API_BASE` | Build env (optional) | Default Worker URL |

See `env.example`. Never commit real values; `.gitignore` excludes `.env*` except the example.

## 6. Processing service contract (optional)

The Worker calls `POST ${PROCESSOR_URL}/render` with:

```json
{ "sourceUrl": "https://…", "start": 12.5, "end": 48, "aspect": "9:16" }
```

It expects either `video/mp4` or JSON. A minimal compliant service uses yt-dlp (rights-permitting) and FFmpeg:

```bash
ffmpeg -ss 12.5 -to 48 -i input.mp4 \
  -vf "scale=1080:-1,crop=ih*9/16:ih,scale=1080:1920" \
  -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k -movflags +faststart out.mp4
```

Only process media you are legally permitted to use, and respect each platform's terms.

## 7. Post-deploy checklist

- `/api/health` returns `ok: true` and the expected bindings.
- One AI key tests green in **AI Providers**.
- A transcript can be generated from a small upload.
- A project saves and reopens after reload.
- `ALLOWED_ORIGIN` is restricted; `API_AUTH_TOKEN` is set if the API is public.
- D1 migration applied; `GET /api/projects` returns JSON, not an error.
