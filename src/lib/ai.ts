import { getProvider, hasUsableKey, loadConnections, type ProviderConnection, type ProviderId } from "./providers";
import type { AIFeature, TranscriptSegment, ViralityReport } from "./types";

export class AIError extends Error {
  code: string;
  provider?: string;
  constructor(message: string, code = "ai_error", provider?: string) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.provider = provider;
  }
}

export interface ChatOptions {
  feature?: AIFeature;
  system?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  cloudApiBase?: string;
  providerId?: ProviderId;
}

interface ChatResult {
  text: string;
  provider: string;
  model: string;
}

const TIMEOUT_MS = 90_000;

function withTimeout(ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

function networkMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") return "The provider request timed out.";
  if (err instanceof TypeError) {
    return "The browser could not reach the provider (likely CORS). Connect a Cloudflare Worker proxy in Settings, or use a provider that allows browser calls.";
  }
  return err instanceof Error ? err.message : "Unknown network error.";
}

async function readError(res: Response, provider: string): Promise<never> {
  let detail = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    const message =
      (body as { error?: { message?: string } | string })?.error ?? (body as { message?: string })?.message;
    if (typeof message === "string") detail = message;
    else if (message && typeof message === "object" && "message" in message) detail = String(message.message);
  } catch {
    /* ignore */
  }
  if (res.status === 401 || res.status === 403) {
    throw new AIError(`${provider}: key rejected or permission denied — ${detail}`, "auth", provider);
  }
  if (res.status === 429) {
    throw new AIError(`${provider}: rate limit or quota exhausted — ${detail}`, "rate_limit", provider);
  }
  throw new AIError(`${provider}: ${detail}`, "provider_error", provider);
}

/** Resolve provider connections in the configured order for a feature. */
export function resolveCandidates(feature: AIFeature, preferred?: ProviderId): ProviderConnection[] {
  const connections = loadConnections().filter((c) => hasUsableKey(c));
  const withFeature = connections.filter((c) => getProvider(c.providerId).features.includes(feature));
  if (preferred) {
    const match = withFeature.find((c) => c.providerId === preferred);
    if (match) return [match, ...withFeature.filter((c) => c !== match)];
  }
  return withFeature;
}

function contentFor(conn: ProviderConnection) {
  const def = getProvider(conn.providerId);
  return { def, key: conn.apiKey?.trim() ?? "", model: conn.model || def.defaultModel };
}

function proxyBase(cloudApiBase?: string) {
  return cloudApiBase?.replace(/\/+$/, "");
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const candidates = resolveCandidates(opts.feature ?? "text", opts.providerId);
  if (!candidates.length) {
    throw new AIError(
      "No AI provider is connected for this task. Open AI Providers and add a free API key.",
      "no_provider",
    );
  }
  let lastError: unknown;
  for (const conn of candidates) {
    try {
      const result = await callChat(conn, opts);
      return result;
    } catch (err) {
      lastError = err;
      // Auth errors are provider-specific; try the next configured provider.
    }
  }
  if (lastError instanceof AIError) throw lastError;
  throw new AIError(networkMessage(lastError), "network");
}

