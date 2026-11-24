import type { AIFeature } from "./types";

export type ProviderId = "gemini" | "openrouter" | "openai" | "groq" | "anthropic" | "nvidia" | "elevenlabs" | "custom";

export type CallMode = "direct" | "proxy";

export interface ProviderConnection {
  providerId: ProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  mode: CallMode;
  connectedAt: number;
  lastTest?: { ok: boolean; message: string; at: number };
}

export interface ProviderDef {
  id: ProviderId;
  name: string;
  tagline: string;
  keyUrl: string;
  docsUrl: string;
  features: AIFeature[];
  freeTier: string;
  models: string[];
  defaultModel: string;
  baseUrl?: string;
  keyPrefix?: string;
  notes: string;
  supportsTranscription?: boolean;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    tagline: "Transcripts, analysis and image generation",
    keyUrl: "https://aistudio.google.com/app/apikey",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
    features: ["text", "analysis", "transcription", "image"],
    freeTier: "Free API key from Google AI Studio. Free tier has per-minute and per-day request limits.",
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-2.5-flash-image",
    ],
    defaultModel: "gemini-2.5-flash",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    keyPrefix: "AIza",
    notes:
      "Audio and video can be transcribed directly (inline upload, max ~20 MB per request). Free tier availability and quotas are controlled by Google and can change.",
    supportsTranscription: true,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "One key, many models including :free variants",
    keyUrl: "https://openrouter.ai/keys",
    docsUrl: "https://openrouter.ai/docs",
    features: ["text", "analysis"],
    freeTier: "Many models are tagged ':free'. Free models are rate-limited and availability can change without notice.",
    models: [
      "google/gemini-2.0-flash-exp:free",
      "deepseek/deepseek-chat-v3-0324:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "mistralai/mistral-small-3.1-24b-instruct:free",
    ],
    defaultModel: "google/gemini-2.0-flash-exp:free",
    baseUrl: "https://openrouter.ai/api/v1",
    keyPrefix: "sk-or-",
    notes: "Called directly from your browser with your key. Free models may be unavailable during high load.",
  },
  {
    id: "openai",
    name: "OpenAI",
    tagline: "GPT models and Whisper speech-to-text",
    keyUrl: "https://platform.openai.com/api-keys",
    docsUrl: "https://platform.openai.com/docs",
    features: ["text", "analysis", "transcription", "speech"],
    freeTier: "Paid API keys. OpenAI no longer offers a general free API tier.",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "o4-mini"],
    defaultModel: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    keyPrefix: "sk-",
    notes: "Transcription uses whisper-1. Browser calls may be blocked by CORS depending on endpoint — use the Cloudflare Worker proxy if so.",
    supportsTranscription: true,
  },
  {
    id: "groq",
    name: "GroqCloud",
    tagline: "Fast Whisper transcription and Llama models",
    keyUrl: "https://console.groq.com/keys",
    docsUrl: "https://console.groq.com/docs",
    features: ["text", "analysis", "transcription"],
    freeTier: "Developer free tier with rate limits across models. No card required to start.",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "whisper-large-v3", "whisper-large-v3-turbo"],
    defaultModel: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1",
    keyPrefix: "gsk_",
    notes: "whisper-large-v3 accepts files up to 25 MB and returns segment timestamps.",
    supportsTranscription: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    tagline: "Claude models for analysis and writing",
    keyUrl: "https://console.anthropic.com/settings/keys",
    docsUrl: "https://docs.anthropic.com",
    features: ["text", "analysis"],
    freeTier: "Paid API access. No general free API tier.",
    models: ["claude-3-5-haiku-latest", "claude-sonnet-4-20250514", "claude-3-5-sonnet-latest"],
    defaultModel: "claude-3-5-haiku-latest",
    baseUrl: "https://api.anthropic.com/v1",
    keyPrefix: "sk-ant-",
    notes: "Browser calls use the documented direct-browser-access header. Billing applies.",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    tagline: "Hosted NIM models on an OpenAI-compatible API",
    keyUrl: "https://build.nvidia.com",
    docsUrl: "https://docs.nvidia.com/nim/",
    features: ["text", "analysis"],
    freeTier: "Free developer credits at build.nvidia.com; limits and eligibility are set by NVIDIA.",
    models: ["meta/llama-3.3-70b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct", "mistralai/mistral-large-2-instruct"],
    defaultModel: "meta/llama-3.3-70b-instruct",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    keyPrefix: "nvapi-",
    notes: "OpenAI-compatible endpoint. Prefer the Worker proxy if the browser request is blocked by CORS.",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    tagline: "Text-to-speech voiceover rendering",
    keyUrl: "https://elevenlabs.io/app/settings/api-keys",
    docsUrl: "https://elevenlabs.io/docs",
    features: ["speech"],
    freeTier: "Free tier includes a limited monthly character quota with attribution requirements.",
    models: ["eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_flash_v2_5"],
    defaultModel: "eleven_multilingual_v2",
    baseUrl: "https://api.elevenlabs.io/v1",
    notes: "Generates a real MP3 in your browser. Requires a voice-enabled key; free-tier attribution rules apply.",
  },
  {
    id: "custom",
    name: "Custom OpenAI-compatible",
    tagline: "Ollama, LM Studio, Together, Mistral, vLLM…",
    keyUrl: "",
    docsUrl: "https://platform.openai.com/docs/api-reference/chat",
    features: ["text", "analysis", "transcription"],
    freeTier: "Depends on your endpoint. Local Ollama / LM Studio endpoints cost nothing.",
    models: ["llama3.2", "qwen2.5:7b", "mistral-small", "your-model-name"],
    defaultModel: "llama3.2",
    baseUrl: "http://localhost:11434/v1",
    notes: "Any OpenAI-compatible /chat/completions endpoint. Local endpoints must allow browser requests (CORS).",
    supportsTranscription: true,
  },
];

export function getProvider(id: ProviderId): ProviderDef {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

const KEYS_STORAGE = "tjv.studio.connections.v1";

export function loadConnections(): ProviderConnection[] {
  try {
    const raw = localStorage.getItem(KEYS_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProviderConnection[]) : [];
  } catch {
    return [];
  }
}

export function saveConnections(connections: ProviderConnection[]) {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(connections));
  window.dispatchEvent(new CustomEvent("tjv:connections"));
}

export function upsertConnection(connection: ProviderConnection) {
  const all = loadConnections().filter((c) => c.providerId !== connection.providerId);
  saveConnections([...all, connection]);
}

export function removeConnection(providerId: ProviderId) {
  saveConnections(loadConnections().filter((c) => c.providerId !== providerId));
}

export function maskKey(key?: string): string {
  if (!key) return "";
  if (key.length <= 10) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(Math.min(18, key.length - 8))}${key.slice(-4)}`;
}

export function hasUsableKey(conn?: ProviderConnection): boolean {
  if (!conn) return false;
  return conn.mode === "proxy" ? true : Boolean(conn.apiKey);
}
