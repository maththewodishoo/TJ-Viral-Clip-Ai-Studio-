import { chat, parseJson, type AIError } from "./ai";
import type { ProviderId } from "./providers";
import type {
  CalendarEntry,
  ClipSuggestion,
  HookIdea,
  ImagePrompt,
  ScriptDoc,
  SocialPost,
  StoryboardScene,
  TrendTopic,
  Voiceover,
} from "./types";
import { uid } from "./utils";

interface GenOpts {
  cloudApiBase?: string;
  providerId?: ProviderId;
  brandVoice?: string;
}

const SYSTEM =
  "You are TJ Viral Clip AI Studio — a senior short-form content strategist and scriptwriter. Be concrete and usable. Never invent facts about a video that are not in the supplied transcript. Never guarantee virality. Return strict JSON only.";

async function structured<T>(prompt: string, opts: GenOpts, maxTokens = 2600): Promise<{ data: T; provider: string }> {
  const result = await chat({
    feature: "analysis",
    system: `${SYSTEM}${opts.brandVoice ? `\nBrand voice: ${opts.brandVoice}` : ""}`,
    prompt,
    json: true,
    temperature: 0.85,
    maxTokens,
    cloudApiBase: opts.cloudApiBase,
    providerId: opts.providerId,
  });
  return { data: parseJson<T>(result.text), provider: result.provider };
}