async function callChat(conn: ProviderConnection, opts: ChatOptions): Promise<ChatResult> {
  const { def, key, model } = contentFor(conn);
  if (conn.mode === "proxy") {
    const base = proxyBase(opts.cloudApiBase);
    if (!base) {
      throw new AIError("No Cloudflare Worker URL configured for proxy mode. Add it in Settings.", "no_proxy");
    }
    const res = await fetch(`${base}/api/ai/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: conn.providerId,
        model,
        system: opts.system,
        prompt: opts.prompt,
        json: Boolean(opts.json),
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      }),
    });
    if (!res.ok) await readError(res, `${def.name} (proxy)`);
    const data = (await res.json()) as { text?: string; error?: string };
    if (!data.text) throw new AIError(data.error ?? `${def.name} proxy returned no text.`, "provider_error", def.name);
    return { text: data.text, provider: def.name, model };
  }

  if (def.id === "gemini") {
    const base = conn.baseUrl?.trim() || def.baseUrl!;
    const res = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: opts.system ? { parts: [{ text: opts.system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.8,
          maxOutputTokens: opts.maxTokens ?? 4096,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });
    if (!res.ok) await readError(res, def.name);
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();
    if (!text) {
      const blocked = data?.promptFeedback?.blockReason;
      throw new AIError(
        blocked ? `${def.name} blocked the request (${blocked}).` : `${def.name} returned an empty response.`,
        "empty",
        def.name,
      );
    }
    return { text, provider: def.name, model };
  }

  if (def.id === "anthropic") {
    const base = conn.baseUrl?.trim() || def.baseUrl!;
    const res = await fetch(`${base}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.8,
        system: opts.system,
        messages: [{ role: "user", content: opts.prompt }],
      }),
    });
    if (!res.ok) await readError(res, def.name);
    const data = await res.json();
    const text = (data?.content ?? [])
      .map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();
    if (!text) throw new AIError(`${def.name} returned an empty response.`, "empty", def.name);
    return { text, provider: def.name, model };
  }

  // OpenAI-compatible: openai, openrouter, groq, nvidia, custom
  const base = (conn.baseUrl?.trim() || def.baseUrl!).replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${key}`,
  };
  if (def.id === "openrouter") {
    headers["HTTP-Referer"] = typeof window !== "undefined" ? window.location.origin : "https://localhost";
    headers["X-Title"] = "TJ Viral Clip AI Studio";
  }
  const { signal, done } = withTimeout();
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        model,
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: opts.prompt },
        ],
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens ?? 4096,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) await readError(res, def.name);
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) throw new AIError(`${def.name} returned an empty response.`, "empty", def.name);
    return { text, provider: def.name, model };
  } catch (err) {
    if (err instanceof AIError) throw err;
    throw new AIError(`${def.name}: ${networkMessage(err)}`, "network", def.name);
  } finally {
    done();
  }
}

/** Extract the first JSON object/array from a model response. */
export function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]");
    if (arrStart >= 0 && arrEnd > arrStart) {
      return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)) as T;
    }
    throw new AIError("The AI response was not valid JSON. Try again or switch models.", "parse");
  }
}

export async function testConnection(conn: ProviderConnection): Promise<{ ok: boolean; message: string }> {
  try {
    if (!hasUsableKey(conn)) return { ok: false, message: "Add an API key first." };
    const def = getProvider(conn.providerId);
    if (conn.mode === "proxy") {
      const base = proxyBase((conn as ProviderConnection & { cloudApiBase?: string }).cloudApiBase);
      if (!base) return { ok: false, message: "Set the Worker URL in Settings before testing proxy mode." };
      const res = await fetch(`${base}/api/health`);
      if (!res.ok) return { ok: false, message: `Worker responded ${res.status}.` };
      const data = (await res.json()) as { providers?: string[] };
      const configured = data.providers?.includes(conn.providerId);
      return configured
        ? { ok: true, message: `Worker reachable and ${def.name} key configured server-side.` }
        : { ok: false, message: `Worker reachable, but ${def.name} is not configured as a Worker secret.` };
    }
    if (conn.providerId === "elevenlabs") {
      const base = conn.baseUrl?.trim() || def.baseUrl!;
      const res = await fetch(`${base}/user/subscription`, { headers: { "xi-api-key": conn.apiKey ?? "" } });
      if (!res.ok) {
        const err = await res.text();
        return { ok: false, message: `HTTP ${res.status}: ${err.slice(0, 180)}` };
      }
      const sub = await res.json();
      const used = sub?.character_count ?? 0;
      const limit = sub?.character_limit ?? 0;
      return {
        ok: true,
        message: `Key valid. Character usage ${used}${limit ? ` / ${limit}` : ""}.`,
      };
    }
    const result = await chat({
      feature: def.features.includes("text") ? "text" : "analysis",
      prompt: "Reply with the single word OK.",
      maxTokens: 16,
      temperature: 0,
      providerId: conn.providerId,
    });
    return { ok: true, message: `Connected — ${result.provider} replied using ${result.model}.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Connection failed." };
  }
}

/* ------------------------------------------------------------------ */
/* Transcription                                                       */
/* ------------------------------------------------------------------ */

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export const TRANSCRIBE_PROMPT = `Transcribe this media accurately. Return ONLY JSON with this shape:
{"language":"en","segments":[{"start":0.0,"end":3.2,"speaker":"Speaker 1","text":"..."}]}
Rules: timestamps are seconds (numbers) from the start of the media; split at natural sentence or phrase boundaries (2-12 seconds each); keep wording verbatim; include [music] or [noise] only when clearly present; label speakers only when you can distinguish them, otherwise omit the speaker field.`;

export interface TranscriptionResult {
  segments: TranscriptSegment[];
  language?: string;
  provider: string;
}

