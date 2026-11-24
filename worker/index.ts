/**
 * TJ Viral Clip AI Studio — Cloudflare Worker API
 *
 * Optional backend for production:
 *  - keeps AI provider keys server-side (Worker secrets)
 *  - persists projects in D1
 *  - exposes health/diagnostics
 *  - proxies optional external clip rendering (ffmpeg/yt-dlp service)
 *
 * It does not attempt GPU/ffmpeg work inside the Worker runtime.
 */

export interface Env {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  CACHE?: KVNamespace;
  JOBS?: Queue;
  ALLOWED_ORIGIN?: string;
  API_AUTH_TOKEN?: string;
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  PROCESSOR_URL?: string;
  PROCESSOR_TOKEN?: string;
  DEFAULT_MODEL?: string;
}

// Minimal structural types so the Worker can be typechecked without global DOM conflicts.
interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<unknown>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}
interface R2Bucket {
  put(key: string, value: ArrayBuffer | string): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream } | null>;
  delete(key: string): Promise<void>;
}
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}
interface Queue<T = unknown> {
  send(message: T): Promise<void>;
}

const PROVIDER_KEYS = [
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "GROQ_API_KEY",
  "ANTHROPIC_API_KEY",
  "ELEVENLABS_API_KEY",
] as const;

interface ChatBody {
  provider?: string;
  model?: string;
  system?: string;
  prompt?: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

function corsHeaders(env: Env): Record<string, string> {
  return {
    "access-control-allow-origin": env.ALLOWED_ORIGIN?.trim() || "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(data: unknown, status = 200, env?: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...(env ? corsHeaders(env) : {}) },
  });
}

