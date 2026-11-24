import { useSyncExternalStore } from "react";
import type { Settings, Workspace } from "./types";

const STORAGE_KEY = "tjv.studio.workspace.v1";

function emptyWorkspace(): Workspace {
  return {
    version: 1,
    projects: [],
    transcripts: [],
    scripts: [],
    images: [],
    storyboards: [],
    voiceovers: [],
    social: [],
    trends: [
      { id: "t1", topic: "AI tools for creators", growth: 245, source: "sample", checkedAt: Date.now() },
      { id: "t2", topic: "Healthy living tips", growth: 198, source: "sample", checkedAt: Date.now() },
      { id: "t3", topic: "Travel on a budget", growth: 176, source: "sample", checkedAt: Date.now() },
      { id: "t4", topic: "Digital marketing", growth: 162, source: "sample", checkedAt: Date.now() },
      { id: "t5", topic: "Self improvement", growth: 135, source: "sample", checkedAt: Date.now() },
    ],
    calendar: [],
    workflows: [],
    commands: [],
    settings: {
      routing: {},
      brandVoice: "Clear, energetic and useful. No hype that the footage cannot support.",
      defaultAspect: "9:16",
      cloudApiBase: "",
    },
    onboardingDone: false,
  };
}

function migrate(raw: unknown): Workspace {
  const base = emptyWorkspace();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<Workspace>;
  return {
    ...base,
    ...data,
    version: 1,
    settings: { ...base.settings, ...(data.settings ?? {}) },
    projects: Array.isArray(data.projects) ? data.projects : [],
    transcripts: Array.isArray(data.transcripts) ? data.transcripts : [],
    scripts: Array.isArray(data.scripts) ? data.scripts : [],
    images: Array.isArray(data.images) ? data.images : [],
    storyboards: Array.isArray(data.storyboards) ? data.storyboards : [],
    voiceovers: Array.isArray(data.voiceovers) ? data.voiceovers : [],
    social: Array.isArray(data.social) ? data.social : [],
    calendar: Array.isArray(data.calendar) ? data.calendar : [],
    workflows: Array.isArray(data.workflows) ? data.workflows : [],
    commands: Array.isArray(data.commands) ? data.commands : [],
    trends: Array.isArray(data.trends) && data.trends.length ? data.trends : base.trends,
  };
}

function load(): Workspace {
  if (typeof window === "undefined") return emptyWorkspace();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyWorkspace();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyWorkspace();
  }
}

let state: Workspace = load();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Could not persist workspace", err);
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Workspace {
  return state;
}

/** Apply a mutation to a draft copy and persist. */
export function mutateWorkspace(mutator: (draft: Workspace) => void) {
  const draft: Workspace = JSON.parse(JSON.stringify(state));
  mutator(draft);
  state = draft;
  persist();
  emit();
}

export function useWorkspace(): Workspace {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSettings(): Settings {
  return useWorkspace().settings;
}

export function updateSettings(patch: Partial<Settings>) {
  mutateWorkspace((draft) => {
    draft.settings = { ...draft.settings, ...patch };
  });
}

export function resetWorkspace() {
  state = emptyWorkspace();
  persist();
  emit();
}

/** Restore illustrative demo content, clearly flagged as sample data. */
export function loadSampleWorkspace() {
  const now = Date.now();
  const day = 86_400_000;
  const base = emptyWorkspace();
  mutateWorkspace((draft) => {
    draft.projects = [
      {
        id: "demo_1",
        title: "Travel Vlog Adventure",
        platform: "youtube",
        kind: "analysis",
        sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        thumbnail: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
        status: "analysed",
        createdAt: now - 2 * day,
        updatedAt: now - 2 * day,
      },
      {
        id: "demo_2",
        title: "AI Productivity Tips",
        platform: "tiktok",
        kind: "analysis",
        status: "ready",
        createdAt: now - 5 * day,
        updatedAt: now - 5 * day,
      },
      {
        id: "demo_3",
        title: "Healthy Lifestyle Guide",
        platform: "instagram",
        kind: "analysis",
        status: "draft",
        createdAt: now - 8 * day,
        updatedAt: now - 8 * day,
      },
    ];
    draft.scripts = [
      {
        id: "demo_s1",
        title: "3 AI tools that save me 5 hours",
        format: "short",
        body: "Hook: I replaced three apps with one workflow.\n\nBeat 1...",
        createdAt: now - 1 * day,
      },
    ];
    draft.social = [
      {
        id: "demo_p1",
        platform: "tiktok",
        title: "AI workflow teaser",
        caption: "Three tools, one hour saved every day.",
        hashtags: ["#aitools", "#productivity"],
        createdAt: now - 3 * day,
      },
    ];
    draft.transcripts = [];
    draft.trends = base.trends;
    draft.onboardingDone = true;
  });
}
