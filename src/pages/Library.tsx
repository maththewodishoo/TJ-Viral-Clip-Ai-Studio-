import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ExternalLink, FolderOpen, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Input, Panel, Select } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useWorkspace, mutateWorkspace } from "@/lib/store";
import { PLATFORM_LABEL } from "@/lib/platforms";
import { downloadText, formatDuration, timeAgo, truncate } from "@/lib/utils";

type Tab = "projects" | "transcripts" | "scripts" | "social" | "images" | "storyboards" | "voiceovers";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "projects", label: "Projects" },
  { id: "transcripts", label: "Transcripts" },
  { id: "scripts", label: "Scripts" },
  { id: "social", label: "Social" },
  { id: "images", label: "Images" },
  { id: "storyboards", label: "Storyboards" },
  { id: "voiceovers", label: "Voiceovers" },
];

export default function Library() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("projects");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const selectedId = params.get("project");
  const selected = ws.projects.find((p) => p.id === selectedId) ?? null;
  const [editingTitle, setEditingTitle] = useState("");

  const counts: Record<Tab, number> = {
    projects: ws.projects.length,
    transcripts: ws.transcripts.length,
    scripts: ws.scripts.length,
    social: ws.social.length,
    images: ws.images.length,
    storyboards: ws.storyboards.length,
    voiceovers: ws.voiceovers.length,
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const match = (text: string) => !q || text.toLowerCase().includes(q);
    switch (tab) {
      case "projects":
        return ws.projects.filter((p) => match(p.title) || match(p.sourceUrl ?? "")).sort((a, b) => b.updatedAt - a.updatedAt);
      case "transcripts":
        return ws.transcripts.filter((t) => match(t.title) || t.segments.some((s) => match(s.text))).sort((a, b) => b.createdAt - a.createdAt);
      case "scripts":
        return ws.scripts.filter((s) => match(s.title) || match(s.body)).sort((a, b) => b.createdAt - a.createdAt);
      case "social":
        return ws.social.filter((s) => match(s.title) || match(s.caption)).sort((a, b) => b.createdAt - a.createdAt);
      case "images":
        return ws.images.filter((i) => match(i.prompt)).sort((a, b) => b.createdAt - a.createdAt);
      case "storyboards":
        return ws.storyboards.filter((s) => match(s.title)).sort((a, b) => b.createdAt - a.createdAt);
      case "voiceovers":
        return ws.voiceovers.filter((v) => match(v.title) || match(v.script)).sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [tab, ws, q]);

  const removeSelected = () => {
    if (!selected) return;
    if (!confirm(`Delete “${selected.title}”? This cannot be undone.`)) return;
    mutateWorkspace((d) => {
      d.projects = d.projects.filter((p) => p.id !== selected.id);
    });
    setParams({});
    toast.push("Project deleted.", "info");
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<FolderOpen size={18} />}
        title="Project Library"
        description="Every analysis, transcript, script, prompt and post saved in this browser workspace."
        actions={
          <Badge tone="neutral">
            {Object.values(counts).reduce((a, b) => a + b, 0)} saved items
          </Badge>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f76a8]" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) setParams({ q: e.target.value });
              else setParams({});
            }}
            placeholder="Search titles and content…"
            className="h-10 pl-9 text-[12px]"
            aria-label="Search library"
          />
        </div>
        <Select
          value={tab}
          onChange={(e) => setTab(e.target.value as Tab)}
          className="h-10 w-full text-[12px] sm:hidden"
          aria-label="Library type"
        >
          {TABS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} ({counts[t.id]})
            </option>
          ))}
        </Select>
        <div className="hidden flex-wrap gap-1 sm:flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-[10.5px] font-medium transition ${
                tab === t.id
                  ? "border-brand-500/50 bg-brand-500/15 text-brand-200"
                  : "border-white/10 bg-white/[0.03] text-[#9a92bd] hover:text-white"
              }`}
            >
              {t.label} {counts[t.id]}
            </button>
          ))}
        </div>
      </div>

      <Panel className="p-3.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={20} />}
            title={q ? "Nothing matches that search" : "Nothing saved in this category yet"}
            description={q ? "Try a different title or keyword." : "Analyse a video, transcribe audio or generate content and it will appear here."}
          />
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {tab === "projects" &&
              (filtered as typeof ws.projects).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setEditingTitle(p.title);
                    setParams({ project: p.id });
                  }}
                  className="flex items-start gap-2.5 rounded-xl border border-[#241a45] bg-[#080414]/60 p-2.5 text-left transition hover:border-brand-500/45"
                >
                  <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,#3b1d78,#13265e)]">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[10px] font-bold text-white/70">{p.title.slice(0, 2).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-white">{p.title}</span>
                    <span className="mt-0.5 block text-[9.5px] text-[#8e86b1]">{PLATFORM_LABEL[p.platform]} · {timeAgo(p.updatedAt)}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <Badge tone={p.status === "analysed" ? "success" : "neutral"}>{p.status}</Badge>
                      {p.clips?.length ? <Badge tone="brand">{p.clips.length} clips</Badge> : null}
                    </span>
                  </span>
                </button>
              ))}
            {tab === "transcripts" &&
              (filtered as typeof ws.transcripts).map((t) => (
                <div key={t.id} className="rounded-xl border border-[#241a45] bg-[#080414]/60 p-2.5">
                  <p className="truncate text-[12px] font-medium text-white">{t.title}</p>
                  <p className="mt-0.5 text-[9.5px] text-[#8e86b1]">{t.segments.length} segments · {formatDuration(t.duration)} · {timeAgo(t.createdAt)}</p>
                  <p className="mt-1 line-clamp-2 text-[10.5px] text-[#a29ac4]">{t.segments[0]?.text}</p>
                  <div className="mt-1.5 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => downloadText(`${t.title}.srt`, t.segments.map((s, i) => `${i + 1}\n${new Date(s.start * 1000).toISOString().slice(11, 23).replace(".", ",")} --> ${new Date(s.end * 1000).toISOString().slice(11, 23).replace(".", ",")}\n${s.text}`).join("\n\n"), "application/x-subrip")}>
                      Download SRT
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => mutateWorkspace((d) => { d.transcripts = d.transcripts.filter((x) => x.id !== t.id); })}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            {tab === "scripts" &&
              (filtered as typeof ws.scripts).map((s) => (
                <div key={s.id} className="rounded-xl border border-[#241a45] bg-[#080414]/60 p-2.5">
                  <p className="truncate text-[12px] font-medium text-white">{s.title}</p>
                  <p className="mt-0.5 text-[9.5px] text-[#8e86b1]">{s.format} · {timeAgo(s.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap line-clamp-4 text-[10.5px] text-[#a29ac4]">{truncate(s.body, 200)}</p>
                  <div className="mt-1.5 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => downloadText(`${s.title}.md`, s.body, "text/markdown")}>Export</Button>
                    <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => mutateWorkspace((d) => { d.scripts = d.scripts.filter((x) => x.id !== s.id); })}>Delete</Button>
                  </div>
                </div>
              ))}
            {tab === "social" &&
              (filtered as typeof ws.social).map((s) => (
                <div key={s.id} className="rounded-xl border border-[#241a45] bg-[#080414]/60 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] font-medium text-white">{s.title}</p>
                    <Badge tone="brand">{PLATFORM_LABEL[s.platform]}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-3 text-[10.5px] text-[#a29ac4]">{s.caption}</p>
                  <p className="mt-1 text-[9.5px] text-brand-300">{s.hashtags.join(" ")}</p>
                  <div className="mt-1.5">
                    <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => mutateWorkspace((d) => { d.social = d.social.filter((x) => x.id !== s.id); })}>Delete</Button>
                  </div>
                </div>
              ))}
            {tab === "images" &&
              (filtered as typeof ws.images).map((i) => (
                <div key={i.id} className="rounded-xl border border-[#241a45] bg-[#080414]/60 p-2.5">
                  <p className="line-clamp-4 text-[11px] leading-relaxed text-[#d7d1ee]">{i.prompt}</p>
                  <p className="mt-1 text-[9px] text-[#6f679a]">{i.aspect} · {timeAgo(i.createdAt)}</p>
                  <div className="mt-1.5">
                    <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => mutateWorkspace((d) => { d.images = d.images.filter((x) => x.id !== i.id); })}>Delete</Button>
                  </div>
                </div>
              ))}
            {tab === "storyboards" &&
              (filtered as typeof ws.storyboards).map((s) => (
                <div key={s.id} className="rounded-xl border border-[#241a45] bg-[#080414]/60 p-2.5">
                  <p className="truncate text-[12px] font-medium text-white">{s.title}</p>
                  <p className="mt-0.5 text-[9.5px] text-[#8e86b1]">{s.scenes.length} scenes · {timeAgo(s.createdAt)}</p>
                  <p className="mt-1 line-clamp-2 text-[10.5px] text-[#a29ac4]">{s.scenes[0]?.visual}</p>
                  <div className="mt-1.5">
                    <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => mutateWorkspace((d) => { d.storyboards = d.storyboards.filter((x) => x.id !== s.id); })}>Delete</Button>
                  </div>
                </div>
              ))}
            {tab === "voiceovers" &&
              (filtered as typeof ws.voiceovers).map((v) => (
                <div key={v.id} className="rounded-xl border border-[#241a45] bg-[#080414]/60 p-2.5">
                  <p className="truncate text-[12px] font-medium text-white">{v.title}</p>
                  <p className="mt-0.5 text-[9.5px] text-[#8e86b1]">{v.duration} · {timeAgo(v.createdAt)}</p>
                  <p className="mt-1 line-clamp-3 text-[10.5px] text-[#a29ac4]">{v.script}</p>
                  <div className="mt-1.5">
                    <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => mutateWorkspace((d) => { d.voiceovers = d.voiceovers.filter((x) => x.id !== v.id); })}>Delete</Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Panel>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setParams({})}
        title="Project details"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setParams({})}>Close</Button>
            <Button variant="danger" onClick={removeSelected}><Trash2 size={13} /> Delete</Button>
            {selected?.sourceUrl && (
              <Button variant="primary" onClick={() => navigate(`/analyser?url=${encodeURIComponent(selected.sourceUrl!)}`)}>
                <ExternalLink size={13} /> Open analyser
              </Button>
            )}
          </>
        }
      >
        {selected && (
          <>
            <div className="flex gap-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,#3b1d78,#13265e)]">
                {selected.thumbnail ? <img src={selected.thumbnail} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <Input value={editingTitle || selected.title} onChange={(e) => setEditingTitle(e.target.value)} className="h-9 text-[13px]" aria-label="Project title" />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{PLATFORM_LABEL[selected.platform]}</Badge>
                  <Badge tone="neutral">{selected.status}</Badge>
                  <Badge tone="neutral">Updated {timeAgo(selected.updatedAt)}</Badge>
                </div>
              </div>
            </div>
            {selected.analysis && (
              <div className="rounded-lg border border-[#2a1e4d] bg-[#080414]/60 p-2.5">
                <p className="text-[9.5px] uppercase tracking-wider text-brand-300">Analysis</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#c2bbdd]">{selected.analysis.summary}</p>
                <p className="mt-1 text-[9.5px] text-[#7c749f]">Hook {selected.analysis.hookScore}/100 · Retention {selected.analysis.retentionScore}/100</p>
              </div>
            )}
            {selected.hooks?.length ? (
              <div>
                <p className="mb-1 text-[9.5px] uppercase tracking-wider text-brand-300">Hooks</p>
                <ul className="space-y-1">
                  {selected.hooks.slice(0, 4).map((h, i) => (
                    <li key={i} className="text-[11px] text-[#c2bbdd]">• {h.hook}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {selected.clips?.length ? (
              <div>
                <p className="mb-1 text-[9.5px] uppercase tracking-wider text-brand-300">Clip candidates</p>
                <ul className="space-y-1">
                  {selected.clips.map((c) => (
                    <li key={c.id} className="text-[11px] text-[#c2bbdd]">
                      {formatDuration(c.start)}–{formatDuration(c.end)} · {c.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!selected) return;
                  mutateWorkspace((d) => {
                    const p = d.projects.find((x) => x.id === selected.id);
                    if (p && editingTitle.trim()) {
                      p.title = editingTitle.trim();
                      p.updatedAt = Date.now();
                    }
                  });
                  toast.push("Project renamed.", "success");
                }}
              >
                Save title
              </Button>
              {selected.sourceUrl && (
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#2c2052] px-2.5 text-[11px] text-[#ded8f7] hover:bg-white/[0.06]">
                  <ExternalLink size={11} /> Source
                </a>
              )}
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
