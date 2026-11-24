import { useMemo, useRef, useState } from "react";
import { Download, Mic, Play, Sparkles, Square, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Input, Panel, SectionHeader, Select, Textarea } from "@/components/ui/primitives";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useConnections } from "@/lib/hooks";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { generateVoiceoverScript, formatAIError } from "@/lib/generation";
import { synthesizeSpeech } from "@/lib/ai";
import { timeAgo } from "@/lib/utils";
import type { Voiceover as VoiceoverType } from "@/lib/types";

const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — warm narrator" },
  { id: "29vD33N1CtxCmqQRPOHJ", label: "Drew — confident presenter" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — friendly explainer" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam — energetic creator" },
];

export default function Voiceover() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const connections = useConnections();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("30");
  const [tone, setTone] = useState("confident, warm, fast-paced");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [voice, setVoice] = useState(VOICES[0].id);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const list = useMemo(() => [...ws.voiceovers].sort((a, b) => b.createdAt - a.createdAt), [ws.voiceovers]);
  const active = list.find((v) => v.id === activeId) ?? list[0] ?? null;
  const eleven = connections.some((c) => c.providerId === "elevenlabs");

  const run = async () => {
    if (topic.trim().length < 5) {
      toast.push("Describe the voiceover topic first.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await generateVoiceoverScript(
        { topic, duration: Number(duration) || 30, tone },
        { cloudApiBase: settings.cloudApiBase, brandVoice: settings.brandVoice },
      );
      mutateWorkspace((d) => {
        d.voiceovers.unshift(result.voiceover);
      });
      setActiveId(result.voiceover.id);
      setAudioUrl(null);
      toast.push(`Voiceover script generated via ${result.provider}.`, "success");
    } catch (err) {
      toast.push(formatAIError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const render = async (vo: VoiceoverType) => {
    setRendering(true);
    try {
      const result = await synthesizeSpeech(vo.script, voice);
      const url = URL.createObjectURL(result.blob);
      setAudioUrl(url);
      toast.push(`MP3 rendered by ${result.provider}. Use the download button to keep it.`, "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Voice rendering failed.", "error");
    } finally {
      setRendering(false);
    }
  };

  const saveScript = (vo: VoiceoverType, script: string) => {
    mutateWorkspace((d) => {
      const idx = d.voiceovers.findIndex((v) => v.id === vo.id);
      if (idx >= 0) d.voiceovers[idx] = { ...vo, script };
    });
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<Mic size={18} />}
        title="Voiceover Studio"
        description="Write narration timed to your video, then render a real MP3 with your own ElevenLabs key. Script writing works with any text provider."
      />
      <ProviderHint feature="Voiceover scripting" />

      <div className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel className="space-y-2.5 p-3.5">
            <SectionHeader icon={<Sparkles size={16} />} title="Write narration" />
            <label className="block">
              <span className="label">Topic</span>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Why creators should batch content weekly"
                className="min-h-[80px] text-[12px]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="label">Seconds</span>
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" className="h-9 text-[11.5px]" />
              </label>
              <label className="block">
                <span className="label">Tone</span>
                <Input value={tone} onChange={(e) => setTone(e.target.value)} className="h-9 text-[11px]" />
              </label>
            </div>
            <Button variant="primary" className="w-full" onClick={run} loading={busy}>
              <Sparkles size={14} /> Generate voiceover script
            </Button>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeader icon={<Mic size={16} />} title="Render audio" right={<Badge tone={eleven ? "success" : "warn"}>{eleven ? "ElevenLabs" : "No TTS key"}</Badge>} />
            <div className="mt-2 space-y-2">
              <Select value={voice} onChange={(e) => setVoice(e.target.value)} className="h-9 text-[11.5px]" aria-label="Voice">
                {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </Select>
              {!eleven && (
                <p className="text-[10px] leading-relaxed text-[#8e86b1]">
                  Add an ElevenLabs API key in AI Providers to render MP3 narration. Free tier quotas apply and attribution may be
                  required on the free plan.
                </p>
              )}
              <Button
                variant="secondary"
                className="w-full"
                disabled={!active || !eleven}
                loading={rendering}
                onClick={() => active && void render(active)}
              >
                <Volume2 size={14} /> Render MP3
              </Button>
              {audioUrl && (
                <div className="rounded-lg border border-[#2a1e4d] bg-[#080414]/70 p-2">
                  <audio ref={audioRef} src={audioUrl} controls className="w-full" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
                  <div className="mt-1.5 flex gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => audioRef.current?.play()} disabled={playing}>
                      <Play size={12} /> Play
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => audioRef.current?.pause()} disabled={!playing}>
                      <Square size={12} /> Stop
                    </Button>
                    <a
                      href={audioUrl}
                      download={`${active?.title ?? "voiceover"}.mp3`}
                      className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-[#2c2052] px-2 text-[11px] text-[#ded8f7] hover:bg-white/[0.06]"
                    >
                      <Download size={12} /> MP3
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <Panel className="p-3.5">
          {!active ? (
            <EmptyState
              icon={<Mic size={20} />}
              title="No voiceover scripts yet"
              description="Generate narration from a topic. Saved scripts appear here and can be rendered to audio with a connected speech provider."
            />
          ) : (
            <>
              <SectionHeader
                icon={<Mic size={16} />}
                title={active.title}
                subtitle={`${active.duration ?? ""} · ${active.pace ?? ""}`}
                right={<Badge tone="neutral">{active.script.split(/\s+/).filter(Boolean).length} words</Badge>}
              />
              <Textarea
                value={active.script}
                onChange={(e) => saveScript(active, e.target.value)}
                className="mt-2 min-h-[320px] text-[12.5px] leading-relaxed"
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[9.5px] text-[#6f679a]">Edits save automatically.</p>
                <Button size="sm" variant="secondary" onClick={() => void render(active)} disabled={!eleven} loading={rendering}>
                  <Volume2 size={12} /> Render this script
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {list.slice(0, 6).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setActiveId(v.id); setAudioUrl(null); }}
                    className={`rounded-lg border p-2 text-left ${
                      active.id === v.id ? "border-brand-500/50 bg-brand-500/10" : "border-white/[0.06] bg-white/[0.02]"
                    }`}
                  >
                    <p className="truncate text-[11.5px] font-medium text-white">{v.title}</p>
                    <p className="text-[9.5px] text-[#8e86b1]">{v.duration} · {timeAgo(v.createdAt)}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