export function transcriptWithTimecodes(segments: Array<{ start: number; end: number; text: string }>): string {
  return segments
    .map((s) => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text}`)
    .join("\n");
}

/* ------------------------------- Hooks -------------------------------- */

export async function generateHooks(
  transcript: string,
  meta: { title: string; platform: string },
  opts: GenOpts & { platforms?: string[] } = {},
): Promise<{ hooks: HookIdea[]; provider: string }> {
  const platforms = opts.platforms?.length ? opts.platforms.join(", ") : meta.platform;
  const prompt = `Video title: ${meta.title}\nPlatform: ${meta.platform}\n\nTranscript:\n${transcript.slice(0, 20000)}\n\nGive 6 alternative opening hooks for ${platforms}. Return JSON:
{"hooks":[{"hook":"...", "why":"why it earns the first 3 seconds", "platform":"TikTok", "score":0-100}]}
Keep each hook under 18 words, truthful to the transcript, no clickbait that the content cannot pay off.`;
  const { data, provider } = await structured<{ hooks: HookIdea[] }>(prompt, opts);
  return { hooks: data.hooks ?? [], provider };
}

/* ------------------------------- Clips -------------------------------- */

export async function findClips(
  segments: Array<{ start: number; end: number; text: string }>,
  meta: { title: string; duration?: number },
  opts: GenOpts & { maxClips?: number } = {},
): Promise<{ clips: ClipSuggestion[]; provider: string }> {
  const max = opts.maxClips ?? 5;
  const duration = meta.duration ?? segments[segments.length - 1]?.end ?? 0;
  const prompt = `Find up to ${max} self-contained short-form clip candidates (15-60 seconds) in this transcript.
Video: ${meta.title}\nTotal duration: ${duration.toFixed(1)}s\n\nTranscript with timecodes:\n${transcriptWithTimecodes(
    segments,
  ).slice(0, 40000)}

Return JSON: {"clips":[{"start":12.5,"end":48.0,"title":"...","reason":"why this segment stands alone","caption":"ready-to-post caption with 2-3 hashtags"}]}
Rules: start and end are seconds within 0-${Math.round(duration)}. Each clip must start on a natural sentence boundary and end on a complete thought. Do not overlap clips.`;
  const raw = await structured<{ clips: ClipSuggestion[] }>(prompt, opts, 2200);
  const clips = (raw.data.clips ?? [])
    .map((c) => ({
      id: uid("clip"),
      start: Math.max(0, Math.min(Number(c.start) || 0, duration || Number(c.end) || 60)),
      end: Math.max(0, Math.min(Number(c.end) || 0, duration || Number(c.end) || 60)),
      title: String(c.title ?? "Untitled clip"),
      reason: String(c.reason ?? ""),
      caption: String(c.caption ?? ""),
    }))
    .filter((c) => c.end > c.start + 3)
    .slice(0, max);
  return { clips, provider: raw.provider };
}

/* ------------------------------ Scripts ------------------------------- */

export async function generateScript(
  input: { topic: string; platform?: string; duration?: number; reference?: string },
  opts: GenOpts = {},
): Promise<{ script: ScriptDoc; provider: string }> {
  const prompt = `Write an original short-form video script.
Topic: ${input.topic}
Platform: ${input.platform ?? "TikTok"}
Target length: ${input.duration ?? 45} seconds
${input.reference ? `Reference material to draw technique from (do not copy wording): ${input.reference.slice(0, 12000)}` : ""}

Return JSON:
{"title":"...","hook":"...","format":"short","body":"timestamped beats, e.g. 0-3s: hook\\n3-10s: ...","cta":"..."}
The script must be original, specific and shootable. No claims the topic cannot support.`;
  const { data, provider } = await structured<{ title: string; hook: string; format: string; body: string; cta: string }>(
    prompt,
    opts,
  );
  const script: ScriptDoc = {
    id: uid("script"),
    title: data.title ?? input.topic,
    format: data.format === "long" ? "long" : data.format === "reel" ? "reel" : "short",
    hook: data.hook,
    body: data.body ?? "",
    cta: data.cta,
    createdAt: Date.now(),
  };
  return { script, provider };
}

/* --------------------------- Image prompts ---------------------------- */

export async function generateImagePrompts(
  input: { concept: string; count?: number; style?: string; aspect?: string },
  opts: GenOpts = {},
): Promise<{ images: ImagePrompt[]; provider: string }> {
  const prompt = `Write ${input.count ?? 4} detailed text-to-image prompts.
Concept: ${input.concept}
Style: ${input.style ?? "cinematic neon editorial"}
Aspect ratio: ${input.aspect ?? "9:16"}
Return JSON: {"prompts":[{"prompt":"subject, lighting, lens, mood, colour palette","style":"...","aspect":"...","negative":"what to avoid"}]}
Each prompt must be visual, specific and free of text-in-image requests.`;
  const { data, provider } = await structured<{
    prompts: Array<{ prompt: string; style?: string; aspect?: string; negative?: string }>;
  }>(prompt, opts, 2000);
  const images: ImagePrompt[] = (data.prompts ?? []).map((p) => ({
    id: uid("img"),
    prompt: p.prompt,
    style: p.style ?? input.style,
    aspect: p.aspect ?? input.aspect,
    negative: p.negative,
    createdAt: Date.now(),
  }));
  return { images, provider };
}

/* ----------------------------- Storyboard ----------------------------- */

export async function generateStoryboard(
  input: { idea: string; scenes?: number; duration?: number },
  opts: GenOpts = {},
): Promise<{ title: string; scenes: StoryboardScene[]; provider: string }> {
  const scenes = input.scenes ?? 6;
  const prompt = `Plan a ${input.duration ?? 45}-second short-form video.
Idea: ${input.idea.slice(0, 16000)}
Return JSON:
{"title":"...","scenes":[{"timecode":"0-3s","visual":"what the camera shows","voiceover":"exact words","textOverlay":"on-screen text","shot":"shot type / movement"}]}
Exactly ${scenes} scenes covering the full duration.`;
  const { data, provider } = await structured<{
    title: string;
    scenes: Array<Omit<StoryboardScene, "id" | "index">>;
  }>(prompt, opts, 2400);
  return {
    title: data.title ?? input.idea.slice(0, 60),
    scenes: (data.scenes ?? []).map((s, i) => ({ ...s, id: uid("scene"), index: i + 1 })),
    provider,
  };
}

/* ------------------------------ Voiceover ----------------------------- */

export async function generateVoiceoverScript(
  input: { topic: string; duration?: number; tone?: string },
  opts: GenOpts = {},
): Promise<{ voiceover: Voiceover; provider: string }> {
  const prompt = `Write a voiceover-ready narration.
Topic: ${input.topic}
Duration: ${input.duration ?? 45} seconds
Tone: ${input.tone ?? "confident, warm, fast-paced"}
Return JSON: {"title":"...","script":"narration with natural pauses (line breaks allowed)","pace":"e.g. 150 wpm"}
Only narration text — no stage directions inside the script.`;
  const { data, provider } = await structured<{ title: string; script: string; pace: string }>(prompt, opts, 1600);
  const words = (data.script ?? "").split(/\s+/).filter(Boolean).length;
  return {
    voiceover: {
      id: uid("vo"),
      title: data.title ?? input.topic,
      script: data.script ?? "",
      pace: data.pace ?? `${Math.round(words / ((input.duration ?? 45) / 60))} wpm`,
      duration: `${input.duration ?? 45}s`,
      voice: input.tone,
      createdAt: Date.now(),
    },
    provider,
  };
}

/* ------------------------------- Social ------------------------------- */

export async function generateSocialPack(
  input: { topic: string; platforms: string[]; count?: number },
  opts: GenOpts = {},
): Promise<{ posts: SocialPost[]; provider: string }> {
  const prompt = `Create ${input.count ?? 3} social posts about: ${input.topic}
Platforms: ${input.platforms.join(", ")}
Return JSON: {"posts":[{"platform":"tiktok|instagram|youtube|x|facebook","title":"...","caption":"...","hashtags":["#..."],"thumbnailConcept":"..."}]}
Captions must match each platform's length conventions. Hashtags must be relevant, 3-6 per post.`;
  const { data, provider } = await structured<{
    posts: Array<{ platform: string; title: string; caption: string; hashtags: string[]; thumbnailConcept?: string }>;
  }>(prompt, opts, 2200);
  const allowed = ["tiktok", "instagram", "youtube", "youtube-shorts", "x", "facebook"] as const;
  const posts: SocialPost[] = (data.posts ?? []).map((p) => ({
    id: uid("post"),
    platform: (allowed as readonly string[]).includes(p.platform) ? (p.platform as SocialPost["platform"]) : "tiktok",
    title: p.title ?? "Untitled post",
    caption: p.caption ?? "",
    hashtags: p.hashtags ?? [],
    thumbnailConcept: p.thumbnailConcept,
    createdAt: Date.now(),
  }));
  return { posts, provider };
}