export async function transcribeMedia(
  file: File,
  opts: { cloudApiBase?: string; providerId?: ProviderId } = {},
): Promise<TranscriptionResult> {
  const limitMb = 25;
  if (file.size > limitMb * 1024 * 1024) {
    throw new AIError(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. The browser path supports up to ${limitMb} MB — trim the media or use the Worker proxy.`,
      "file_too_large",
    );
  }
  const candidates = resolveCandidates("transcription", opts.providerId);
  if (!candidates.length) {
    throw new AIError("Connect a transcription provider (Gemini or Groq recommended) in AI Providers.", "no_provider");
  }
  let lastError: unknown;
  for (const conn of candidates) {
    try {
      const def = getProvider(conn.providerId);
      if (def.id === "gemini" && conn.mode === "direct") {
        return await transcribeWithGemini(file, conn);
      }
      if (conn.mode === "proxy") {
        const base = proxyBase(opts.cloudApiBase);
        if (!base) throw new AIError("Proxy mode needs the Worker URL in Settings.", "no_proxy");
        const form = new FormData();
        form.append("file", file);
        form.append("provider", conn.providerId);
        form.append("model", conn.model || def.defaultModel);
        const res = await fetch(`${base}/api/ai/transcribe`, { method: "POST", body: form });
        if (!res.ok) await readError(res, `${def.name} (proxy)`);
        const data = (await res.json()) as TranscriptionResult;
        return { ...data, provider: `${def.name} (proxy)` };
      }
      return await transcribeWithWhisper(file, conn);
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError instanceof AIError) throw lastError;
  throw new AIError(networkMessage(lastError), "network");
}

async function transcribeWithGemini(file: File, conn: ProviderConnection): Promise<TranscriptionResult> {
  const def = getProvider("gemini");
  const base = conn.baseUrl?.trim() || def.baseUrl!;
  const model = conn.model && conn.model.includes("image") ? def.defaultModel : conn.model || "gemini-2.5-flash";
  const data = await fileToBase64(file);
  const { signal, done } = withTimeout(180_000);
  try {
    const res = await fetch(
      `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(conn.apiKey ?? "")}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: file.type || "audio/mpeg", data } },
                { text: TRANSCRIBE_PROMPT },
              ],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 8192, responseMimeType: "application/json" },
        }),
      },
    );
    if (!res.ok) await readError(res, def.name);
    const body = await res.json();
    const text = (body?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("");
    if (!text) throw new AIError(`${def.name} returned an empty transcript.`, "empty", def.name);
    const parsed = parseJson<{ language?: string; segments?: TranscriptSegment[] }>(text);
    const segments = normaliseSegments(parsed.segments ?? []);
    if (!segments.length) throw new AIError("The transcript came back without usable segments.", "empty", def.name);
    return { segments, language: parsed.language, provider: def.name };
  } finally {
    done();
  }
}

async function transcribeWithWhisper(file: File, conn: ProviderConnection): Promise<TranscriptionResult> {
  const def = getProvider(conn.providerId);
  const base = (conn.baseUrl?.trim() || def.baseUrl!).replace(/\/+$/, "");
  const isGroq = conn.providerId === "groq";
  const model = isGroq ? (conn.model?.startsWith("whisper") ? conn.model : "whisper-large-v3") : conn.model || "whisper-1";
  const form = new FormData();
  form.append("file", file);
  form.append("model", model);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  const { signal, done } = withTimeout(180_000);
  try {
    const res = await fetch(`${base}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${conn.apiKey ?? ""}` },
      body: form,
      signal,
    });
    if (!res.ok) await readError(res, def.name);
    const data = await res.json();
    const segments = normaliseSegments(
      (data?.segments ?? []) as Array<{ start: number; end: number; text: string }>,
    );
    const fallbackText: string = data?.text ?? "";
    if (!segments.length && fallbackText) {
      return {
        segments: [{ start: 0, end: Math.max(4, fallbackText.length / 15), text: fallbackText.trim() }],
        language: data?.language,
        provider: def.name,
      };
    }
    if (!segments.length) throw new AIError(`${def.name} returned an empty transcript.`, "empty", def.name);
    return { segments, language: data?.language, provider: def.name };
  } finally {
    done();
  }
}

export function normaliseSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  return segments
    .map((s) => ({
      start: Number.isFinite(Number(s.start)) ? Math.max(0, Number(s.start)) : 0,
      end: Number.isFinite(Number(s.end)) ? Math.max(Number(s.start) + 0.5, Number(s.end)) : Number(s.start) + 4,
      text: String(s.text ?? "").trim(),
      ...(s.speaker ? { speaker: String(s.speaker) } : {}),
    }))
    .filter((s) => s.text.length > 0)
    .sort((a, b) => a.start - b.start);
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

const ANALYSIS_SYSTEM =
  "You are a short-form video content strategist. You analyse transcripts honestly and never guarantee virality. Return strict JSON only.";

