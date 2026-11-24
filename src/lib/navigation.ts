import {
  Brain,
  CalendarDays,
  Clapperboard,
  Cpu,
  FileAudio,
  FileText,
  Flame,
  FolderOpen,
  Image as ImageIcon,
  LayoutDashboard,
  Mic,
  Send,
  Settings2,
  Share2,
  TrendingUp,
  Video,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group: "workspace" | "create" | "grow" | "system";
  short?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, group: "workspace" },
  { to: "/transcription", label: "Transcription Studio", icon: FileAudio, group: "workspace", short: "Transcribe" },
  { to: "/analyser", label: "Viral Video Analyser", icon: Video, group: "workspace", short: "Analyse" },
  { to: "/content-intelligence", label: "Content Intelligence", icon: Brain, group: "workspace", short: "Insights" },
  { to: "/hooks", label: "Hook Generator", icon: Flame, group: "create" },
  { to: "/script-studio", label: "Script Studio", icon: FileText, group: "create", short: "Scripts" },
  { to: "/image-prompts", label: "Image Prompt Studio", icon: ImageIcon, group: "create" },
  { to: "/storyboard", label: "Video Storyboard", icon: Clapperboard, group: "create", short: "Storyboard" },
  { to: "/voiceover", label: "Voiceover Studio", icon: Mic, group: "create", short: "Voiceover" },
  { to: "/social", label: "Social Media Content", icon: Share2, group: "create" },
  { to: "/trends", label: "Trend Research", icon: TrendingUp, group: "grow", short: "Trends" },
  { to: "/calendar", label: "Content Calendar", icon: CalendarDays, group: "grow" },
  { to: "/automation", label: "Automation Workflows", icon: Workflow, group: "grow" },
  { to: "/social-command", label: "Social Media Command", icon: Send, group: "grow" },
  { to: "/library", label: "Project Library", icon: FolderOpen, group: "workspace", short: "Library" },
  { to: "/providers", label: "AI Providers", icon: Cpu, group: "system" },
  { to: "/settings", label: "Settings & Diagnostics", icon: Settings2, group: "system", short: "Settings" },
];

export const MOBILE_NAV = ["/", "/analyser", "/script-studio", "/library", "/settings"];

export function navLabel(path: string): string {
  return NAV_ITEMS.find((item) => item.to === path)?.label ?? "Dashboard";
}
