import { useMemo, useState } from "react";
import { Copy, ExternalLink, Plus, Send, ShieldAlert, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Input, Panel, SectionHeader, Select } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useCopy } from "@/lib/hooks";
import { useWorkspace, mutateWorkspace } from "@/lib/store";
import { PLATFORM_LABEL } from "@/lib/platforms";
import { timeAgo, uid } from "@/lib/utils";
import type { Platform } from "@/lib/types";

const PLATFORM_URL: Partial<Record<Platform, string>> = {
  tiktok: "https://www.tiktok.com/upload",
  instagram: "https://www.instagram.com/",
  youtube: "https://studio.youtube.com/",
  "youtube-shorts": "https://studio.youtube.com/",
  x: "https://x.com/compose/post",
  facebook: "https://www.facebook.com/",
};

export default function SocialCommand() {
  const ws = useWorkspace();
  const toast = useToast();
  const { copy } = useCopy();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", platform: "tiktok" as Platform, scheduledFor: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) });

  const queue = useMemo(() => [...ws.commands].sort((a, b) => a.createdAt - b.createdAt), [ws.commands]);
  const scheduled = queue.filter((q) => q.status === "scheduled").length;
  const published = queue.filter((q) => q.status === "published").length;

  const add = () => {
    if (!form.title.trim()) {
      toast.push("Add a title first.", "error");
      return;
    }
    mutateWorkspace((d) => {
      d.commands.unshift({ ...form, id: uid("cmd"), status: "queued", createdAt: Date.now() });
    });
    setOpen(false);
    setForm({ ...form, title: "" });
    toast.push("Added to the command queue.", "success");
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<Send size={18} />}
        title="Social Media Command"
        description="Your publishing queue across platforms. Publishing is manual in this build — no platform API credentials are configured."
        actions={<Button size="sm" variant="primary" onClick={() => setOpen(true)}><Plus size={13} /> Add to queue</Button>}
      />

      <div className="grid grid-cols-3 gap-2.5">
        {[
          ["Queued", queue.filter((q) => q.status === "queued").length],
          ["Scheduled", scheduled],
          ["Published (marked)", published],
        ].map(([label, value]) => (
          <Panel key={String(label)} className="p-3">
            <p className="text-[18px] font-bold leading-none text-white">{value}</p>
            <p className="mt-1 text-[10.5px] text-[#8e86b1]">{label}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="p-3.5">
          <SectionHeader icon={<Send size={16} />} title="Publishing queue" right={<Badge tone="neutral">{queue.length}</Badge>} />
          {queue.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={<Send size={18} />}
                title="Queue is empty"
                description="Add planned posts here, or schedule generated posts from Social Media Content."
              />
            </div>
          ) : (
            <ul className="mt-2.5 space-y-1.5">
              {queue.map((cmd) => {
                const post = ws.social.find((p) => p.title === cmd.title);
                return (
                  <li key={cmd.id} className="rounded-xl border border-[#2a1e4d] bg-[#080414]/60 p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{PLATFORM_LABEL[cmd.platform]}</Badge>
                      <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-white">{cmd.title}</p>
                      <Badge tone={cmd.status === "published" ? "success" : cmd.status === "scheduled" ? "info" : "neutral"}>
                        {cmd.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[9.5px] text-[#7c749f]">
                      {cmd.scheduledFor ? `Target: ${cmd.scheduledFor} · ` : ""}added {timeAgo(cmd.createdAt)}
                    </p>
                    {post && <p className="mt-1 line-clamp-2 text-[10.5px] text-[#a29ac4]">{post.caption}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {post && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const ok = await copy(`${post.caption}\n\n${post.hashtags.join(" ")}`);
                            toast.push(ok ? "Caption copied — paste it on the platform." : "Clipboard blocked.", ok ? "success" : "error");
                          }}
                        >
                          <Copy size={11} /> Copy caption
                        </Button>
                      )}
                      <a
                        href={PLATFORM_URL[cmd.platform] ?? "https://example.com"}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-[#b6aed6] hover:bg-white/[0.06] hover:text-white"
                      >
                        <ExternalLink size={11} /> Open platform
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-300"
                        onClick={() =>
                          mutateWorkspace((d) => {
                            const target = d.commands.find((x) => x.id === cmd.id);
                            if (target) target.status = "published";
                          })
                        }
                      >
                        Mark published
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-rose-300"
                        aria-label="Remove from queue"
                        onClick={() => mutateWorkspace((d) => { d.commands = d.commands.filter((x) => x.id !== cmd.id); })}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-3">
          <Panel className="p-3.5">
            <SectionHeader icon={<ShieldAlert size={16} />} title="Publishing status" />
            <div className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-[#a29ac4]">
              <p>
                No platform account is connected, so nothing is auto-posted. “Mark published” is a manual record, not a platform
                confirmation.
              </p>
              <div className="rounded-lg border border-[#2a1e4d] bg-[#080414]/60 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-300">To automate later</p>
                <p className="mt-1 text-[10px] text-[#8e86b1]">
                  Add OAuth credentials to the included Worker and implement `/api/social/publish`. The UI already tracks the queue
                  and status. Never fake a success response.
                </p>
              </div>
              <div className="space-y-1">
                {(["tiktok", "instagram", "youtube-shorts", "x", "facebook"] as Platform[]).map((p) => (
                  <div key={p} className="flex items-center justify-between rounded border border-white/[0.05] px-2 py-1">
                    <span className="text-[10.5px] text-[#c2bbdd]">{PLATFORM_LABEL[p]}</span>
                    <span className="text-[9px] text-amber-300">Not connected</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add to publishing queue"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={add}>Add</Button></>}
      >
        <label className="block">
          <span className="label">Title</span>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AI tools teaser" />
        </label>
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
          <span className="label">Target date</span>
          <Input type="date" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} />
        </label>
      </Dialog>
    </div>
  );
}
