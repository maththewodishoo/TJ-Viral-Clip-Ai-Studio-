import type { Workspace } from "./types";

export type Range = "7D" | "30D" | "90D" | "1Y";
export const RANGES: Range[] = ["7D", "30D", "90D", "1Y"];

export interface WorkspaceStats {
  projects: number;
  videosAnalysed: number;
  transcripts: number;
  scripts: number;
  content: number;
}

export function deriveStats(ws: Workspace): WorkspaceStats {
  return {
    projects: ws.projects.length,
    videosAnalysed: ws.projects.filter((p) => Boolean(p.analysis) || Boolean(p.transcriptId)).length,
    transcripts: ws.transcripts.length,
    scripts: ws.scripts.length,
    content: ws.social.length + ws.images.length + ws.storyboards.length + ws.voiceovers.length,
  };
}

export interface SeriesPoint {
  label: string;
  projects: number;
  scripts: number;
  content: number;
}

const DAY = 86_400_000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function bucketKey(ts: number, range: Range): string {
  const d = new Date(ts);
  if (range === "7D" || range === "30D") return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (range === "90D") {
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.floor((d.getTime() - start.getTime()) / (7 * DAY));
    return `${d.getFullYear()}-w${week}`;
  }
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function labelFor(ts: number, range: Range): string {
  const d = new Date(ts);
  if (range === "7D" || range === "30D") return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  if (range === "90D") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { month: "short" });
}

/**
 * Build a real activity series from saved records.
 * Buckets: 7D/30D = daily, 90D = weekly, 1Y = monthly.
 */
export function buildSeries(ws: Workspace, range: Range, now = Date.now()): SeriesPoint[] {
  const days = range === "7D" ? 7 : range === "30D" ? 30 : range === "90D" ? 91 : 365;
  const from = startOfDay(now) - (days - 1) * DAY;
  const points: SeriesPoint[] = [];

  if (range === "7D" || range === "30D") {
    for (let i = 0; i < days; i++) {
      const ts = startOfDay(now) - (days - 1 - i) * DAY;
      points.push({ label: labelFor(ts, range), projects: 0, scripts: 0, content: 0 });
    }
  } else if (range === "90D") {
    for (let i = 12; i >= 0; i--) {
      const ts = startOfDay(now) - i * 7 * DAY;
      points.push({ label: labelFor(ts, range), projects: 0, scripts: 0, content: 0 });
    }
  } else {
    const current = new Date(now);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      points.push({ label: labelFor(d.getTime(), range), projects: 0, scripts: 0, content: 0 });
    }
  }

  const indexFor = (ts: number) => {
    if (ts < from) return -1;
    const key = bucketKey(ts, range);
    return points.findIndex((_, i) => {
      if (range === "7D" || range === "30D") {
        const pointTs = startOfDay(now) - (points.length - 1 - i) * DAY;
        return bucketKey(pointTs, range) === key;
      }
      if (range === "90D") {
        const pointTs = startOfDay(now) - (points.length - 1 - i) * 7 * DAY;
        return bucketKey(pointTs, range) === key;
      }
      const d = new Date(now);
      const month = new Date(d.getFullYear(), d.getMonth() - (points.length - 1 - i), 1);
      return bucketKey(month.getTime(), range) === key;
    });
  };

  const add = (ts: number, field: keyof Omit<SeriesPoint, "label">) => {
    const idx = indexFor(ts);
    if (idx >= 0) points[idx][field] += 1;
  };

  ws.projects.forEach((p) => add(p.createdAt, "projects"));
  ws.scripts.forEach((s) => add(s.createdAt, "scripts"));
  ws.social.forEach((s) => add(s.createdAt, "content"));
  ws.images.forEach((s) => add(s.createdAt, "content"));
  ws.storyboards.forEach((s) => add(s.createdAt, "content"));
  ws.voiceovers.forEach((s) => add(s.createdAt, "content"));

  return points;
}

export function hasSeriesData(points: SeriesPoint[]): boolean {
  return points.some((p) => p.projects + p.scripts + p.content > 0);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
