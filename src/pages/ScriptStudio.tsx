import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Input, Panel, SectionHeader, Select, Textarea } from "@/components/ui/primitives";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { generateScript, formatAIError } from "@/lib/generation";
import { downloadText, timeAgo, truncate, uid } from "@/lib/utils";
import type { ScriptDoc } from "@/lib/types";

export default function ScriptStudio() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [duration, setDuration] = useState("45");
  const [referenceId, setReferenceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScriptDoc | null>(null);

  const scripts = useMemo(() => [...ws.scripts].sort((a, b) => b.createdAt - a.createdAt), [ws.scripts]);
  const active = useMemo(() => scripts.find((s) => s.id === activeId) ?? null, [scripts, activeId]);

  useEffect(() => {
    if (active) setDraft(active);
  }, [active]);

  const run = async () => {
    if (topic.trim().length < 8) {
      toast.push("Describe the video in at least a few words.", "error");
      return;
    }
    setBusy(true);
    try {
      const reference = ws.transcripts.find((t) => t.id === referenceId);
      const result = await generateScript(
        {
          topic,
          platform,
          duration: Number(duration) || 45,
          reference: reference?.segments.map((s) => s.text).join(" "),
        },
        { cloudApiBase: settings.cloudApiBase, brandVoice: settings.brandVoice },
      );
      mutateWorkspace((d) => {
        d.scripts.unshift(result.script);
      });
      setActiveId(result.script.id);
      setDraft(result.script);
      toast.push(`Script generated via ${result.provider} and saved.`, "success");
    } catch (err) {
      toast.push(formatAIError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => {
    if (!draft) return;
    mutateWorkspace((d) => {
      const idx = d.scripts.findIndex((s) => s.id === draft.id);
      if (idx >= 0) d.scripts[idx] = draft;
      else d.scripts.unshift(draft);
    });
    toast.push("Script saved.", "success");
  };

  const newScript = () => {
    const blank: ScriptDoc = {
      id: uid("script"),
      title: "Untitled script",
      format: "short",
      body: "",
      createdAt: Date.now(),
    };
    mutateWorkspace((d) => {
      d.scripts.unshift(blank);
    });
    setActiveId(blank.id);
    setDraft(blank);
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<FileText size={18} />}
        title="Script Studio"
        description="Generate original, shootable scripts. Reference a transcript for structure — never for copied wording."
        actions={<Button size="sm" variant="secondary" onClick={newScript}><Plus size={13} /> Blank script</Button>}
      />
      <ProviderHint feature="Script generation" />

      <div className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)_270px]">
        <Panel className="space-y-2.5 p-3.5">
          <SectionHeader icon={<Sparkles size={16} />} title="Generate" />
          <label className="block">
            <span className="label">Video idea</span>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. How I edit a viral short in 10 minutes with free tools"
              className="min-h-[80px] text-[12px]"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label">Platform</span>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-9 text-[11.5px]">
                {["TikTok", "Instagram Reels", "YouTube Shorts", "YouTube", "X", "Facebook"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="label">Seconds</span>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" className="h-9 text-[11.5px]" />
            </label>
          </div>
          <label className="block">
            <span className="label">Reference transcript (optional)</span>
            <Select value={referenceId} onChange={(e) => setReferenceId(e.target.value)} className="h-9 text-[11.5px]">
              <option value="">None</option>
              {ws.transcripts.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </Select>
          </label>
          <Button variant="primary" className="w-full" onClick={run} loading={busy}>
            <Sparkles size={14} /> Generate script
          </Button>
          <p className="text-[9.5px] leading-relaxed text-[#7c749f]">
            Output is original writing. Imported transcripts are used only as structural reference.
          </p>
        </Panel>

        <Panel className="min-h-[420px] p-3.5">
          {draft ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="h-9 max-w-[320px] flex-1 text-[13px] font-medium"
                  aria-label="Script title"
                />
                <Select
                  value={draft.format}
                  onChange={(e) => setDraft({ ...draft, format: e.target.value as ScriptDoc["format"] })}
                  className="h-9 w-24 text-[11px]"
                  aria-label="Format"
                >
                  <option value="short">Short</option>
                  <option value="reel">Reel</option>
                  <option value="long">Long</option>
                </Select>
                <div className="ml-auto flex gap-1.5">
                  <Button size="sm" onClick={saveDraft}><Save size={12} /> Save</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadText(`${draft.title}.md`, `# ${draft.title}\n\n${draft.hook ? `**Hook:** ${draft.hook}\n\n` : ""}${draft.body}${draft.cta ? `\n\n**CTA:** ${draft.cta}` : ""}`, "text/markdown")}
                  >
                    <Download size={12} /> Export
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-300"
                    onClick={() => {
                      if (!confirm("Delete this script?")) return;
                      mutateWorkspace((d) => {
                        d.scripts = d.scripts.filter((s) => s.id !== draft.id);
                      });
                      setDraft(null);
                      setActiveId(null);
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              {draft.hook && (
                <div className="mt-2 rounded-lg border border-brand-500/25 bg-brand-500/[0.07] p-2">
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider text-brand-300">Hook</p>
                  <Input
                    value={draft.hook}
                    onChange={(e) => setDraft({ ...draft, hook: e.target.value })}
                    className="mt-1 h-8 border-0 bg-transparent px-0 text-[12px]"
                  />
                </div>
              )}
              <Textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="Your script body…"
                className="mt-2 min-h-[300px] text-[12.5px] leading-relaxed"
              />
              <label className="mt-2 block">
                <span className="label">CTA</span>
                <Input value={draft.cta ?? ""} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} className="h-9 text-[12px]" />
              </label>
            </>
          ) : (
            <EmptyState
              icon={<FileText size={20} />}
              title="No script selected"
              description="Generate a script from an idea or reference transcript, or start from a blank document."
              action={<Button size="sm" variant="secondary" onClick={newScript}>Create blank script</Button>}
            />
          )}
        </Panel>

        <Panel className="p-3.5">
          <SectionHeader icon={<FileText size={16} />} title="Saved scripts" right={<Badge tone="neutral">{scripts.length}</Badge>} />
          <div className="mt-2 space-y-1.5">
            {scripts.length === 0 ? (
              <p className="text-[10.5px] leading-relaxed text-[#7c749f]">
                No scripts yet. Generated and saved scripts appear here.{" "}
                <Link to="/transcription" className="text-brand-300">Need a source? Transcribe first.</Link>
              </p>
            ) : (
              scripts.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={`w-full rounded-lg border p-2 text-left transition ${
                    activeId === s.id ? "border-brand-500/50 bg-brand-500/10" : "border-white/[0.06] bg-white/[0.02] hover:border-brand-500/30"
                  }`}
                >
                  <p className="truncate text-[11.5px] font-medium text-white">{s.title}</p>
                  <p className="mt-0.5 text-[9.5px] text-[#8e86b1]">{s.format} · {timeAgo(s.createdAt)}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] text-[#7c749f]">{truncate(s.body, 90)}</p>
                </button>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
