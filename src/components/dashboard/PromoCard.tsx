import { useNavigate } from "react-router-dom";
import { ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export function PromoCard() {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-500/35 bg-[linear-gradient(150deg,#2a0f5e_0%,#160a35_55%,#061428_100%)] p-3.5">
      <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-brand-500/30 blur-2xl" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.35),transparent_45%)]" />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[linear-gradient(140deg,#f472b6,#a855f7,#22d3ee)] text-white shadow-glow-sm">
            <Rocket size={15} />
          </span>
          <p className="text-[13px] font-bold leading-tight text-white">Create More.</p>
        </div>
        <p className="text-[13px] font-bold leading-tight text-white">Grow Bigger.</p>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#c3b8e8]">
          Your AI Content Studio awaits! Turn any video into clips, scripts and posts — free.
        </p>
        <Button size="sm" variant="primary" className="mt-2.5 w-full" onClick={() => navigate("/analyser")}>
          Get Started <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}
