import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Download, Flame, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Input, Panel, SectionHeader, Select } from "@/components/ui/primitives";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useCopy } from "@/lib/hooks";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { generateHooks, formatAIError } from "@/lib/generation";
import { downloadText } from "@/lib/utils";
import type { HookIdea } from "@/lib/types";

const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "X", "Facebook"];

export default function Hooks() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const { copy } = useCopy();
  const [transcriptId, setTranscriptId] = useState(ws.transcripts[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [hooks, setHooks] = useState<HookIdea[]>([]);
  const [busy, setBusy] = useState(false);

  const transcript = useMemo(() => ws.transcripts.find((t) => t.id === transcriptId), [ws.transcripts, transcriptId]);
  const project = useMemo(() => ws.projects.find((p) => p.transcriptId === transcriptId), [ws.projects, transcriptId]);

  const run = async () => {
    const source = transcript ? transcript.segments.map((s) => s.text).join(" ") : topic;
    if (source.trim().length < 40) {
      toast.push("Choose a transcript or describe the content in at least a sentence.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await generateHooks(
        source,
        { title: transcript?.title ?? topic.slice(0, 70), platform },
        { cloudApiBase: settings.cloudApiBase, brandVoice: settings.brandVoice, platforms: [platform] },
      );
      setHooks(result.hooks);
      if (project) {
        mutateWorkspace((draft) => {
          const target = draft.projects.find((p) => p.id === project.id);
          if (target) {
            target.hooks = result.hooks;
            target.updatedAt = Date.now();
          }
        });
      }
      toast.push(`${result.hooks.length} hooks generated via ${result.provider}.`, "success");
    } catch (err) {
      toast.push(formatAIError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<Flame size={18} />}
        title="Hook Generator"
        description="Find the strongest opening from a real transcript, then generate platform-specific alternatives with reasoning."
      />
      <ProviderHint feature="Hook generation" />

      <div className="grid gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel className="space-y-2.5 p-3.5">
          <SectionHeader icon={<Flame size={16} />} title="Source" subtitle="Transcript is best — topics work too" />
          <label className="block">
            <span className="label">Transcript</span>
            <Select value={transcriptId} onChange={(e) => setTranscriptId(e.target.value)}>
              <option value="">No transcript — use topic</option>
              {ws.transcripts.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="label">Or describe your video</span>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 3 free AI tools that edit videos"
              disabled={Boolean(transcriptId)}
            />
          </label>
          <label className="block">
            <span className="label">Platform</span>
            <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </label>
          <Button variant="primary" className="w-full" onClick={run} loading={busy}>
            <Sparkles size={14} /> Generate hooks
          </Button>
          {project && <p className="text-[10px] text-[#7c749f]">Linked project: {project.title}</p>}
        </Panel>

        <Panel className="p-3.5">
          <SectionHeader
            icon={<Sparkles size={16} />}
            title="Hook options"
            right={
              hooks.length > 0 ? (
                <Button size="sm" variant="ghost" onClick={() => downloadText("hooks.txt", hooks.map((h) => `${h.hook}\n  → ${h.why}`).join("\n\n"))}>
                  <Download size={12} /> Export
                </Button>
              ) : undefined
            }
          />
          {hooks.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={<Flame size={18} />}
                title="No hooks yet"
                description={ws.transcripts.length ? "Pick a transcript and generate hooks. Each result explains why it works." : "Transcribe a video first for grounded hooks, or describe your idea above."}
                action={<Link to="/transcription" className="text-[11px] font-semibold text-brand-300">Open Transcription Studio →</Link>}
              />
            </div>
          ) : (
            <div className="mt-2.5 space-y-2">
              {hooks.map((hook, i) => (
                <div key={i} className="rounded-xl border border-[#2a1e4d] bg-[#080414]/60 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-medium leading-snug text-white">{hook.hook}</p>
                    <div className="flex items-center gap-1.5">
                      {typeof hook.score === "number" && <Badge tone="brand">{hook.score}</Badge>}
                      <button
                        type="button"
                        aria-label="Copy hook"
                        className="rounded p-1 text-[#8e86b1] hover:bg-white/10 hover:text-white"
                        onClick={async () => {
                          const ok = await copy(hook.hook);
                          toast.push(ok ? "Hook copied." : "Clipboard blocked by the browser.", ok ? "success" : "error");
                        }}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#8e86b1]">{hook.why}</p>
                  {hook.platform && <p className="mt-1 text-[9.5px] uppercase tracking-wide text-brand-300/80">{hook.platform}</p>}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
