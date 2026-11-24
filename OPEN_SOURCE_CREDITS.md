# Open Source Credits & Research Record

TJ Viral Clip AI Studio is built on open-source software. This file records what was **researched**, what is **actually integrated**, how it is used, and the licence to respect.

> Licences were checked against the upstream repositories during development (Nov 2026). Always re-verify the licence at the version you deploy. This document is attribution, not legal advice.

---

## 1. Integrated runtime dependencies

| Project | Role in this app | Licence | Attribution / notes |
| --- | --- | --- | --- |
| [React](https://github.com/facebook/react) | UI framework | MIT | © Meta Platforms, Inc. and affiliates. Unmodified dependency. |
| [React DOM](https://github.com/facebook/react) | Rendering | MIT | Same as above. |
| [React Router](https://github.com/remix-run/react-router) | Client routing | MIT | © Remix Software. Unmodified dependency. |
| [Vite](https://github.com/vitejs/vite) | Build tool / dev server | MIT | Copyright Vite contributors. Used at build time only. |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | Styling | MIT | © Tailwind Labs, Inc. |
| [PostCSS](https://github.com/postcss/postcss) / [Autoprefixer](https://github.com/postcss/autoprefixer) | CSS pipeline | MIT | Build-time only. |
| [Lucide](https://github.com/lucide-icons/lucide) | Icon set | ISC | © Lucide contributors. Icons used unmodified. |
| [clsx](https://github.com/lukeed/clsx) | Class utilities | MIT | © Luke Edwards. |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | Class conflict resolution | MIT | © David Castil. |
| [Cloudflare Workers](https://github.com/cloudflare/workers-sdk) / [Wrangler](https://github.com/cloudflare/workers-sdk) | Optional backend runtime + tooling | MIT / Apache-2.0 (see repo) | © Cloudflare, Inc. |
| [Vitest](https://github.com/vitest-dev/vitest) | Unit testing | MIT | © Vitest contributors. |

## 2. Open-source engines researched

These projects informed the architecture. Where they are not bundled, that is deliberate: Cloudflare Workers cannot execute Python, CUDA or long-running ffmpeg workloads, so they belong in an external processing adapter.

| Project | Functionality evaluated | Licence (upstream at review) | Integration decision |
| --- | --- | --- | --- |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Video/audio retrieval from public platforms | Unlicense (public domain); bundled release artifacts also include ISC/MIT components | **Not bundled.** Browser media extraction is unreliable and platform-restricted. Documented for a self-hosted processing service; the UI never pretends downloads succeed. |
| [OpenAI Whisper](https://github.com/openai/whisper) | Speech-to-text, timestamps | MIT | **Used through APIs**, not vendored. Whisper models power OpenAI/Groq transcription endpoints. |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | CTranslate2 Whisper inference (CPU/GPU) | MIT | **Not bundled** (Python + native runtime). Recommended for a self-hosted transcription service. |
| [WhisperX](https://github.com/m-bain/whisperX) | Word-level alignment + diarisation | BSD-2-Clause per repository LICENSE (package metadata has reported MIT — verify upstream) | **Not bundled.** Diarisation is provider-dependent and labelled as such in the UI. |
| [FFmpeg](https://github.com/FFmpeg/FFmpeg) | Decoding, trimming, 9:16 crop, subtitles | LGPL-2.1-or-later by default; GPL if built with GPL components | **Not embedded.** The studio generates tested-shape ffmpeg commands for local rendering and documents the optional processor service. Respect the licence of the ffmpeg build you use. |
| [PySceneDetect](https://github.com/Breakthrough/PySceneDetect) | Scene-cut / shot detection | BSD-3-Clause | **Not integrated.** Planned as an optional preprocessing step in the external processor (shot boundaries could improve clip framing). |
| [youtube-clipping](https://github.com/ShayanNoorullah/youtube-clipping) | Clip extraction experiments | Not verified during review | **Not used.** Licence and maintenance could not be confirmed, so no code was taken. |

### Additional projects assessed but not adopted

- Local Diarisation stacks (pyannote) — licence/model gating and GPU needs make them unsuitable for the default free path.
- Browser ffmpeg.wasm pipelines — large payloads, memory limits on iPhone Safari, and unreliable long encodes; rejected for production trust.
- Whisper.cpp — excellent for offline, but requires WASM packaging and large downloads; documented as a possible future adapter.

## 3. Services (not open source)

These are optional, user-keyed services. Their terms and quotas are controlled by the provider:

- Google Gemini API — <https://ai.google.dev/gemini-api/docs>
- OpenRouter — <https://openrouter.ai/docs>
- OpenAI API — <https://platform.openai.com/docs>
- GroqCloud — <https://console.groq.com/docs>
- Anthropic API — <https://docs.anthropic.com>
- NVIDIA NIM — <https://docs.nvidia.com/nim/>
- ElevenLabs — <https://elevenlabs.io/docs>
- noembed / YouTube oEmbed — public metadata endpoints

No API keys, model weights or proprietary assets are included in this repository. No provider is required: the app works locally without any key, with AI features locked.

## 4. Attribution and modifications

- Application source in this repository is original work for TJ Viral Clip AI Studio.
- Libraries are consumed as published npm packages; they were not patched, rebranded or relicensed.
- The neon dashboard visual language is an original implementation inspired by the supplied design reference; the presenter artwork is hand-authored SVG, not a copied asset.
- If you add a GPL-licensed component (for example a GPL FFmpeg build) to a distributed network service, review the obligations that apply to your deployment.

## 5. Reporting an omission

If you believe a project is used without proper credit, open an issue with the component and location. Attribution will be corrected or the dependency removed.