export async function analyseTranscript(
  transcriptText: string,
  meta: { title: string; platform: string; duration?: number },
  opts: { cloudApiBase?: string; providerId?: ProviderId } = {},
): Promise<{ report: ViralityReport; provider: string }> {
  const prompt = `Analyse this ${meta.platform} video.\nTitle: ${meta.title}\nDuration: ${meta.duration ? `${Math.round(meta.duration)}s` : "unknown"}\n\nTranscript:\n${transcriptText.slice(0, 60000)}\n\nReturn JSON exactly:
{
 "summary": "2-3 sentence description of what the video says and does",
 "category": "e.g. Education, Entertainment, Fitness",
 "hookScore": 0-100,
 "retentionScore": 0-100,
 "emotionalTriggers": ["..."],
 "curiosityGaps": ["..."],
 "retentionTechniques": ["..."],
 "audience": "who this is for",
 "callToAction": "the CTA used, or 'none detected'",
 "strengths": ["..."],
 "weaknesses": ["..."],
 "recommendations": ["concrete edits to improve retention"],
 "disclaimer": "Scores are an editorial estimate, not a guarantee of performance."
}
Scores must reflect the actual transcript, not flattery.`;
  const result = await chat({
    feature: "analysis",
    system: ANALYSIS_SYSTEM,
    prompt,
    json: true,
    temperature: 0.4,
    cloudApiBase: opts.cloudApiBase,
    providerId: opts.providerId,
    maxTokens: 2400,
  });
  const parsed = parseJson<Partial<ViralityReport>>(result.text);
  return {
    report: {
      summary: parsed.summary ?? "No summary returned.",
      category: parsed.category ?? "General",
      hookScore: clampScore(parsed.hookScore),
      retentionScore: clampScore(parsed.retentionScore),
      emotionalTriggers: parsed.emotionalTriggers ?? [],
      curiosityGaps: parsed.curiosityGaps ?? [],
      retentionTechniques: parsed.retentionTechniques ?? [],
      audience: parsed.audience ?? "General audience",
      callToAction: parsed.callToAction ?? "none detected",
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      recommendations: parsed.recommendations ?? [],
      disclaimer: parsed.disclaimer ?? "Scores are an editorial estimate, not a guarantee of performance.",
    },
    provider: result.provider,
  };
}

function clampScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export async function generateImage(
  prompt: string,
  opts: { aspect?: string; cloudApiBase?: string } = {},
): Promise<{ dataUrl: string; provider: string }> {
  const candidates = resolveCandidates("image");
  if (!candidates.length) throw new AIError("Connect an image-capable provider (Gemini) in AI Providers.", "no_provider");
  const conn = candidates[0];
  if (conn.mode === "proxy") {
    const base = proxyBase(opts.cloudApiBase);
    if (!base) throw new AIError("Proxy mode needs the Worker URL in Settings.", "no_proxy");
    const res = await fetch(`${base}/api/ai/image`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, aspect: opts.aspect }),
    });
    if (!res.ok) await readError(res, "Image proxy");
    const data = (await res.json()) as { b64?: string; mimeType?: string };
    if (!data.b64) throw new AIError("Image proxy returned no image.", "empty");
    return { dataUrl: `data:${data.mimeType ?? "image/png"};base64,${data.b64}`, provider: "Gemini (proxy)" };
  }
  const def = getProvider("gemini");
  const base = conn.baseUrl?.trim() || def.baseUrl!;
  const model = conn.model?.includes("image") ? conn.model : "gemini-2.5-flash-image";
  const res = await fetch(
    `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(conn.apiKey ?? "")}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${prompt}${opts.aspect ? ` Aspect ratio ${opts.aspect}.` : ""}`,
              },
            ],
          },
        ],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    },
  );
  if (!res.ok) await readError(res, def.name);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new AIError(
      "Gemini returned no image. This model may not be enabled for your key or region — the prompt is still saved for use elsewhere.",
      "empty",
      def.name,
    );
  }
  return {
    dataUrl: `data:${imagePart.inlineData.mimeType ?? "image/png"};base64,${imagePart.inlineData.data}`,
    provider: def.name,
  };
}

export async function synthesizeSpeech(
  text: string,
  voiceId = "21m00Tcm4TlvDq8ikWAM",
): Promise<{ blob: Blob; provider: string }> {
  const conn = loadConnections().find((c) => c.providerId === "elevenlabs" && hasUsableKey(c));
  if (!conn) throw new AIError("Connect ElevenLabs in AI Providers to render MP3 voiceover.", "no_provider");
  const base = (conn.baseUrl?.trim() || "https://api.elevenlabs.io/v1").replace(/\/+$/, "");
  const res = await fetch(`${base}/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": conn.apiKey ?? "",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: text.slice(0, 4500),
      model_id: conn.model || "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) await readError(res, "ElevenLabs");
  const blob = await res.blob();
  if (!blob.size) throw new AIError("ElevenLabs returned an empty audio file.", "empty");
  return { blob, provider: "ElevenLabs" };
}
