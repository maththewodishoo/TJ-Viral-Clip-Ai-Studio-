import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Film,
  Flame,
  RefreshCw,
  Scissors,
  ShieldAlert,
  Sparkles,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Input, Panel, Progress, SectionHeader, Spinner, Textarea } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { TranscriptWorkbench } from "@/components/TranscriptWorkbench";
import { ProviderHint } from "@/components/ProviderHint";
import { fetchVideoMetadata } from "@/lib/metadata";
import { parseVideoUrl, PLATFORM_LABEL } from "@/lib/platforms";
import { analyseTranscript, AIError } from "@/lib/ai";
import { findClips, generateHooks } from "@/lib/generation";
import { getSnapshot, mutateWorkspace, useSettings, useWorkspace } from "@/lib/store";
import { downloadText, formatDuration, timeAgo, uid } from "@/lib/utils";
import type { ClipSuggestion, HookIdea, Transcript, VideoMeta, ViralityReport } from "@/lib/types";

interface Step {
  key: string;
  label: string;
  state: "done" | "active" | "blocked" | "idle";
  detail: string;
}

function scoreTone(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 45) return "text-amber-300";
  return "text-rose-300";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#a29ac4]">{label}</span>
        <span className={`font-semibold ${scoreTone(value)}`}>{value}/100</span>
      </div>
      <Progress value={value} className="mt-1.5" />
    </div>
  );
}