function authorised(request: Request, env: Env): boolean {
  if (!env.API_AUTH_TOKEN) return true;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${env.API_AUTH_TOKEN}`;
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

function providerKey(env: Env, provider: string): string | undefined {
  switch (provider) {
    case "gemini":
      return env.GEMINI_API_KEY;
    case "openrouter":
      return env.OPENROUTER_API_KEY;
    case "openai":
      return env.OPENAI_API_KEY;
    case "groq":
      return env.GROQ_API_KEY;
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
    case "elevenlabs":
      return env.ELEVENLABS_API_KEY;
    default:
      return undefined;
  }
}

async function callGemini(key: string, body: ChatBody): Promise<string> {
  const model = body.model || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: body.system ? { parts: [{ text: body.system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: body.prompt }] }],
        generationConfig: {
          temperature: body.temperature ?? 0.8,
          maxOutputTokens: body.maxTokens ?? 4096,
          ...(body.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

async function callOpenAICompatible(base: string, key: string, body: ChatBody, extraHeaders: Record<string, string> = {}): Promise<string> {
  const res = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({
      model: body.model,
      messages: [
        ...(body.system ? [{ role: "system", content: body.system }] : []),
        { role: "user", content: body.prompt },
      ],
      temperature: body.temperature ?? 0.8,
      max_tokens: body.maxTokens ?? 4096,
      ...(body.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Provider ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await readJson<ChatBody>(request);
  const provider = body.provider || "gemini";
  const key = providerKey(env, provider);
  if (!key) return json({ error: `No ${provider} secret configured on this Worker.` }, 400, env);
  if (!body.prompt) return json({ error: "prompt is required" }, 400, env);
  try {
    let text = "";
    if (provider === "gemini") {
      text = await callGemini(key, body);
    } else if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: body.model || "claude-3-5-haiku-latest",
          max_tokens: body.maxTokens ?? 4096,
          temperature: body.temperature ?? 0.8,
          system: body.system,
          messages: [{ role: "user", content: body.prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = (await res.json()) as { content?: Array<{ text?: string }> };
      text = (data.content ?? []).map((p) => p.text ?? "").join("");
    } else {
      const bases: Record<string, string> = {
        openrouter: "https://openrouter.ai/api/v1",
        openai: "https://api.openai.com/v1",
        groq: "https://api.groq.com/openai/v1",
        nvidia: "https://integrate.api.nvidia.com/v1",
      };
      const base = bases[provider];
      if (!base) return json({ error: `Unsupported provider ${provider}` }, 400, env);
      text = await callOpenAICompatible(base, key, body, provider === "openrouter" ? { "X-Title": "TJ Viral Clip AI Studio" } : {});
    }
    if (!text.trim()) return json({ error: "Provider returned an empty response." }, 502, env);
    return json({ text }, 200, env);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Provider call failed." }, 502, env);
  }
}

async function handleTranscribe(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return json({ error: "multipart/form-data with a 'file' field is required." }, 415, env);
  }
  const form = await request.formData();
  const entry = form.get("file");
  const provider = String(form.get("provider") ?? "groq");
  const model = String(form.get("model") ?? (provider === "groq" ? "whisper-large-v3" : "whisper-1"));
  if (typeof entry === "string" || entry === null) return json({ error: "Missing 'file' upload." }, 400, env);
  const file = entry as File;
  if (file.size > 25 * 1024 * 1024) return json({ error: "File exceeds the 25 MB transcription limit." }, 413, env);

  if (provider === "gemini") {
    const key = env.GEMINI_API_KEY;
    if (!key) return json({ error: "GEMINI_API_KEY is not configured." }, 400, env);
    const buffer = await file.arrayBuffer();
    const base64 = base64FromBuffer(buffer);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: file.type || "audio/mpeg", data: base64 } },
                  {
                    text: 'Transcribe accurately. Return only JSON: {"language":"en","segments":[{"start":0,"end":3.2,"text":"..."}]} with 2-12 second segments and verbatim wording.',
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 8192 },
          }),
        },
      );
      if (!res.ok) return json({ error: `Gemini ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502, env);
      const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      return new Response(text, { status: 200, headers: { "content-type": "application/json", ...corsHeaders(env) } });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "Transcription failed." }, 502, env);
    }
  }

  const base = provider === "openai" ? "https://api.openai.com/v1" : "https://api.groq.com/openai/v1";
  const key = provider === "openai" ? env.OPENAI_API_KEY : env.GROQ_API_KEY;
  if (!key) return json({ error: `${provider.toUpperCase()}_API_KEY is not configured.` }, 400, env);
  const forward = new FormData();
  forward.append("file", file, file.name || "audio.mp3");
  forward.append("model", model);
  forward.append("response_format", "verbose_json");
  forward.append("timestamp_granularities[]", "segment");
  try {
    const res = await fetch(`${base}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}` },
      body: forward,
    });
    if (!res.ok) return json({ error: `${provider} ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502, env);
    const data = (await res.json()) as { segments?: unknown[]; text?: string; language?: string };
    return json({ segments: data.segments ?? [], language: data.language, provider }, 200, env);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Transcription failed." }, 502, env);
  }
}

async function handleImage(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ prompt?: string; aspect?: string }>(request);
  if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY is not configured." }, 400, env);
  if (!body.prompt) return json({ error: "prompt is required" }, 400, env);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${body.prompt} Aspect ratio ${body.aspect ?? "9:16"}.` }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      },
    );
    if (!res.ok) return json({ error: `Gemini ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502, env);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
    };
    const part = (data.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) return json({ error: "No image returned by the model." }, 502, env);
    return json({ b64: part.inlineData.data, mimeType: part.inlineData.mimeType ?? "image/png" }, 200, env);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Image generation failed." }, 502, env);
  }
}

/* ------------------------------- Projects ------------------------------- */

interface ProjectRow {
  id: string;
  title: string;
  payload: string;
  updated_at: number;
}

async function handleProjects(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.DB) return json({ error: "D1 binding DB is not configured." }, 501, env);
  const id = url.pathname.replace(/^\/api\/projects\/?/, "");
  if (request.method === "GET" && !id) {
    const rows = await env.DB.prepare(
      "SELECT id, title, payload, updated_at FROM projects ORDER BY updated_at DESC LIMIT 100",
    ).all<ProjectRow>();
    return json(
      {
        projects: (rows.results ?? []).map((row) => ({
          ...JSON.parse(row.payload),
          id: row.id,
          title: row.title,
          updatedAt: row.updated_at,
        })),
      },
      200,
      env,
    );
  }
  if (request.method === "POST") {
    const body = await readJson<{ id?: string; title?: string } & Record<string, unknown>>(request);
    if (!body.id || !body.title) return json({ error: "id and title are required" }, 400, env);
    await env.DB.prepare(
      `INSERT INTO projects (id, title, payload, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, payload = excluded.payload, updated_at = excluded.updated_at`,
    )
      .bind(body.id, body.title, JSON.stringify(body), Date.now())
      .run();
    return json({ ok: true }, 200, env);
  }
  if (request.method === "GET" && id) {
    const row = await env.DB.prepare("SELECT id, title, payload, updated_at FROM projects WHERE id = ?").bind(id).first<ProjectRow>();
    if (!row) return json({ error: "Not found" }, 404, env);
    return json({ ...JSON.parse(row.payload), updatedAt: row.updated_at }, 200, env);
  }
  if (request.method === "DELETE" && id) {
    await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
    return json({ ok: true }, 200, env);
  }
  return json({ error: "Method not allowed" }, 405, env);
}

/* --------------------------------- Clips -------------------------------- */

async function handleClips(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ sourceUrl?: string; start?: number; end?: number; aspect?: string }>(request);
  if (!env.PROCESSOR_URL) {
    return json(
      {
        error:
          "Clip rendering service not configured. Cloudflare Workers cannot run ffmpeg; deploy an external processing service and set PROCESSOR_URL.",
        requires: ["PROCESSOR_URL", "PROCESSOR_TOKEN"],
      },
      501,
      env,
    );
  }
  if (typeof body.start !== "number" || typeof body.end !== "number" || body.end <= body.start) {
    return json({ error: "Valid start and end timestamps are required." }, 400, env);
  }
  try {
    const res = await fetch(`${env.PROCESSOR_URL.replace(/\/+$/, "")}/render`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.PROCESSOR_TOKEN ? { authorization: `Bearer ${env.PROCESSOR_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        sourceUrl: body.sourceUrl,
        start: body.start,
        end: body.end,
        aspect: body.aspect ?? "9:16",
      }),
    });
    if (!res.ok) return json({ error: `Processing service responded ${res.status}.` }, 502, env);
    const contentType = res.headers.get("content-type") ?? "application/json";
    if (contentType.includes("video/")) {
      return new Response(res.body, { status: 200, headers: { "content-type": "video/mp4", ...corsHeaders(env) } });
    }
    return json(await res.json(), 200, env);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Processing service unreachable." }, 502, env);
  }
}

