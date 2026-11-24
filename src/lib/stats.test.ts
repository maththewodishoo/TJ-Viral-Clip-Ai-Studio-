import { describe, expect, it } from "vitest";
import type { Workspace } from "./types";
import { buildSeries, deriveStats, percentChange, hasSeriesData, startOfDay } from "./stats";

const DAY = 86_400_000;

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    version: 1,
    projects: [],
    transcripts: [],
    scripts: [],
    images: [],
    storyboards: [],
    voiceovers: [],
    social: [],
    trends: [],
    calendar: [],
    workflows: [],
    commands: [],
    settings: { routing: {}, brandVoice: "", defaultAspect: "9:16", cloudApiBase: "" },
    onboardingDone: false,
    ...overrides,
  };
}

describe("deriveStats", () => {
  it("counts only real saved records", () => {
    const ws = makeWorkspace({
      projects: [
        {
          id: "p1",
          title: "A",
          platform: "youtube",
          kind: "analysis",
          status: "analysed",
          analysis: {
            summary: "",
            category: "",
            hookScore: 1,
            retentionScore: 1,
            emotionalTriggers: [],
            curiosityGaps: [],
            retentionTechniques: [],
            audience: "",
            callToAction: "",
            strengths: [],
            weaknesses: [],
            recommendations: [],
            disclaimer: "",
          },
          createdAt: 1,
          updatedAt: 1,
        },
        { id: "p2", title: "B", platform: "tiktok", kind: "analysis", status: "draft", createdAt: 1, updatedAt: 1 },
      ],
      transcripts: [{ id: "t1", title: "T", segments: [], createdAt: 1 }],
      scripts: [{ id: "s1", title: "S", format: "short", body: "", createdAt: 1 }],
      social: [{ id: "so1", platform: "tiktok", title: "Post", caption: "", hashtags: [], createdAt: 1 }],
    });
    const stats = deriveStats(ws);
    expect(stats.projects).toBe(2);
    expect(stats.videosAnalysed).toBe(1);
    expect(stats.transcripts).toBe(1);
    expect(stats.scripts).toBe(1);
    expect(stats.content).toBe(1);
  });

  it("returns zeroes for an empty workspace", () => {
    expect(deriveStats(makeWorkspace())).toEqual({
      projects: 0,
      videosAnalysed: 0,
      transcripts: 0,
      scripts: 0,
      content: 0,
    });
  });
});

describe("buildSeries", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();

  it("creates the correct bucket counts", () => {
    expect(buildSeries(makeWorkspace(), "7D", now)).toHaveLength(7);
    expect(buildSeries(makeWorkspace(), "30D", now)).toHaveLength(30);
    expect(buildSeries(makeWorkspace(), "90D", now)).toHaveLength(13);
    expect(buildSeries(makeWorkspace(), "1Y", now)).toHaveLength(12);
  });

  it("places saved items in the right buckets without inventing data", () => {
    const today = startOfDay(now);
    const ws = makeWorkspace({
      projects: [{ id: "p1", title: "A", platform: "youtube", kind: "analysis", status: "draft", createdAt: today, updatedAt: today }],
      scripts: [{ id: "s1", title: "S", format: "short", body: "", createdAt: today - DAY }],
    });
    const series = buildSeries(ws, "7D", now);
    expect(hasSeriesData(series)).toBe(true);
    expect(series[series.length - 1].projects).toBe(1);
    expect(series[series.length - 2].scripts).toBe(1);
    const total = series.reduce((sum, p) => sum + p.projects + p.scripts + p.content, 0);
    expect(total).toBe(2);
  });

  it("ignores records older than the range", () => {
    const old = now - 400 * DAY;
    const ws = makeWorkspace({
      projects: [{ id: "p1", title: "Old", platform: "youtube", kind: "analysis", status: "draft", createdAt: old, updatedAt: old }],
    });
    const series = buildSeries(ws, "30D", now);
    expect(hasSeriesData(series)).toBe(false);
  });

  it("hasSeriesData is false for empty workspaces", () => {
    expect(hasSeriesData(buildSeries(makeWorkspace(), "7D", now))).toBe(false);
  });
});

describe("percentChange", () => {
  it("handles growth, decline and no previous data", () => {
    expect(percentChange(10, 5)).toBe(100);
    expect(percentChange(5, 10)).toBe(-50);
    expect(percentChange(0, 0)).toBeNull();
    expect(percentChange(2, 0)).toBe(100);
  });
});