/* ------------------------------- Trends ------------------------------- */

export async function generateTrendIdeas(
  niche: string,
  opts: GenOpts = {},
): Promise<{ trends: TrendTopic[]; provider: string; disclaimer: string }> {
  const prompt = `Suggest 6 content angles currently worth testing in this niche: ${niche}.
You cannot measure live platform trends, so treat these as editorial ideas.
Return JSON: {"ideas":[{"topic":"...","reason":"why it may perform","confidence":0-100}]}
Do not fabricate percentages or claim live platform data.`;
  const { data, provider } = await structured<{ ideas: Array<{ topic: string; reason: string; confidence: number }> }>(
    prompt,
    opts,
    1400,
  );
  return {
    trends: (data.ideas ?? []).map((idea) => ({
      id: uid("trend"),
      topic: idea.topic,
      growth: Math.max(0, Math.min(100, Number(idea.confidence) || 0)),
      source: "live" as const,
      checkedAt: Date.now(),
      reason: idea.reason,
    })) as TrendTopic[],
    provider,
    disclaimer: "AI editorial ideas — not measured platform trend data.",
  };
}

/* ------------------------------ Calendar ------------------------------ */

export async function generateCalendarPlan(
  input: { niche: string; platform: string; posts?: number; startDate: string },
  opts: GenOpts = {},
): Promise<{ entries: CalendarEntry[]; provider: string }> {
  const prompt = `Plan ${input.posts ?? 7} content posts for ${input.platform} in the niche "${input.niche}".
Start date: ${input.startDate}
Return JSON: {"plan":[{"date":"YYYY-MM-DD","title":"...","type":"e.g. Reel, Tutorial, Listicle"}]}
Space posts across consecutive days starting at the given date. Titles must be specific, not placeholders.`;
  const { data, provider } = await structured<{ plan: Array<{ date: string; title: string; type: string }> }>(
    prompt,
    opts,
    1600,
  );
  const entries: CalendarEntry[] = (data.plan ?? []).map((item) => ({
    id: uid("cal"),
    date: item.date,
    title: item.title,
    platform: input.platform as CalendarEntry["platform"],
    type: item.type ?? "Post",
    status: "idea",
    createdAt: Date.now(),
  }));
  return { entries, provider };
}

export function formatAIError(err: unknown): string {
  if (typeof err === "object" && err && "message" in err) return String((err as AIError).message);
  return "Something went wrong.";
}
