import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { HeroArt } from "@/components/HeroArt";

const CHECKLIST = [
  "Analyse viral content",
  "Generate scripts & hooks",
  "Create stunning visuals",
  "Automate your workflow",
  "Grow your audience",
];

export function HeroBanner() {
  const navigate = useNavigate();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <section className="panel relative overflow-hidden border-brand-500/25 bg-hero-gradient p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-0 grid-glow opacity-40" />
      <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[#c9bdf2]">Welcome to</p>
          <h1 className="mt-0.5 text-[26px] font-extrabold leading-[1.1] tracking-tight sm:text-[32px]">
            <span className="neon-text">TJ Viral Clip </span>
            <span className="brand-text">AI Studio</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-[#b9afe0] sm:text-[12.5px]">
            Your complete AI content intelligence and production platform — transcribe, analyse, recreate and publish.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => navigate("/analyser")} className="shadow-glow">
              Start New Project <ArrowRight size={15} />
            </Button>
            <Button variant="secondary" onClick={() => setGuideOpen(true)} className="border-white/20 bg-white/10">
              <PlayCircle size={15} /> Watch Tutorial
            </Button>
          </div>
        </div>

        <div className="pointer-events-none relative hidden h-[168px] w-[300px] shrink-0 md:block xl:w-[340px]">
          <HeroArt className="h-full w-full" />
        </div>

        <ul className="grid shrink-0 grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {CHECKLIST.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11.5px] font-medium text-[#ded8f7]">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <Dialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="Studio quick start"
        description="Four steps from a video URL to publishable content."
        wide
        footer={<Button onClick={() => setGuideOpen(false)}>Got it</Button>}
      >
        <ol className="space-y-2.5 text-[12.5px] leading-relaxed text-[#c9c3e6]">
          <li>
            <strong className="text-white">1. Connect a free AI key.</strong> Open AI Providers and paste a Google AI Studio
            key (free tier) or any OpenAI-compatible endpoint. Keys stay in this browser unless you switch to the Worker proxy.
          </li>
          <li>
            <strong className="text-white">2. Analyse a video.</strong> Paste a YouTube, TikTok, Instagram, Facebook or X URL
            on the dashboard, or upload a media file for transcription.
          </li>
          <li>
            <strong className="text-white">3. Transcribe and analyse.</strong> Upload the media (or paste a transcript) in the
            Transcription Studio, then run viral analysis, hooks and clip finding.
          </li>
          <li>
            <strong className="text-white">4. Create and save.</strong> Generate scripts, image prompts, storyboards,
            voiceovers and social packs. Everything is saved locally and exportable.
          </li>
        </ol>
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-200/90">
          Video download/trimming (MP4 export) needs the optional Worker processing service — this browser build does not
          fabricate clip files.
        </p>
      </Dialog>
    </section>
  );
}
