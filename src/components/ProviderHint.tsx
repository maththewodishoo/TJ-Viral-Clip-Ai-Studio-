import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useConnections } from "@/lib/hooks";

export function ProviderHint({ feature = "AI" }: { feature?: string }) {
  const connections = useConnections();
  if (connections.length > 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-[11.5px] text-amber-200/90">
      <KeyRound size={14} className="shrink-0" />
      <span className="flex-1">
        No AI provider connected. {feature} generation needs a free API key — everything else on this page still works.
      </span>
      <Link to="/providers" className="rounded-md border border-amber-400/40 px-2 py-1 text-[10.5px] font-semibold text-amber-100 hover:bg-amber-400/10">
        Connect a key
      </Link>
    </div>
  );
}
