import { useMemo, useState } from "react";
import { Clapperboard, Download, Film, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Input, Panel, SectionHeader, Select, Textarea } from "@/components/ui/primitives";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { generateStoryboard, formatAIError } from "@/lib/generation";
import { downloadText, timeAgo, uid } from "@/lib/utils";
import type { Storyboard as StoryboardType } from "@/lib/types";

export default function Storyboard() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const [idea, setIdea] = useState("");
  const [scenes, setScenes] = useState("6");
  const [duration, setDuration] = useState("45");
  const [referenceId, setReferenceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const boards = useMemo(() => [...ws.storyboards].sort((a, b) => b.createdAt - a.createdAt), [ws.storyboards]);
  const active = boards.find((b) => b.id === activeId) ?? boards[0] ?? null;

  const run = async () => {
    const reference = ws.transcripts.find((t) => t.id === referenceId);
    const source = reference ? `${idea}\n\nReference transcript:\n${reference.segments.map((s) => s.text).join(" ")}` : idea;
    if (source.trim().length < 10) {
      toast.push("Describe the video idea first.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await generateStoryboard(
        { idea: source, scenes: Number(scenes) || 6, duration: Number(duration) || 45 },
        { cloudApiBase: settings.cloudApiBase, brandVoice: settings.brandVoice },
      );
      const board: StoryboardType = {
        id: uid("board"),
        title: result.title,
        scenes: result.scenes,
        createdAt: Date.now(),
      };
      mutateWorkspace((d) => {
        d.storyboards.unshift(board);
      });
      setActiveId(board.id);
      toast.push(`Storyboard generated via ${result.provider}.`, "success");
    } catch (err) {
      toast.push(formatAIError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<Clapperboard size={18} />}
        title="Video Storyboard"
        description="Plan every shot with timecodes, voiceover and on-screen text before you film or edit."
      />
      <ProviderHint feature="Storyboard generation" />

      <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel className="space-y-2.5 p-3.5">
            <SectionHeader icon={<Sparkles size={16} />} title="Plan a video" />
            <label className="block">
              <span className="label">Idea</span>
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. A 45s reel showing three free AI tools that speed up editing"
                className="min-h-[84px] text-[12px]"
              />
            </label>
            <label className="block">
              <span className="label">Reference transcript (optional)</span>
              <Select value={referenceId} onChange={(e) => setReferenceId(e.target.value)} className="h-9 text-[11.5px]">
                <option value="">None</option>
                {ws.transcripts.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="label">Scenes</span>
                <Input value={scenes} onChange={(e) => setScenes(e.target.value)} inputMode="numeric" className="h-9 text-[11.5px]" />
              </label>
              <label className="block">
                <span className="label">Seconds</span>
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" className="h-9 text-[11.5px]" />
              </label>
            </div>
            <Button variant="primary" className="w-full" onClick={run} loading={busy}>
              <Clapperboard size={14} /> Generate storyboard
            </Button>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeader icon={<Film size={16} />} title="Saved boards" right={<Badge tone="neutral">{boards.length}</Badge>} />
            <div className="mt-2 space-y-1.5">
              {boards.length === 0 ? (
                <p className="text-[10.5px] text-[#7c749f]">No storyboards yet.</p>
              ) : (
                boards.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveId(b.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left ${
                      active?.id === b.id ? "border-brand-500/50 bg-brand-500/10" : "border-white/[0.06] bg-white/[0.02]"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-medium text-white">{b.title}</span>
                      <span className="text-[9.5px] text-[#8e86b1]">{b.scenes.length} scenes · {timeAgo(b.createdAt)}</span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Delete storyboard"
                      className="p-1 text-[#7c749f] hover:text-rose-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm("Delete this storyboard?")) return;
                        mutateWorkspace((d) => {
                          d.storyboards = d.storyboards.filter((x) => x.id !== b.id);
                        });
                      }}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
                    >
                      <Trash2 size={12} />
                    </span>
                  </button>
                ))
              )}
            </div>
          </Panel>
        </div>

        <Panel className="p-3.5">
          {!active ? (
            <EmptyState
              icon={<Clapperboard size={20} />}
              title="No storyboard selected"
              description="Generate a board to see shot-by-shot planning with timecodes and voiceover lines."
            />
          ) : (
            <>
              <SectionHeader
                icon={<Clapperboard size={16} />}
                title={active.title}
                subtitle={`${active.scenes.length} scenes`}
                right={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      downloadText(
                        `${active.title}.md`,
                        `# ${active.title}\n\n| # | Time | Visual | Voiceover | Overlay | Shot |\n|---|---|---|---|---|---|\n${active.scenes
                          .map((s) => `| ${s.index} | ${s.timecode} | ${s.visual} | ${s.voiceover} | ${s.textOverlay} | ${s.shot} |`)
                          .join("\n")}`,
                        "text/markdown",
                      )
                    }
                  >
                    <Download size={12} /> Export
                  </Button>
                }
              />
              <div className="mt-3 space-y-2">
                {active.scenes.map((scene) => (
                  <div key={scene.id} className="rounded-xl border border-[#2a1e4d] bg-[#080414]/60 p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">Scene {scene.index}</Badge>
                      <Badge tone="neutral">{scene.timecode}</Badge>
                      <span className="text-[10px] uppercase tracking-wide text-[#7c749f]">{scene.shot}</span>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[9.5px] font-semibold uppercase tracking-wider text-brand-300">Visual</p>
                        <p className="text-[11px] leading-relaxed text-[#d7d1ee]">{scene.visual}</p>
                      </div>
                      <div>
                        <p className="text-[9.5px] font-semibold uppercase tracking-wider text-emerald-300">Voiceover</p>
                        <p className="text-[11px] leading-relaxed text-[#d7d1ee]">{scene.voiceover}</p>
                      </div>
                    </div>
                    {scene.textOverlay && (
                      <div className="mt-1.5 rounded-md bg-white/[0.04] px-2 py-1 text-[10.5px] text-[#c2bbdd]">
                        On screen: <span className="text-white">{scene.textOverlay}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
