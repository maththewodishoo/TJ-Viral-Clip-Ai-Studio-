import { describe, expect, it } from "vitest";
import { parsePastedTranscript, toSrt, toTimestamp, toVtt } from "./srt";

describe("timestamps and subtitle export", () => {
  const segments = [
    { start: 0, end: 3.5, text: "First line" },
    { start: 3.5, end: 8.25, text: "Second line", speaker: "Speaker 1" },
  ];

  it("formats timestamps", () => {
    expect(toTimestamp(0)).toBe("00:00:00,000");
    expect(toTimestamp(3661.5)).toBe("01:01:01,500");
    expect(toTimestamp(3.5, false)).toBe("00:00:03.500");
  });

  it("creates valid SRT blocks", () => {
    const srt = toSrt(segments);
    expect(srt).toContain("1\n00:00:00,000 --> 00:00:03,500");
    expect(srt).toContain("2\n00:00:03,500 --> 00:00:08,250");
    expect(srt).toContain("Speaker 1: Second line");
    expect(srt.split("\n\n")).toHaveLength(2);
  });

  it("creates a WEBVTT header", () => {
    const vtt = toVtt(segments);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:00.000 --> 00:00:03.500");
  });
});

describe("parsePastedTranscript", () => {
  it("parses SRT blocks with exact timings", () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:04,000 --> 00:00:07,000
Second line`;
    const result = parsePastedTranscript(input);
    expect(result.approximate).toBe(false);
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toMatchObject({ start: 1, end: 4, text: "Hello world" });
  });

  it("parses bracketed timestamps", () => {
    const input = `[00:00] Opening hook
[00:05] Main point
[00:12] Call to action`;
    const result = parsePastedTranscript(input);
    expect(result.approximate).toBe(false);
    expect(result.segments).toHaveLength(3);
    expect(result.segments[1].start).toBe(5);
  });

  it("falls back to estimated timings for plain text", () => {
    const result = parsePastedTranscript("First sentence. Second sentence. Third one here.");
    expect(result.approximate).toBe(true);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.segments[0].start).toBe(0);
    expect(result.segments[1].start).toBe(4);
  });

  it("returns no segments for empty input", () => {
    expect(parsePastedTranscript("   ").segments).toHaveLength(0);
  });
});
