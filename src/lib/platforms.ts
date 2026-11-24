import type { Platform } from "./types";

interface PlatformRule {
  platform: Platform;
  label: string;
  hosts: string[];
  pathPatterns?: RegExp[];
  color: string;
}

export const PLATFORM_RULES: PlatformRule[] = [
  {
    platform: "youtube",
    label: "YouTube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"],
    color: "#ef4444",
  },
  {
    platform: "youtube-shorts",
    label: "YouTube Shorts",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
    pathPatterns: [/\/shorts\//],
    color: "#f87171",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    hosts: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
    color: "#22d3ee",
  },
  {
    platform: "instagram",
    label: "Instagram",
    hosts: ["instagram.com", "www.instagram.com", "instagr.am"],
    color: "#e1306c",
  },
  {
    platform: "facebook",
    label: "Facebook",
    hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch", "fb.com"],
    color: "#3b82f6",
  },
  {
    platform: "x",
    label: "X / Twitter",
    hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "t.co"],
    color: "#a3a3a3",
  },
];

export const PLATFORM_LABEL: Record<Platform, string> = {
  youtube: "YouTube",
  "youtube-shorts": "YouTube Shorts",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X / Twitter",
  other: "Other",
};

export interface ParsedVideoUrl {
  valid: boolean;
  platform: Platform;
  platformLabel: string;
  normalized?: string;
  videoId?: string;
  reason?: string;
}

/** Validate an http(s) URL with the platform detection rules. */
export function parseVideoUrl(raw: string): ParsedVideoUrl {
  const input = raw.trim();
  if (!input) {
    return { valid: false, platform: "other", platformLabel: "Unknown", reason: "Paste a video URL first." };
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { valid: false, platform: "other", platformLabel: "Unknown", reason: "That is not a valid URL." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return {
      valid: false,
      platform: "other",
      platformLabel: "Unknown",
      reason: "Only http and https URLs are supported.",
    };
  }
  const host = url.hostname.toLowerCase();
  const candidates = PLATFORM_RULES.filter((rule) => rule.hosts.includes(host));
  if (candidates.length === 0) {
    return {
      valid: false,
      platform: "other",
      platformLabel: "Unsupported",
      reason: "Unsupported platform. Use YouTube, TikTok, Instagram, Facebook or X.",
    };
  }
  const matched =
    candidates.find((rule) => rule.pathPatterns?.some((p) => p.test(url.pathname))) ??
    candidates.find((rule) => !rule.pathPatterns) ??
    candidates[0];

  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    if (!id) {
      return { valid: false, platform: matched.platform, platformLabel: matched.label, reason: "Missing YouTube video id." };
    }
    return {
      valid: true,
      platform: matched.platform,
      platformLabel: matched.label,
      normalized: `https://www.youtube.com/watch?v=${id}`,
      videoId: id,
    };
  }

  return {
    valid: true,
    platform: matched.platform,
    platformLabel: matched.label,
    normalized: url.toString(),
  };
}

export function isDirectMediaUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return /\.(mp4|mov|webm|m4a|mp3|wav|mpeg|mpga)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

/** Extract a YouTube video id from any common URL shape. */
export function youtubeId(raw: string): string | undefined {
  try {
    const url = new URL(raw);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] || undefined;
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2];
    if (url.pathname.startsWith("/live/")) return url.pathname.split("/")[2];
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2];
    return url.searchParams.get("v") ?? undefined;
  } catch {
    return undefined;
  }
}
