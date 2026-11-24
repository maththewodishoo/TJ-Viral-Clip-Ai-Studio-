import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, Download, FileAudio, Pencil, Save, Trash2, Upload, Wand2 } from "lucide-react";
import { Badge, Button, EmptyState, Input, Panel, SectionHeader, Spinner, Textarea } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { transcribeMedia, AIError } from "@/lib/ai";
import { parsePastedTranscript, toMarkdown, toSrt, toVtt } from "@/lib/srt";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { takePendingFile } from "@/lib/handoff";
import { downloadText, formatDuration, formatTimecode, uid } from "@/lib/utils";
import type { Transcript, TranscriptSegment } from "@/lib/types";
import { ProviderHint } from "./ProviderHint";

interface Props {
  projectId?: string;
  title: string;
  sourceUrl?: string;
  onTranscriptReady?: (transcript: Transcript) => void;
  compact?: boolean;
}

export function TranscriptWorkbench({ projectId, title, sourceUrl, onTranscriptReady, compact }: Props) {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [language, setLanguage] = useState<string | undefined>();
  const [provider, setProvider] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [editing, setEditing] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [approximate, setApproximate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pending = takePendingFile();
    if (pending) setFile(pending);
  }, []);

  const existing = projectId ? ws.transcripts.find((t) => t.id === ws.projects.find((p) => p.id === projectId)?.transcriptId) : undefined;
  useEffect(() => {
    if (existing && segments.length === 0) {
      setSegments(existing.segments);
      setLanguage(existing.language);
      setProvider(existing.provider);
    }
  }, [existing, segments.length]);

  const runTranscription = async () => {
    if (!file) {
      toast.push("Choose an audio or video file first.", "error");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress("Uploading media to your AI provider…");
    try {
      const result = await transcribeMedia(file, { cloudApiBase: settings.cloudApiBase });
      setProgress("Building timestamped transcript…");
      setSegments(result.segments);
      setLanguage(result.language);
      setProvider(result.provider);
      setApproximate(false);
      toast.push(`Transcribed ${formatDuration(result.segments[result.segments.length - 1]?.end)} with ${result.provider}.`, "success");
      persist(result.segments, result.language, result.provider, false);
    } catch (err) {
      setError(err instanceof AIError ? err.message : err instanceof Error ? err.message : "Transcription failed.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const persist = (segs: TranscriptSegment[], lang?: string, prov?: string, approx = approximate) => {
    if (!segs.length) return;
    const transcript: Transcript = {
      id: existing?.id ?? uid("tr"),
      title,
      segments: segs,
      language: lang,
      provider: prov ?? (approx ? "Pasted transcript" : provider),
      sourceUrl,
      duration: segs[segs.length - 1]?.end,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    mutateWorkspace((draft) => {
      const idx = draft.transcripts.findIndex((t) => t.id === transcript.id);
      if (idx >= 0) draft.transcripts[idx] = transcript;
      else draft.transcripts.unshift(transcript);
      if (projectId) {
        const project = draft.projects.find((p) => p.id === projectId);
        if (project) {
          project.transcriptId = transcript.id;
          project.status = project.status === "draft" ? "transcribed" : project.status;
          project.updatedAt = Date.now();
        }
      }
    });
    onTranscriptReady?.(transcript);
  };

  const save = () => {
    if (!segments.length) return;
    persist(segments, language, provider);
    toast.push("Transcript saved to your workspace.", "success");
  };

  const importPaste = () => {
    if (!pasteText.trim()) return;
    const parsed = parsePastedTranscript(pasteText);
    if (!parsed.segments.length) {
      toast.push("Could not read any text from the pasted transcript.", "error");
      return;
    }
    setSegments(parsed.segments);
    setApproximate(parsed.approximate);
    setLanguage(undefined);
    setProvider(parsed.approximate ? "Pasted (timing estimated)" : "Pasted transcript");
    setPasteOpen(false);
    setPasteText("");
    toast.push(
      parsed.approximate
        ? "Imported. Timings are estimated at 4s per chunk — edit or re-transcribe for accuracy."
        : "Pasted transcript imported with timings.",
      "success",
    );
  };

  const duration = segments[segments.length - 1]?.end;

  return (
    <Panel className="p-3.5 sm:p-4">
      <SectionHeader
        icon={<FileAudio size={16} />}
        title="Transcript"
        subtitle={segments.length ? `${segments.length} segments · ${formatDuration(duration)}` : "Upload media or paste an existing transcript"}
        right={
          segments.length ? (
            <Badge tone={approximate ? "warn" : "success"}>{provider ?? "Saved"}</Badge>
          ) : null
        }
      />

      <div className="mt-3 space-y-2.5">
        <ProviderHint feature="Transcription" />

        {!segments.length && (
          <>
            <label
              htmlFor={`file-${projectId ?? "new"}`}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#35275f] bg-white/[0.02] px-4 py-6 text-center transition hover:border-brand-500/50 hover:bg-brand-500/[0.05]"
            >
              <Upload size={20} className="text-brand-400" />
              <span className="text-[12px] font-medium text-[#ded8f7]">
                {file ? file.name : "Upload audio or video to transcribe"}
              </span>
              <span className="text-[10px] text-[#8e86b1]">MP3, M4A, WAV, MP4, MOV, WebM · up to 25 MB for browser transcription</span>
              <input
                id={`file-${projectId ?? "new"}`}
                ref={fileRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null;
                  setFile(next);
                  setError(null);
                }}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={runTranscription} loading={busy} disabled={!file}>
                <Wand2 size={14} /> Transcribe with AI
              </Button>
              <Button variant="secondary" onClick={() => setPasteOpen(true)}>
                <ClipboardPaste size={14} /> Paste transcript
              </Button>
            </div>
            {busy && (
              <p className="flex items-center gap-2 text-[11px] text-brand-200">
                <Spinner /> {progress || "Transcribing…"}
              </p>
            )}
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-[11px] leading-relaxed text-rose-200">
                {error}
              </div>
            )}
            {!file && !busy && (
              <p className="text-[10px] leading-relaxed text-[#7c749f]">
                Browser transcription sends the file directly to your configured provider. URL-based media extraction is not
                attempted here — platforms restrict it and results would be unverifiable.
              </p>
            )}
          </>
        )}

        {segments.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" onClick={save} variant="primary">
                <Save size={13} /> Save transcript
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
                <Pencil size={13} /> {editing ? "Done editing" : "Edit"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => downloadText(`${title}.srt`, toSrt(segments), "application/x-subrip")}>
                <Download size={13} /> SRT
              </Button>
              <Button size="sm" variant="ghost" onClick={() => downloadText(`${title}.vtt`, toVtt(segments), "text/vtt")}>
                VTT
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  downloadText(
                    `${title}.md`,
                    toMarkdown({
                      id: "export",
                      title,
                      segments,
                      language,
                      sourceUrl,
                      createdAt: Date.now(),
                    }),
                    "text/markdown",
                  )
                }
              >
                Markdown
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-rose-300"
                onClick={() => {
                  if (!confirm("Clear this transcript from the editor? Saved copies stay in your library.")) return;
                  setSegments([]);
                  setProvider(undefined);
                }}
              >
                <Trash2 size={13} />
              </Button>
            </div>

            {approximate && (
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-2 text-[10.5px] text-amber-200/90">
                Timings are estimated because the pasted text had no timestamps. Clip boundaries will be approximate.
              </p>
            )}

            <div className={`space-y-1.5 overflow-y-auto pr-1 ${compact ? "max-h-64" : "max-h-[420px]"}`}>
              {segments.map((seg, i) => (
                <div key={i} className="flex gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2">
                  <span className="mt-0.5 w-12 shrink-0 font-mono text-[10px] text-brand-300">{formatTimecode(seg.start)}</span>
                  {editing ? (
                    <Textarea
                      value={seg.text}
                      onChange={(e) =>
                        setSegments((prev) => prev.map((s, idx) => (idx === i ? { ...s, text: e.target.value } : s)))
                      }
                      className="min-h-[44px] py-1 text-[12px]"
                    />
                  ) : (
                    <p className="flex-1 text-[12px] leading-relaxed text-[#d7d1ee]">
                      {seg.speaker && <span className="mr-1 font-semibold text-brand-300">{seg.speaker}:</span>}
                      {seg.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[10.5px] text-[#8e86b1]" htmlFor={`retry-${projectId ?? "new"}`}>
                Different file?
              </label>
              <Input
                id={`retry-${projectId ?? "new"}`}
                type="file"
                accept="audio/*,video/*"
                className="max-w-[230px] px-2 py-1 text-[10.5px] file:mr-2 file:rounded file:border-0 file:bg-brand-500/20 file:px-2 file:py-1 file:text-[10px] file:text-brand-200"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button size="sm" variant="secondary" onClick={runTranscription} loading={busy} disabled={!file}>
                Re-transcribe
              </Button>
            </div>
          </>
        )}

        {segments.length === 0 && !file && !busy && (
          <EmptyState
            icon={<FileAudio size={18} />}
            title="No transcript yet"
            description="Upload media to transcribe with your AI provider, or paste an existing transcript to unlock analysis, hooks and clips."
          />
        )}
      </div>

      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Paste a transcript"
        description="SRT, VTT or timestamped lines keep exact timings. Plain text gets estimated 4-second timings."
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={importPaste}>
              Import transcript
            </Button>
          </>
        }
      >
        <Textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={"00:00:01,000 --> 00:00:04,000\nYour transcript line here…"}
          className="min-h-[220px] font-mono text-[11.5px]"
        />
      </Dialog>
    </Panel>
  );
}
