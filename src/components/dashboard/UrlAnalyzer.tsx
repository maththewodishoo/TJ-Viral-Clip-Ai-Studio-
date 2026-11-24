import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardPaste, Link2, Upload, Video, X } from "lucide-react";
import { Button, Panel } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { parseVideoUrl } from "@/lib/platforms";
import { setPendingFile } from "@/lib/handoff";

export function UrlAnalyzer() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = url.trim() ? parseVideoUrl(url) : null;

  const submit = () => {
    const result = parseVideoUrl(url);
    if (!result.valid) {
      setError(result.reason ?? "Unsupported URL.");
      return;
    }
    setError(null);
    navigate(`/analyser?url=${encodeURIComponent(result.normalized ?? url)}`);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      setError(null);
    } catch {
      toast.push("Clipboard access was blocked by the browser. Paste manually.", "error");
    }
  };

  return (
    <Panel className="relative overflow-hidden border-brand-500/25 p-3.5 sm:p-4">
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="relative">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
              <Video size={15} />
            </span>
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">Analyse any viral video</h2>
              <p className="text-[10.5px] text-[#8e86b1]">YouTube · Shorts · TikTok · Instagram Reels · Facebook · X</p>
            </div>
          </div>
          <span className="chip hidden sm:inline-flex">
            <Link2 size={11} /> Metadata + transcript + AI analysis
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f76a8]" />
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Paste your YouTube, TikTok, Instagram Reels, Facebook or X video URL here…"
              aria-label="Video URL"
              aria-invalid={Boolean(error)}
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 w-full rounded-xl border border-[#2a1e4d] bg-[#080414]/90 pl-9 pr-24 text-[12.5px] text-white placeholder:text-[#6f679a] focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {url && (
                <button
                  type="button"
                  onClick={() => {
                    setUrl("");
                    setError(null);
                  }}
                  aria-label="Clear URL"
                  className="rounded-md p-1.5 text-[#8e86b1] hover:bg-white/10 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={paste}
                aria-label="Paste from clipboard"
                className="rounded-md p-1.5 text-[#8e86b1] hover:bg-white/10 hover:text-white"
              >
                <ClipboardPaste size={14} />
              </button>
            </div>
          </div>
          <Button variant="primary" onClick={submit} className="h-11 shrink-0 px-5">
            Analyse Video
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {parsed?.valid && !error && (
            <span className="text-[10.5px] font-medium text-emerald-400">Detected: {parsed.platformLabel}</span>
          )}
          {error && <span className="text-[10.5px] font-medium text-rose-400">{error}</span>}
          {!parsed && !error && (
            <span className="text-[10.5px] text-[#7c749f]">Public URLs only. Extraction respects platform restrictions.</span>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-medium text-brand-300 hover:text-brand-200"
          >
            <Upload size={12} /> Upload a video instead
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 100 * 1024 * 1024) {
                toast.push("That file is over 100 MB. Use a smaller file or the Worker proxy.", "error");
                return;
              }
              setPendingFile(file);
              toast.push(`Loaded ${file.name}. Transcribe it in the studio.`, "success");
              navigate("/transcription?upload=1");
            }}
          />
        </div>
      </div>
    </Panel>
  );
}
