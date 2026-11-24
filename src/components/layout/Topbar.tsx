import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Cpu,
  FileText,
  FolderOpen,
  Menu,
  Search,
  Settings2,
  Sparkles,
  Video,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { Logo } from "./Logo";

function useOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useOutside(() => setSearchOpen(false));
  const notifRef = useOutside(() => setNotifOpen(false));
  const profileRef = useOutside(() => setProfileOpen(false));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const items: Array<{ id: string; title: string; type: string; to: string }> = [
      ...ws.projects.map((p) => ({ id: p.id, title: p.title, type: "Project", to: "/library" })),
      ...ws.scripts.map((s) => ({ id: s.id, title: s.title, type: "Script", to: "/script-studio" })),
      ...ws.social.map((s) => ({ id: s.id, title: s.title, type: "Social post", to: "/social" })),
      ...ws.transcripts.map((t) => ({ id: t.id, title: t.title, type: "Transcript", to: "/transcription" })),
      ...ws.storyboards.map((s) => ({ id: s.id, title: s.title, type: "Storyboard", to: "/storyboard" })),
    ];
    return items.filter((item) => item.title.toLowerCase().includes(q)).slice(0, 6);
  }, [query, ws]);

  const notifications = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000;
    return [
      ...ws.projects
        .filter((p) => p.updatedAt > cutoff)
        .map((p) => ({ id: p.id, title: p.title, at: p.updatedAt, kind: "Project updated" })),
      ...ws.scripts
        .filter((s) => s.createdAt > cutoff)
        .map((s) => ({ id: s.id, title: s.title, at: s.createdAt, kind: "Script saved" })),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, 5);
  }, [ws]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#1c1436] bg-[#05030d]/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-[60px] sm:gap-3 sm:px-5">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="rounded-lg border border-white/10 p-2 text-[#c2bbdd] lg:hidden"
        >
          <Menu size={16} />
        </button>
        <div className="lg:hidden">
          <Logo compact />
        </div>

        <div ref={searchRef} className="relative hidden flex-1 max-w-xl md:block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8077a6]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                navigate(`${results[0].to}?q=${encodeURIComponent(query)}`);
                setSearchOpen(false);
              }
            }}
            placeholder="Search projects, tools and features…"
            aria-label="Search"
            className="h-10 w-full rounded-xl border border-[#241a44] bg-[#0b0719]/90 pl-9 pr-3 text-[13px] text-white placeholder:text-[#6f679a] focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
          {searchOpen && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-[#2a1e4d] bg-[#0b0619] p-1.5 shadow-2xl">
              {results.length === 0 ? (
                <p className="px-3 py-3 text-xs text-[#8e86b1]">No saved items match “{query.trim()}”.</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      navigate(`${r.to}?q=${encodeURIComponent(query)}`);
                      setSearchOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/[0.06]"
                  >
                    <span className="text-brand-400">
                      {r.type === "Project" ? <FolderOpen size={14} /> : r.type === "Script" ? <FileText size={14} /> : <Video size={14} />}
                    </span>
                    <span className="flex-1 truncate text-[13px] text-[#ded8f7]">{r.title}</span>
                    <span className="text-[10px] uppercase tracking-wide text-[#7c749f]">{r.type}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div ref={notifRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative grid h-9 w-9 place-items-center rounded-xl border border-[#241a44] bg-[#0b0719] text-[#c2bbdd] hover:text-white"
            >
              <Bell size={16} />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-gradient px-1 text-[9px] font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 w-72 rounded-xl border border-[#2a1e4d] bg-[#0b0619] p-2 shadow-2xl">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#8e86b1]">Last 7 days</p>
                {notifications.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-[#8e86b1]">No saved activity yet. Analyses and scripts appear here.</p>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={`${n.kind}-${n.id}`}
                      to="/library"
                      onClick={() => setNotifOpen(false)}
                      className="block rounded-lg px-2 py-2 hover:bg-white/[0.06]"
                    >
                      <p className="truncate text-[12.5px] text-[#ded8f7]">{n.title}</p>
                      <p className="text-[10.5px] text-[#7c749f]">
                        {n.kind} · {timeAgo(n.at)}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-[#241a44] bg-[#0b0719] p-1 pr-2 text-left"
              aria-label="Profile menu"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[linear-gradient(140deg,#a855f7,#22d3ee)] text-[11px] font-bold text-white">
                TJ
              </span>
              <span className="hidden text-[12px] font-medium text-[#ded8f7] sm:block">TJ Creator</span>
              <ChevronDown size={13} className="text-[#8e86b1]" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-11 w-56 rounded-xl border border-[#2a1e4d] bg-[#0b0619] p-1.5 shadow-2xl">
                <div className="px-2.5 py-2">
                  <p className="text-[13px] font-semibold text-white">TJ Creator</p>
                  <p className="text-[10.5px] text-[#8e86b1]">Local workspace · Free Forever</p>
                </div>
                <div className="my-1 h-px bg-white/10" />
                <Link to="/providers" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-[#c9c3e6] hover:bg-white/[0.06]">
                  <Cpu size={14} /> AI Providers
                </Link>
                <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-[#c9c3e6] hover:bg-white/[0.06]">
                  <Settings2 size={14} /> Settings & diagnostics
                </Link>
                <Link to="/library" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-[#c9c3e6] hover:bg-white/[0.06]">
                  <Sparkles size={14} /> My saved work
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
