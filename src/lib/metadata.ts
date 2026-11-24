import { parseVideoUrl, youtubeId } from "./platforms";
import type { VideoMeta } from "./types";

const NOEMBED = "https://noembed.com/embed?url=";

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  error?: string;
  duration?: number;
}

/**
 * Fetch public oEmbed metadata for a supported URL.
 * This is metadata only — it never downloads media.
 */
export async function fetchVideoMetadata(rawUrl: string): Promise<VideoMeta> {
  const parsed = parseVideoUrl(rawUrl);
  if (!parsed.valid) throw new Error(parsed.reason ?? "Unsupported URL.");
  const url = parsed.normalized ?? rawUrl;
  const meta: VideoMeta = { title: "", platform: parsed.platform, sourceUrl: url };

  const tryOEmbed = async (endpoint: string): Promise<OEmbedResponse | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(endpoint, { signal: controller.signal, headers: { accept: "application/json" } });
      if (!res.ok) return null;
      return (await res.json()) as OEmbedResponse;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const noembed = await tryOEmbed(`${NOEMBED}${encodeURIComponent(url)}`);
  let data = noembed;
  if (!data?.title && parsed.platform.startsWith("youtube")) {
    data = await tryOEmbed(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
  }

  if (data?.title) {
    meta.title = data.title;
    meta.author = data.author_name;
    meta.thumbnail = data.thumbnail_url;
    if (typeof data.duration === "number") meta.duration = data.duration;
  }

  // YouTube thumbnails are deterministic even when oEmbed is unavailable.
  if (!meta.thumbnail) {
    const id = youtubeId(url);
    if (id) meta.thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }

  if (!meta.title) {
    meta.title = `${parsed.platformLabel} video`;
  }
  return meta;
}

export function aspectFor(platform: string): string {
  return platform === "youtube" || platform === "facebook" ? "16:9" : "9:16";
}
