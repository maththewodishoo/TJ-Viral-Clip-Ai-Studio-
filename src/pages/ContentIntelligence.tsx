import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Sparkles, Target, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Panel, Progress, SectionHeader, Select } from "@/components/ui/primitives";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { analyseTranscript, AIError } from "@/lib/ai";
import { PLATFORM_LABEL } from "@/lib/platforms";
import { formatDuration } from "@/lib/utils";
import type { ViralityReport } from "@/lib/types";

export default function ContentIntelligence() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const [transcriptId, setTranscriptId] = useState(ws.transcripts[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ViralityReport | null>(null);

  const transcript = useMemo(() => ws.transcripts.find((t) => t.id === transcriptId), [ws.transcripts, transcriptId]);
  const project = useMemo(
    () => ws.projects.find((p) => p.transcriptId === transcriptId),
    [ws.projects, transcriptId],
  );

  const run = async () => {
    if (!transcript) return;
    setBusy(true);
    try {
      const result = await analyseTranscript(
        transcript.segments.map((s) => s.text).join(" "),
        { title: transcript.title, platform: project ? PLATFORM_LABEL[project.platform] : "short-form", duration: transcript.duration },
        { cloudApiBase: settings.cloudApiBase },
      );
      setReport(result.report);
      if (project) {
        mutateWorkspace((draft) => {
          const target = draft.projects.find((p) => p.id === project.id);
          if (target) {
            target.analysis = result.report;
            target.status = "analysed";
            target.updatedAt = Date.now();
          }
        });
      }
      toast.push(`Analysis saved via ${result.provider}.`, "success");
    } catch (err) {
      toast.push(err instanceof AIError ? err.message : "Analysis failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<Brain size={18} />}
        title="Content Intelligence"
        description="Editorial analysis of structure, hooks, retention and emotional signals — grounded in a transcript you own."
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1 sm:max-w-sm">
          <Select value={transcriptId} onChange={(e) => { setTranscriptId(e.target.value); setReport(null); }} aria-label="Transcript">
            <option value="">Select a transcript…</option>
            {ws.transcripts.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="primary" onClick={run} loading={busy} disabled={!transcript}>
          <Sparkles size={14} /> Analyse transcript
        </Button>
      </div>

      <ProviderHint feature="Analysis" />

      {!transcript ? (
        <Panel className="p-4">
          <EmptyState
            icon={<Brain size={20} />}
            title="No transcript selected"
            description="Transcribe a video in the Transcription Studio, then return here for a full intelligence report."
            action={<Link to="/transcription" className="text-[11.5px] font-semibold text-brand-300">Open Transcription Studio →</Link>}
          />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Panel className="p-3.5">
            <SectionHeader
              icon={<Brain size={16} />}
              title={transcript.title}
              subtitle={`${transcript.segments.length} segments · ${formatDuration(transcript.duration)} · ${transcript.language ?? "language unknown"}`}
              right={<Badge tone="brand">{transcript.provider ?? "saved"}</Badge>}
            />
            <div className="mt-2.5 max-h-[430px] space-y-1.5 overflow-y-auto pr-1">
              {transcript.segments.map((s, i) => (
                <p key={i} className="text-[11.5px] leading-relaxed text-[#b6aed6]">
                  <span className="mr-1.5 font-mono text-[9.5px] text-brand-300">{formatDuration(s.start)}</span>
                  {s.text}
                </p>
              ))}
            </div>
          </Panel>

          <div className="space-y-3">
            {!report ? (
              <Panel className="p-4">
                <EmptyState
                  icon={<Sparkles size={20} />}
                  title="No analysis yet"
                  description="Run the analysis to see hook strength, retention design and concrete edits. Results are saved to the linked project."
                />
              </Panel>
            ) : (
              <>
                <Panel className="p-3.5">
                  <SectionHeader icon={<Zap size={16} />} title="Scores" subtitle="Editorial estimates, not predictions" />
                  <div className="mt-3 space-y-3">
                    {[
                      ["Hook strength", report.hookScore],
                      ["Retention design", report.retentionScore],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#a29ac4]">{label}</span>
                          <span className="font-semibold text-white">{value}/100</span>
                        </div>
                        <Progress value={Number(value)} className="mt-1.5" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10.5px]">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                      <p className="text-[#7c749f]">Category</p>
                      <p className="mt-0.5 text-white">{report.category}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                      <p className="text-[#7c749f]">Call to action</p>
                      <p className="mt-0.5 text-white">{report.callToAction}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[11.5px] leading-relaxed text-[#d7d1ee]">{report.summary}</p>
                </Panel>

                <Panel className="p-3.5">
                  <SectionHeader icon={<Target size={16} />} title="Signals" />
                  <div className="mt-2 space-y-2.5 text-[11px]">
                    {[
                      ["Emotional triggers", report.emotionalTriggers],
                      ["Curiosity gaps", report.curiosityGaps],
                      ["Retention techniques", report.retentionTechniques],
                      ["Audience", [report.audience]],
                      ["Recommendations", report.recommendations],
                    ].map(([label, values]) => (
                      <div key={String(label)}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-300">{label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(values as string[]).map((v, i) => (
                            <span key={i} className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10.5px] text-[#c2bbdd]">
                              {v}
                            </span>
                          ))}
                          {!(values as string[]).length && <span className="text-[#7c749f]">None identified.</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[9.5px] leading-relaxed text-[#6f679a]">{report.disclaimer}</p>
                </Panel>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
