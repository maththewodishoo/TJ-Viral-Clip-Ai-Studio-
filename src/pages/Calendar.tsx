import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, Input, Panel, SectionHeader, Select } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { generateCalendarPlan, formatAIError } from "@/lib/generation";
import { PLATFORM_LABEL } from "@/lib/platforms";
import { uid } from "@/lib/utils";
import type { CalendarEntry, Platform } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthMatrix(year: number, month: number): Array<{ date: string; day: number; inMonth: boolean }> {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - offset + i);
    cells.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    });
  }
  return cells;
}

export default function Calendar() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ date: today.toISOString().slice(0, 10), title: "", platform: "tiktok" as Platform, type: "Reel" });
  const [niche, setNiche] = useState("");
  const [posts, setPosts] = useState("7");
  const [busy, setBusy] = useState(false);

  const cells = useMemo(() => monthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    ws.calendar.forEach((entry) => {
      map.set(entry.date, [...(map.get(entry.date) ?? []), entry]);
    });
    return map;
  }, [ws.calendar]);

  const addEntry = () => {
    if (!form.title.trim()) {
      toast.push("Add a title first.", "error");
      return;
    }
    mutateWorkspace((d) => {
      d.calendar.push({ ...form, id: uid("cal"), status: "idea", createdAt: Date.now() });
    });
    setDialogOpen(false);
    setForm({ ...form, title: "" });
    toast.push("Added to the calendar.", "success");
  };

  const plan = async () => {
    if (niche.trim().length < 3) {
      toast.push("Enter your niche first.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await generateCalendarPlan(
        { niche, platform: "TikTok", posts: Number(posts) || 7, startDate: today.toISOString().slice(0, 10) },
        { cloudApiBase: settings.cloudApiBase, brandVoice: settings.brandVoice },
      );
      mutateWorkspace((d) => {
        d.calendar.push(...result.entries);
      });
      toast.push(`${result.entries.length} planned posts added via ${result.provider}.`, "success");
    } catch (err) {
      toast.push(formatAIError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const upcoming = [...ws.calendar].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<CalendarDays size={18} />}
        title="Content Calendar"
        description="Plan publishing days, generate a posting schedule with AI and track each idea from draft to published."
        actions={<Button size="sm" variant="primary" onClick={() => setDialogOpen(true)}><Plus size={13} /> Add entry</Button>}
      />
      <ProviderHint feature="AI schedule planning" />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="secondary" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                <ChevronLeft size={15} />
              </Button>
              <Button size="icon" variant="secondary" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                <ChevronRight size={15} />
              </Button>
              <h2 className="ml-1 text-[14px] font-semibold text-white">
                {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h2>
            </div>
            <Badge tone="neutral">{ws.calendar.length} entries</Badge>
          </div>

          <div className="mt-3 hidden grid-cols-7 gap-1 sm:grid">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-[9.5px] font-semibold uppercase tracking-wider text-[#7c749f]">{d}</div>
            ))}
            {cells.map((cell) => {
              const entries = byDate.get(cell.date) ?? [];
              const isToday = cell.date === today.toISOString().slice(0, 10);
              return (
                <div
                  key={cell.date}
                  className={`min-h-[76px] rounded-lg border p-1.5 ${
                    cell.inMonth ? "border-[#241a45] bg-[#080414]/60" : "border-transparent bg-transparent opacity-40"
                  } ${isToday ? "ring-1 ring-brand-500/60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] ${isToday ? "font-bold text-brand-300" : "text-[#8e86b1]"}`}>{cell.day}</span>
                    {entries.length > 0 && <span className="text-[8.5px] text-brand-300">{entries.length}</span>}
                  </div>
                  <div className="mt-1 space-y-1">
                    {entries.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() =>
                          mutateWorkspace((d) => {
                            d.calendar = d.calendar.filter((x) => x.id !== e.id);
                          })
                        }
                        title={`${e.title} — click to remove`}
                        className="block w-full truncate rounded bg-brand-500/20 px-1 py-0.5 text-left text-[8.5px] text-brand-100 hover:bg-rose-500/20"
                      >
                        {e.title}
                      </button>
                    ))}
                    {entries.length > 2 && <p className="text-[8px] text-[#7c749f]">+{entries.length - 2} more</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 space-y-1.5 sm:hidden">
            {upcoming.length === 0 && <p className="text-[11px] text-[#7c749f]">No entries yet.</p>}
            {upcoming.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                <div className="w-11 shrink-0 text-center">
                  <p className="text-[9px] uppercase text-[#7c749f]">{new Date(`${e.date}T00:00:00`).toLocaleDateString(undefined, { month: "short" })}</p>
                  <p className="text-[14px] font-bold leading-none text-white">{Number(e.date.slice(-2))}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] text-white">{e.title}</p>
                  <p className="text-[9.5px] text-[#8e86b1]">{PLATFORM_LABEL[e.platform]} · {e.type}</p>
                </div>
                <Badge tone={e.status === "published" ? "success" : e.status === "scheduled" ? "info" : "neutral"}>{e.status}</Badge>
                <button
                  type="button"
                  aria-label="Delete entry"
                  className="p-1 text-[#7c749f] hover:text-rose-300"
                  onClick={() => mutateWorkspace((d) => { d.calendar = d.calendar.filter((x) => x.id !== e.id); })}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel className="space-y-2.5 p-3.5">
            <SectionHeader icon={<Sparkles size={16} />} title="AI posting plan" />
            <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Niche, e.g. home workouts" className="h-9 text-[11.5px]" aria-label="Niche" />
            <div className="flex gap-2">
              <Select value={posts} onChange={(e) => setPosts(e.target.value)} className="h-9 text-[11.5px]" aria-label="Post count">
                {["3", "5", "7", "14"].map((n) => <option key={n} value={n}>{n} posts</option>)}
              </Select>
              <Button size="sm" variant="primary" className="h-9 shrink-0" onClick={plan} loading={busy}>
                Plan
              </Button>
            </div>
            <p className="text-[9.5px] leading-relaxed text-[#7c749f]">
              Titles are AI suggestions added as “idea” entries starting today. Adjust or delete them freely.
            </p>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeader icon={<CalendarDays size={16} />} title="Upcoming" />
            <div className="mt-2 max-h-[260px] space-y-1.5 overflow-y-auto">
              {upcoming.length === 0 ? (
                <p className="text-[10.5px] text-[#7c749f]">Nothing scheduled. Add an entry or generate a plan.</p>
              ) : (
                upcoming.slice(0, 12).map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-1.5">
                    <div className="w-9 shrink-0 text-center">
                      <p className="text-[8.5px] uppercase text-[#7c749f]">{e.date.slice(5)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-white">{e.title}</p>
                      <p className="text-[8.5px] text-[#8e86b1]">{e.status}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Advance status"
                      className="rounded px-1 text-[9px] text-brand-300 hover:bg-white/10"
                      onClick={() =>
                        mutateWorkspace((d) => {
                          const entry = d.calendar.find((x) => x.id === e.id);
                          if (entry) {
                            entry.status =
                              entry.status === "idea" ? "draft" : entry.status === "draft" ? "scheduled" : "published";
                          }
                        })
                      }
                    >
                      →
                    </button>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add calendar entry"
        footer={<><Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="primary" onClick={addEntry}>Add entry</Button></>}
      >
        <label className="block">
          <span className="label">Date</span>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Title</span>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AI tools carousel" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">Platform</span>
            <Select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube-shorts">YouTube Shorts</option>
              <option value="youtube">YouTube</option>
              <option value="x">X</option>
              <option value="facebook">Facebook</option>
            </Select>
          </label>
          <label className="block">
            <span className="label">Type</span>
            <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
