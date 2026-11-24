import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5", className)} aria-label="TJ Viral Clip AI Studio home">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[linear-gradient(140deg,#a855f7_0%,#7c3aed_55%,#22d3ee_130%)] shadow-[0_0_22px_-6px_rgba(168,85,247,0.9)]">
        <span className="absolute inset-0 opacity-30 blur-[6px] bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />
        <svg viewBox="0 0 24 24" className="relative h-5 w-5 drop-shadow" aria-hidden>
          <path d="M8.5 5.8v12.4L19 12 8.5 5.8Z" fill="white" />
        </svg>
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block text-[12.5px] font-bold uppercase tracking-[0.09em] text-white">
            TJ Viral Clip
          </span>
          <span className="block text-[12.5px] font-bold uppercase tracking-[0.09em] text-brand-300">
            AI Studio
          </span>
          <span className="mt-1 hidden text-[7.5px] font-medium uppercase tracking-[0.15em] text-[#7d75a1] sm:block">
            Transcribe · Analyse · Recreate · Create · Automate
          </span>
        </span>
      )}
    </Link>
  );
}