function base64FromBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env) });

    if (url.pathname === "/api/health") {
      return json(
        {
          ok: true,
          service: "tj-viral-clip-ai-studio-worker",
          providers: PROVIDER_KEYS.filter((key) => Boolean(env[key])).map((key) =>
            key.replace("_API_KEY", "").toLowerCase(),
          ),
          bindings: {
            d1: Boolean(env.DB),
            r2: Boolean(env.BUCKET),
            kv: Boolean(env.CACHE),
            queue: Boolean(env.JOBS),
            processor: Boolean(env.PROCESSOR_URL),
          },
          authRequired: Boolean(env.API_AUTH_TOKEN),
          time: new Date().toISOString(),
        },
        200,
        env,
      );
    }

    if (url.pathname.startsWith("/api/") && !authorised(request, env)) {
      return json({ error: "Unauthorized" }, 401, env);
    }

    try {
      if (url.pathname === "/api/ai/chat" && request.method === "POST") return await handleChat(request, env);
      if (url.pathname === "/api/ai/transcribe" && request.method === "POST") return await handleTranscribe(request, env);
      if (url.pathname === "/api/ai/image" && request.method === "POST") return await handleImage(request, env);
      if (url.pathname === "/api/clips" && request.method === "POST") return await handleClips(request, env);
      if (url.pathname.startsWith("/api/projects")) return await handleProjects(request, env, url);
      if (url.pathname === "/api/trends") {
        return json(
          {
            error: "No licensed trend provider configured. This endpoint never fabricates trend metrics.",
            requires: ["TRENDS_PROVIDER_URL"],
          },
          501,
          env,
        );
      }
      return json({ error: "Not found" }, 404, env);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "Worker error" }, 500, env);
    }
  },
};
