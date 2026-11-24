export type Platform = "youtube" | "youtube-shorts" | "tiktok" | "instagram" | "facebook" | "x" | "other";

export interface VideoMeta {
  title: string;
  platform: Platform;
  sourceUrl: string;
  thumbnail?: string;
  author?: string;
  duration?: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface Transcript {
  id: string;
  title: string;
  segments: TranscriptSegment[];
  language?: string;
  provider?: string;
  sourceUrl?: string;
  duration?: number;
  createdAt: number;
}

export interface HookIdea {
  hook: string;
  why: string;
  platform?: string;
  score?: number;
}

export interface ClipSuggestion {
  id: string;
  start: number;
  end: number;
  title: string;
  reason: string;
  caption: string;
}

export interface ViralityReport {
  summary: string;
  category: string;
  hookScore: number;
  retentionScore: number;
  emotionalTriggers: string[];
  curiosityGaps: string[];
  retentionTechniques: string[];
  audience: string;
  callToAction: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  disclaimer: string;
}

export type ProjectStatus = "draft" | "transcribed" | "analysed" | "ready";

export interface Project {
  id: string;
  title: string;
  platform: Platform;
  kind: "analysis" | "script" | "image" | "storyboard" | "voiceover" | "social";
  sourceUrl?: string;
  thumbnail?: string;
  author?: string;
  duration?: number;
  status: ProjectStatus;
  transcriptId?: string;
  analysis?: ViralityReport;
  hooks?: HookIdea[];
  clips?: ClipSuggestion[];
  provider?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScriptDoc {
  id: string;
  projectId?: string;
  title: string;
  format: "short" | "reel" | "long";
  hook?: string;
  body: string;
  cta?: string;
  platform?: Platform;
  createdAt: number;
}

export interface ImagePrompt {
  id: string;
  prompt: string;
  style?: string;
  aspect?: string;
  negative?: string;
  projectId?: string;
  createdAt: number;
}

export interface StoryboardScene {
  id: string;
  index: number;
  timecode: string;
  visual: string;
  voiceover: string;
  textOverlay: string;
  shot: string;
}

export interface Storyboard {
  id: string;
  title: string;
  scenes: StoryboardScene[];
  projectId?: string;
  createdAt: number;
}

export interface Voiceover {
  id: string;
  title: string;
  script: string;
  voice?: string;
  pace?: string;
  duration?: string;
  projectId?: string;
  createdAt: number;
}

export interface SocialPost {
  id: string;
  platform: Platform;
  title: string;
  caption: string;
  hashtags: string[];
  thumbnailConcept?: string;
  projectId?: string;
  createdAt: number;
}

export interface TrendTopic {
  id: string;
  topic: string;
  growth: number;
  source: "live" | "sample";
  checkedAt: number;
}

export interface CalendarEntry {
  id: string;
  date: string;
  title: string;
  platform: Platform;
  type: string;
  status: "idea" | "draft" | "scheduled" | "published";
  createdAt: number;
}

export interface WorkflowStep {
  id: string;
  action: string;
  detail: string;
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: WorkflowStep[];
  enabled: boolean;
  createdAt: number;
}

export interface CommandItem {
  id: string;
  platform: Platform;
  title: string;
  scheduledFor?: string;
  status: "queued" | "scheduled" | "published";
  createdAt: number;
}

export type AIFeature = "text" | "analysis" | "transcription" | "image" | "speech";

export interface Settings {
  routing: Partial<Record<AIFeature, string>>;
  brandVoice: string;
  defaultAspect: string;
  cloudApiBase: string;
}

export interface Workspace {
  version: 1;
  projects: Project[];
  transcripts: Transcript[];
  scripts: ScriptDoc[];
  images: ImagePrompt[];
  storyboards: Storyboard[];
  voiceovers: Voiceover[];
  social: SocialPost[];
  trends: TrendTopic[];
  calendar: CalendarEntry[];
  workflows: Workflow[];
  commands: CommandItem[];
  settings: Settings;
  onboardingDone: boolean;
}
