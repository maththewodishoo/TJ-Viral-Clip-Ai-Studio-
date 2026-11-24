import { FolderOpen, FileAudio, FileText, Sparkles, Video } from "lucide-react";
import type { Workspace } from "@/lib/types";
import { deriveStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

function recentDelta(timestamps: number[]): number | null {
  const now = Date.now();
  const current = timestamps.filter((t) => t > now - 30 * DAY).length;
  const previous = timestamps.filter((t) => t > now - 60 * DAY && t <= now - 30 * DAY).length;
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function StatsRow({ ws }: { ws: Workspace }) {
  const stats = deriveStats(ws);
  const cards = [
    {
      label: "Projects",
      value: stats.projects,
      icon: FolderOpen,
      tile: "from-[#7c3aed] to-[#a855f7]",
      delta: recentDelta(ws.projects.map((p) => p.createdAt)),
    },
    {
      label: "Videos Analysed",
      value: stats.videosAnalysed,
      icon: Video,
      tile: "from-[#2563eb] to-[#38bdf8]",
      delta: recentDelta(ws.projects.filter((p) => p.analysis || p.transcriptId).map((p) => p.createdAt)),
    },
    {
      label: "Transcripts",
      value: stats.transcripts,
      icon: FileAudio,
      tile: "from-[#059669] to-[#34d399]",
      delta: recentDelta(ws.transcripts.map((t) => t.createdAt)),
    },
    {
      label: "Scripts Generated",
      value: stats.scripts,
      icon: FileText,
      tile: "from-[#ea580c] to-[#fbbf24]",
      delta: recentDelta(ws.scripts.map((s) => s.createdAt)),
    },
    {
      label: "Content Created",
      value: stats.content,
      icon: Sparkles,
      tile: "from-[#db2777] to-[#f472b6]",
      delta: recentDelta([
        ...ws.social.map((s) => s.createdAt),
        ...ws.images.map((s) => s.createdAt),
        ...ws.storyboards.map((s) => s.createdAt),
        ...ws.voiceovers.map((s) => s.createdAt),
      ]),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="panel panel-hover flex items-center gap-2.5 p-3">
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-[0_8px_18px_-12px_rgba(0,0,0,0.9)]",
              card.tile,
            )}
          >
            <card.icon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-1">
              <p className="text-[19px] font-bold leading-none text-white">{card.value}</p>
              {card.delta !== null && (
                <span
                  className={cn(
                    "text-[9.5px] font-semibold",
                    card.delta >= 0 ? "text-emerald-400" : "text-rose-400",
                  )}
                  title="New items in the last 30 days vs the previous 30 days"
                >
                  {card.delta >= 0 ? "+" : ""}
                  {card.delta}%
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-[10.5px] leading-tight text-[#9a92bd]">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
