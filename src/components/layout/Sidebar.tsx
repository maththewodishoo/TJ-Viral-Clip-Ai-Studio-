import { NavLink } from "react-router-dom";
import { ArrowRight, ChevronRight, Crown, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

export function SidebarNav({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between px-4 pt-4">
        <Logo />
        {onClose && (
          <button
            type="button"
            className="rounded-lg border border-white/10 p-1.5 text-[#b6aed6] lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12px] font-medium transition",
                isActive
                  ? "bg-[linear-gradient(95deg,rgba(139,92,246,0.95),rgba(147,51,234,0.55))] text-white shadow-[0_6px_20px_-10px_rgba(168,85,247,0.95)] ring-1 ring-inset ring-white/10"
                  : "text-[#a29ac4] hover:bg-white/[0.05] hover:text-white",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={15} className={cn("shrink-0", isActive ? "text-white" : "text-[#8b82b3]")} />
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && <ChevronRight size={12} className="opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 pb-4">
        <div className="rounded-xl border border-brand-500/30 bg-[linear-gradient(160deg,rgba(88,28,135,0.55),rgba(12,7,25,0.9))] p-3">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-amber-300" />
            <p className="text-[12px] font-semibold text-white">Free Forever</p>
          </div>
          <p className="mt-1 text-[10.5px] leading-snug text-[#b9b0dc]">No subscription required. Bring your own free API keys.</p>
          <NavLink
            to="/providers"
            onClick={onNavigate}
            className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-[linear-gradient(95deg,#7c3aed,#a855f7)] px-2 py-1.5 text-[11px] font-semibold text-white shadow-glow-sm"
          >
            Explore free setup <ArrowRight size={12} />
          </NavLink>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[#1e1638] bg-[#080414]/92 backdrop-blur-xl lg:flex">
      <SidebarNav />
    </aside>
  );
}
