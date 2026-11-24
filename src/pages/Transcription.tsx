import { useMemo, useState } from "react";
import { FileAudio, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, Input, Panel, SectionHeader } from "@/components/ui/primitives";
import { TranscriptWorkbench } from "@/components/TranscriptWorkbench";
import { useWorkspace } from "@/lib/store";
import { formatDuration, timeAgo } from "@/lib/utils";
import { downloadText } from "@/lib/utils";
import { toSrt } from "@/lib/srt";
import type { Transcript } from "@/lib/types";

export default function Transcription() {
  const ws = useWorkspace();
  const [active, setActive] = useState<Transcript | null>(null);
  const [query, setQuery] = useState("");

  const transcripts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...ws.transcripts]
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.segments.some((s) => s.text.toLowerCase().includes(q)))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [ws.transcripts, query]);

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<FileAudio size={18} />}
        title="Transcription Studio"
        description="Turn audio or video into timestamped, editable transcripts. Word-level diarisation depends on your provider; Gemini and Whisper return segment-level timings."
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <TranscriptWorkbench
          key={active?.id ?? "new"}
          title={active?.title ?? "New transcript"}
          sourceUrl={active?.sourceUrl}
          onTranscriptReady={(t) => setActive(t)}
        />

        <Panel className="flex max-h-[720px] flex-col p-3.5">
          <SectionHeader
            icon={<FileAudio size={16} />}
            title="Saved transcripts"
            right={<Badge tone="neutral">{ws.transcripts.length}</Badge>}
          />
          <div className="relative mt-2">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7f76a8]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transcript text…"
              className="h-9 pl-8 text-[11.5px]"
              aria-label="Search transcripts"
            />
          </div>
          <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto">
            {transcripts.length === 0 ? (
              <p className="px-1 py-3 text-[11px] leading-relaxed text-[#7c749f]">
                {ws.transcripts.length === 0
                  ? "No transcripts saved yet. Transcribe a file on the left to create your first one."
                  : "No transcripts match that search."}
              </p>
            ) : (
              transcripts.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActive(t)}
                  className={`w-full rounded-lg border p-2 text-left transition ${
                    active?.id === t.id
                      ? "border-brand-500/50 bg-brand-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-brand-500/30"
                  }`}
                >
                  <p className="truncate text-[11.5px] font-medium text-white">{t.title}</p>
                  <p className="mt-0.5 text-[9.5px] text-[#8e86b1]">
                    {t.segments.length} segments · {formatDuration(t.duration)} · {timeAgo(t.createdAt)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#7c749f]">
                    {t.segments[0]?.text}
                  </p>
                </button>
              ))
            )}
          </div>
          {active && (
            <div className="mt-2 flex gap-1.5 border-t border-white/[0.06] pt-2">
              <Button size="sm" variant="secondary" onClick={() => downloadText(`${active.title}.srt`, toSrt(active.segments), "application/x-subrip")}>
                Download SRT
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setActive(null)}>
                New
              </Button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
