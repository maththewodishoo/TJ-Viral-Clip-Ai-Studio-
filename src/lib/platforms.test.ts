import { describe, expect, it } from "vitest";
import { parseVideoUrl, isDirectMediaUrl, youtubeId } from "./platforms";

describe("parseVideoUrl", () => {
  it("detects standard YouTube watch URLs", () => {
    const result = parseVideoUrl("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
    expect(result.valid).toBe(true);
    expect(result.platform).toBe("youtube");
  });

  it("normalises youtu.be short links and extracts the id", () => {
    const result = parseVideoUrl("https://youtu.be/aqz-KE-bpKQ?t=10");
    expect(result.valid).toBe(true);
    expect(result.videoId).toBe("aqz-KE-bpKQ");
    expect(result.normalized).toBe("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
  });

  it("detects YouTube Shorts", () => {
    const result = parseVideoUrl("https://www.youtube.com/shorts/abc123");
    expect(result.valid).toBe(true);
    expect(result.platform).toBe("youtube-shorts");
  });

  it("detects TikTok, Instagram, Facebook and X", () => {
    expect(parseVideoUrl("https://www.tiktok.com/@user/video/123").platform).toBe("tiktok");
    expect(parseVideoUrl("https://www.instagram.com/reel/abc123/").platform).toBe("instagram");
    expect(parseVideoUrl("https://www.facebook.com/watch/?v=1").platform).toBe("facebook");
    expect(parseVideoUrl("https://x.com/user/status/123").platform).toBe("x");
  });

  it("rejects unsupported hosts and bad input", () => {
    expect(parseVideoUrl("https://vimeo.com/123").valid).toBe(false);
    expect(parseVideoUrl("not a url").valid).toBe(false);
    expect(parseVideoUrl("").valid).toBe(false);
    expect(parseVideoUrl("ftp://youtube.com/watch?v=1").valid).toBe(false);
    expect(parseVideoUrl("javascript:alert(1)").valid).toBe(false);
  });

  it("does not accept lookalike domains", () => {
    expect(parseVideoUrl("https://youtube.com.evil.example/watch?v=1").valid).toBe(false);
    expect(parseVideoUrl("https://nottiktok.com/video/1").valid).toBe(false);
  });
});

describe("helpers", () => {
  it("recognises direct media urls", () => {
    expect(isDirectMediaUrl("https://cdn.example.com/clip.mp4")).toBe(true);
    expect(isDirectMediaUrl("https://cdn.example.com/page.html")).toBe(false);
  });

  it("extracts YouTube ids from common shapes", () => {
    expect(youtubeId("https://www.youtube.com/shorts/xyz")).toBe("xyz");
    expect(youtubeId("https://www.youtube.com/live/xyz")).toBe("xyz");
    expect(youtubeId("https://www.youtube.com/watch?v=xyz&t=1")).toBe("xyz");
    expect(youtubeId("https://example.com")).toBeUndefined();
  });
});