export default function Analyser() {
  const [params] = useSearchParams();
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();

  const [urlInput, setUrlInput] = useState(params.get("url") ?? "");
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [metaState, setMetaState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [metaError, setMetaError] = useState("");
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [report, setReport] = useState<ViralityReport | null>(null);
  const [clips, setClips] = useState<ClipSuggestion[]>([]);
  const [hooks, setHooks] = useState<HookIdea[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [hookBusy, setHookBusy] = useState(false);
  const [clipBusy, setClipBusy] = useState(false);
  const [clipDialog, setClipDialog] = useState<ClipSuggestion | null>(null);

  const lookup = useCallback(
    async (url: string) => {
      const parsed = parseVideoUrl(url);
      if (!parsed.valid) {
        setMetaState("error");
        setMetaError(parsed.reason ?? "Unsupported URL.");
        return;
      }
      setMetaState("loading");
      setMetaError("");
      setReport(null);
      setClips([]);
      setHooks([]);
      setTranscript(null);
      try {
        const fetched = await fetchVideoMetadata(url);
        setMeta(fetched);
        setMetaState("ok");
        const existing = getSnapshot().projects.find((p) => p.sourceUrl === fetched.sourceUrl);
        if (existing) {
          setProjectId(existing.id);
          setReport(existing.analysis ?? null);
          setClips(existing.clips ?? []);
          setHooks(existing.hooks ?? []);
        } else {
          const id = uid("proj");
          mutateWorkspace((draft) => {
            draft.projects.unshift({
              id,
              title: fetched.title,
              platform: fetched.platform,
              kind: "analysis",
              sourceUrl: fetched.sourceUrl,
              thumbnail: fetched.thumbnail,
              author: fetched.author,
              duration: fetched.duration,
              status: "draft",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          });
          setProjectId(id);
        }
      } catch (err) {
        setMetaState("error");
        setMetaError(err instanceof Error ? err.message : "Metadata lookup failed.");
      }
    },
    [],
  );

  const paramUrl = params.get("url") ?? "";
  useEffect(() => {
    if (paramUrl) void lookup(paramUrl);
  }, [paramUrl, lookup]);

  useEffect(() => {
    if (!projectId) return;
    const project = ws.projects.find((p) => p.id === projectId);
    if (!project?.transcriptId) return;
    const stored = ws.transcripts.find((t) => t.id === project.transcriptId);
    if (stored && !transcript) {
      setTranscript(stored);
      setReport(project.analysis ?? null);
      setClips(project.clips ?? []);
      setHooks(project.hooks ?? []);
    }
  }, [projectId, ws, transcript]);

  const saveProjectPatch = (patch: { analysis?: ViralityReport; clips?: ClipSuggestion[]; hooks?: HookIdea[]; provider?: string }) => {
    if (!projectId) return;
    mutateWorkspace((draft) => {
      const project = draft.projects.find((p) => p.id === projectId);
      if (!project) return;
      Object.assign(project, patch);
      if (patch.analysis) project.status = "analysed";
      project.updatedAt = Date.now();
    });
  };

  const transcriptText = useMemo(
    () => (transcript ? transcript.segments.map((s) => s.text).join(" ") : ""),
    [transcript],
  );

  const runAnalysis = async () => {
    if (!transcript) {
      toast.push("Add a transcript first — analysis cannot be generated from a URL alone.", "error");
      return;
    }
    if (!meta) return;
    setAnalysisBusy(true);
    try {
      const result = await analyseTranscript(
        transcriptText,
        { title: meta.title, platform: PLATFORM_LABEL[meta.platform], duration: transcript.duration ?? meta.duration },
        { cloudApiBase: settings.cloudApiBase },
      );
      setReport(result.report);
      saveProjectPatch({ analysis: result.report, provider: result.provider });
      toast.push(`Analysis complete via ${result.provider}.`, "success");
    } catch (err) {
      toast.push(err instanceof AIError ? err.message : "Analysis failed.", "error");
    } finally {
      setAnalysisBusy(false);
    }
  };

  const runHooks = async () => {
    if (!transcript || !meta) return;
    setHookBusy(true);
    try {
      const result = await generateHooks(transcriptText, { title: meta.title, platform: PLATFORM_LABEL[meta.platform] }, {
        cloudApiBase: settings.cloudApiBase,
        brandVoice: settings.brandVoice,
      });
      setHooks(result.hooks);
      saveProjectPatch({ hooks: result.hooks });
      toast.push(`${result.hooks.length} hooks generated.`, "success");
    } catch (err) {
      toast.push(err instanceof AIError ? err.message : "Hook generation failed.", "error");
    } finally {
      setHookBusy(false);
    }
  };

  const runClips = async () => {
    if (!transcript || !meta) return;
    setClipBusy(true);
    try {
      const result = await findClips(transcript.segments, { title: meta.title, duration: transcript.duration }, {
        cloudApiBase: settings.cloudApiBase,
      });
      setClips(result.clips);
      saveProjectPatch({ clips: result.clips });
      toast.push(`${result.clips.length} clip candidates found.`, "success");
    } catch (err) {
      toast.push(err instanceof AIError ? err.message : "Clip finding failed.", "error");
    } finally {
      setClipBusy(false);
    }
  };

  const steps: Step[] = [
    { key: "url", label: "Validate URL", state: metaState === "error" ? "blocked" : meta || metaState === "loading" ? "done" : "idle", detail: metaState === "error" ? metaError : "Format and host checked" },
    { key: "platform", label: "Detect platform", state: meta ? "done" : "idle", detail: meta ? PLATFORM_LABEL[meta.platform] : "Waiting for a URL" },
    { key: "meta", label: "Retrieve metadata", state: metaState === "loading" ? "active" : metaState === "ok" ? "done" : metaState === "error" ? "blocked" : "idle", detail: metaState === "loading" ? "Calling public oEmbed endpoint…" : meta ? "Title and thumbnail fetched" : "Public oEmbed only" },
    { key: "media", label: "Extract media", state: "blocked", detail: "Not done in-browser — upload the file" },
    { key: "transcript", label: "Transcript", state: transcript ? "done" : "idle", detail: transcript ? `${transcript.segments.length} segments` : "Upload or paste below" },
    { key: "analysis", label: "Viral analysis", state: report ? "done" : analysisBusy ? "active" : "idle", detail: report ? `${report.category} · hook ${report.hookScore}/100` : "Requires a transcript" },
  ];

  const history = [...ws.projects].filter((p) => p.sourceUrl).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<Video size={18} />}
        title="Viral Video Analyser"
        description="Paste a public video URL to fetch metadata, transcribe the media and generate a grounded analysis, hooks and clip candidates."
        actions={
          <Button variant="secondary" size="sm" onClick={() => meta && void lookup(meta.sourceUrl)} disabled={!meta || metaState === "loading"}>
            <RefreshCw size={13} /> Retry metadata
          </Button>
        }
      />

      <Panel className="p-3.5 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void lookup(urlInput)}
            placeholder="Paste your YouTube, TikTok, Instagram Reels, Facebook or X video URL…"
            aria-label="Video URL"
            className="h-11 flex-1 text-[12.5px]"
          />
          <Button variant="primary" onClick={() => void lookup(urlInput)} loading={metaState === "loading"} className="h-11 px-5">
            Analyse Video
          </Button>
        </div>
        {metaState === "error" && <p className="mt-2 text-[11px] text-rose-300">{metaError}</p>}
        {metaState !== "error" && (
          <p className="mt-2 text-[10.5px] text-[#7c749f]">
            We fetch public metadata only. Media extraction is subject to platform terms and is never faked.
          </p>
        )}
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          {meta && (
            <Panel className="p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative h-[110px] w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,#3b1d78,#0f2557)] sm:h-[92px] sm:w-[160px]">
                  {meta.thumbnail ? (
                    <img src={meta.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[#8e86b1]">
                      <Film size={22} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="brand">{PLATFORM_LABEL[meta.platform]}</Badge>
                    {meta.duration ? <Badge tone="neutral">{formatDuration(meta.duration)}</Badge> : null}
                    <Badge tone="info">Metadata only</Badge>
                  </div>
                  <h2 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-white">{meta.title}</h2>
                  <p className="mt-0.5 truncate text-[11px] text-[#8e86b1]">
                    {meta.author ? `${meta.author} · ` : ""}
                    <a href={meta.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-brand-300 hover:underline">
                      Open source
                    </a>
                  </p>
                  <p className="mt-1 text-[10px] text-[#7c749f]">Metadata is public oEmbed data. Rename the project in the Library if needed.</p>
                </div>
              </div>
              {meta.platform !== "youtube" && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-2 text-[10px] leading-relaxed text-amber-200/85">
                  <ShieldAlert size={12} className="mt-0.5 shrink-0" />
                  {PLATFORM_LABEL[meta.platform]} restricts automated media access. Metadata works, but you must upload the media
                  file to transcribe it.
                </p>
              )}
            </Panel>
          )}

          {!meta && metaState !== "loading" && (
            <Panel className="p-3.5">
              <EmptyState
                icon={<Video size={20} />}
                title="Start with a video URL"
                description="The analyser validates the link, detects the platform and pulls public metadata. Transcription then uses your own media upload or pasted transcript."
              />
            </Panel>
          )}

          {metaState === "loading" && (
            <Panel className="flex items-center gap-3 p-5 text-[12px] text-[#a29ac4]">
              <Spinner /> Fetching public metadata…
            </Panel>
          )}

          {projectId && (
            <>
              <TranscriptWorkbench
                projectId={projectId}
                title={meta?.title ?? "Uploaded media"}
                sourceUrl={meta?.sourceUrl}
                onTranscriptReady={(t) => setTranscript(t)}
              />

              <Panel className="p-3.5">
                <SectionHeader icon={<Sparkles size={16} />} title="AI analysis" subtitle="Grounded in the transcript above" />
                <div className="mt-2.5">
                  <ProviderHint feature="Analysis" />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={runAnalysis} loading={analysisBusy} disabled={!transcript}>
                    <Sparkles size={14} /> Run viral analysis
                  </Button>
                  <Button variant="secondary" onClick={runHooks} loading={hookBusy} disabled={!transcript}>
                    <Flame size={14} /> Generate hooks
                  </Button>
                  <Button variant="secondary" onClick={runClips} loading={clipBusy} disabled={!transcript}>
                    <Scissors size={14} /> Find clip candidates
                  </Button>
                </div>
                {!transcript && (
                  <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-amber-300">
                    <AlertTriangle size={12} /> Analysis and clips stay locked until a transcript exists — no results are invented.
                  </p>
                )}

                {report && (
                  <div className="mt-3 grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
                    <div className="space-y-2.5 rounded-xl border border-[#2a1e4d] bg-[#080414]/70 p-3">
                      <ScoreBar label="Hook strength" value={report.hookScore} />
                      <ScoreBar label="Retention design" value={report.retentionScore} />
                      <div className="pt-1 text-[10px] text-[#8e86b1]">
                        Category: <span className="text-white">{report.category}</span>
                      </div>
                      <div className="text-[10px] text-[#8e86b1]">
                        Audience: <span className="text-white">{report.audience}</span>
                      </div>
                      <div className="text-[10px] text-[#8e86b1]">
                        CTA: <span className="text-white">{report.callToAction}</span>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <p className="text-[12px] leading-relaxed text-[#d7d1ee]">{report.summary}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Strengths</p>
                          <ul className="space-y-1 text-[11px] text-[#b6aed6]">
                            {report.strengths.map((s, i) => (
                              <li key={i} className="flex gap-1.5"><CheckCircle2 size={11} className="mt-0.5 shrink-0 text-emerald-400" />{s}</li>
                            ))}
                            {!report.strengths.length && <li className="text-[#7c749f]">None identified.</li>}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Weaknesses</p>
                          <ul className="space-y-1 text-[11px] text-[#b6aed6]">
                            {report.weaknesses.map((s, i) => (
                              <li key={i} className="flex gap-1.5"><AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-400" />{s}</li>
                            ))}
                            {!report.weaknesses.length && <li className="text-[#7c749f]">None identified.</li>}
                          </ul>
                        </div>
                      </div>
                      {report.recommendations.length > 0 && (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-300">Recommendations</p>
                          <ul className="space-y-1 text-[11px] text-[#b6aed6]">
                            {report.recommendations.map((s, i) => (
                              <li key={i} className="flex gap-1.5"><Circle size={8} className="mt-1 shrink-0 fill-brand-500 text-brand-500" />{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-[9.5px] leading-relaxed text-[#6f679a]">{report.disclaimer}</p>
                    </div>
                  </div>
                )}
              </Panel>

              {hooks.length > 0 && (
                <Panel className="p-3.5">
                  <SectionHeader
                    icon={<Flame size={16} />}
                    title="Hook options"
                    right={<Button size="sm" variant="ghost" onClick={() => downloadText(`${meta?.title ?? "hooks"}-hooks.txt`, hooks.map((h) => `${h.hook}\n  → ${h.why}`).join("\n\n"))}><Download size={12} /> Export</Button>}
                  />
                  <ul className="mt-2 space-y-1.5">
                    {hooks.map((hook, i) => (
                      <li key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-medium text-white">{hook.hook}</p>
                          {typeof hook.score === "number" && <Badge tone="brand">{hook.score}</Badge>}
                        </div>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-[#8e86b1]">{hook.why}</p>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              {clips.length > 0 && (
                <Panel className="p-3.5">
                  <SectionHeader icon={<Scissors size={16} />} title="Clip candidates" subtitle="Suggested segments — verify before posting" />
                  <ul className="mt-2.5 space-y-2">
                    {clips.map((clip) => (
                      <li key={clip.id} className="rounded-xl border border-[#2a1e4d] bg-[#080414]/60 p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[12px] font-semibold text-white">{clip.title}</p>
                          <Badge tone="info">
                            {formatDuration(clip.start)} → {formatDuration(clip.end)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-[#8e86b1]">{clip.reason}</p>
                        <p className="mt-1 text-[10.5px] text-[#c2bbdd]">{clip.caption}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => setClipDialog(clip)}>
                            <Film size={12} /> Export clip
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const subset = transcript?.segments.filter((s) => s.end > clip.start && s.start < clip.end) ?? [];
                              downloadText(
                                `${clip.title}.srt`,
                                subset
                                  .map((s, i) => `${i + 1}\n00:00:${String(Math.max(0, Math.round(s.start - clip.start))).padStart(2, "0")},000 --> 00:00:${String(Math.max(0, Math.round(s.end - clip.start))).padStart(2, "0")},000\n${s.text}`)
                                  .join("\n\n"),
                                "application/x-subrip",
                              );
                            }}
                          >
                            <Download size={12} /> Clip SRT
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </>
          )}
        </div>

        <div className="space-y-3">
          <Panel className="p-3.5">
            <SectionHeader icon={<Clock size={16} />} title="Processing steps" />
            <ol className="mt-2 space-y-2">
              {steps.map((step) => (
                <li key={step.key} className="flex items-start gap-2">
                  <span className="mt-0.5">
                    {step.state === "done" ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : step.state === "blocked" ? (
                      <AlertTriangle size={14} className="text-amber-400" />
                    ) : step.state === "active" ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      <Circle size={14} className="text-[#4b4368]" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[11.5px] font-medium ${step.state === "blocked" ? "text-amber-200" : "text-[#ded8f7]"}`}>{step.label}</p>
                    <p className="text-[10px] leading-snug text-[#7c749f]">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-2.5 rounded-lg border border-[#2a1e4d] bg-[#080414]/60 p-2 text-[9.5px] leading-relaxed text-[#8e86b1]">
              Step 4 is intentionally blocked: browsers cannot legally or reliably download platform media. Upload the file in
              the studio below, or use the optional Worker processing service.
            </p>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeader icon={<Clock size={16} />} title="Processing history" />
            {history.length === 0 ? (
              <p className="mt-2 text-[10.5px] text-[#7c749f]">No URL analyses yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {history.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setUrlInput(p.sourceUrl ?? "");
                        if (p.sourceUrl) void lookup(p.sourceUrl);
                      }}
                      className="w-full rounded-lg border border-white/[0.05] bg-white/[0.02] p-2 text-left hover:border-brand-500/40"
                    >
                      <p className="truncate text-[11.5px] text-white">{p.title}</p>
                      <p className="text-[9.5px] text-[#7c749f]">
                        {timeAgo(p.updatedAt)} · {p.status} · {p.clips?.length ?? 0} clips
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Dialog
        open={Boolean(clipDialog)}
        onClose={() => setClipDialog(null)}
        title={clipDialog?.title ?? "Clip"}
        description={`${formatDuration(clipDialog?.start)} → ${formatDuration(clipDialog?.end)}`}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setClipDialog(null)}>Close</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!clipDialog || !meta) return;
                const duration = Math.max(1, clipDialog.end - clipDialog.start);
                const cmd = `#!/bin/sh
# TJ Viral Clip AI Studio — 9:16 clip render command
# Requires: ffmpeg installed locally, plus a media file you are permitted to edit.
# Source: ${meta.sourceUrl}
# Segment: ${clipDialog.start}s → ${clipDialog.end}s (${duration.toFixed(1)}s)
set -e
INPUT="input.mp4"      # change to your downloaded media file
OUTPUT="${clipDialog.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mp4"
ffmpeg -ss ${clipDialog.start} -to ${clipDialog.end} -i "$INPUT" \\
  -vf "scale=1080:-1,crop=ih*9/16:ih,scale=1080:1920" \\
  -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k -movflags +faststart "$OUTPUT"
echo "Wrote $OUTPUT"
`;
                downloadText(`${clipDialog.title}.sh`, cmd, "text/x-shellscript");
                toast.push("Render script downloaded. It needs ffmpeg and a media file you have rights to use.", "info");
              }}
            >
              <Download size={14} /> Download ffmpeg script
            </Button>
          </>
        }
      >
        <Textarea
          readOnly
          value={`#!/bin/sh\nffmpeg -ss ${clipDialog?.start ?? 0} -to ${clipDialog?.end ?? 0} -i "input.mp4" \\\n  -vf "scale=1080:-1,crop=ih*9/16:ih,scale=1080:1920" \\\n  -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k -movflags +faststart "${clipDialog?.title ?? "clip"}.mp4"`}
          className="min-h-[120px] font-mono text-[10.5px]"
        />
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-2.5 text-[10.5px] leading-relaxed text-amber-200/90">
          This browser build does not render MP4 files locally. The downloaded script produces the clip once ffmpeg is
          installed. For one-click rendering, deploy the included Cloudflare Worker with the processing adapter and an
          external ffmpeg/yt-dlp service.
        </p>
      </Dialog>
    </div>
  );
}
