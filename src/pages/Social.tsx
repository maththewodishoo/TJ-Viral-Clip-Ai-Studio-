import { useMemo, useState } from "react";
import { CalendarPlus, Copy, Download, Share2, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Panel, SectionHeader, Select, Textarea } from "@/components/ui/primitives";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useCopy } from "@/lib/hooks";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { generateSocialPack, formatAIError } from "@/lib/generation";
import { PLATFORM_LABEL } from "@/lib/platforms";
import { downloadText, timeAgo, uid } from "@/lib/utils";
import type { Platform } from "@/lib/types";

const PLATFORM_OPTIONS: Array<{ id: Platform; label: string }> = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube-shorts", label: "YouTube Shorts" },
  { id: "x", label: "X" },
  { id: "facebook", label: "Facebook" },
];

export default function Social() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const { copy } = useCopy();
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<Platform[]>(["tiktok", "instagram"]);
  const [sourceId, setSourceId] = useState("");
  const [busy, setBusy] = useState(false);

  const posts = useMemo(() => [...ws.social].sort((a, b) => b.createdAt - a.createdAt), [ws.social]);

  const toggle = (id: Platform) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const run = async () => {
    const source = ws.transcripts.find((t) => t.id === sourceId);
    const subject = source ? `${topic || source.title}\n\nSource transcript:\n${source.segments.map((s) => s.text).join(" ")}` : topic;
    if (subject.trim().length < 8) {
      toast.push("Describe the content or pick a transcript first.", "error");
      return;
    }
    if (!selected.length) {
      toast.push("Select at least one platform.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await generateSocialPack(
        { topic: subject, platforms: selected.map((s) => PLATFORM_LABEL[s]), count: selected.length * 2 },
        { cloudApiBase: settings.cloudApiBase, brandVoice: settings.brandVoice },
      );
      mutateWorkspace((d) => {
        d.social.unshift(...result.posts);
      });
      toast.push(`${result.posts.length} posts saved via ${result.provider}.`, "success");
    } catch (err) {
      toast.push(formatAIError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const schedule = (postId: string) => {
    const post = ws.social.find((p) => p.id === postId);
    if (!post) return;
    const date = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    mutateWorkspace((d) => {
      d.calendar.unshift({
        id: uid("cal"),
        date,
        title: post.title,
        platform: post.platform,
        type: "Social post",
        status: "scheduled",
        createdAt: Date.now(),
      });
      d.commands.unshift({
        id: uid("cmd"),
        platform: post.platform,
        title: post.title,
        scheduledFor: date,
        status: "scheduled",
        createdAt: Date.now(),
      });
    });
    toast.push("Added to your calendar and social command queue for tomorrow.", "success");
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<Share2 size={18} />}
        title="Social Media Content"
        description="Turn a topic or transcript into platform-native captions, hashtags and thumbnail concepts. Publishing stays manual unless you connect platform APIs."
      />
      <ProviderHint feature="Social content generation" />

      <div className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel className="space-y-2.5 p-3.5">
            <SectionHeader icon={<Sparkles size={16} />} title="Content brief" />
            <label className="block">
              <span className="label">Source transcript (optional)</span>
              <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="h-9 text-[11.5px]">
                <option value="">None</option>
                {ws.transcripts.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className="label">Topic / angle</span>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 3 AI editing tricks for creators"
                className="min-h-[70px] text-[12px]"
              />
            </label>
            <div>
              <span className="label">Platforms</span>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition ${
                      selected.includes(p.id)
                        ? "border-brand-500/50 bg-brand-500/20 text-brand-200"
                        : "border-white/10 bg-white/[0.03] text-[#9a92bd] hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="primary" className="w-full" onClick={run} loading={busy}>
              <Sparkles size={14} /> Generate posts
            </Button>
          </Panel>
          <Panel className="p-3.5">
            <SectionHeader icon={<Share2 size={16} />} title="Saved posts" right={<Badge tone="neutral">{posts.length}</Badge>} />
            <div className="mt-2 space-y-1.5">
              {posts.length === 0 ? (
                <p className="text-[10.5px] text-[#7c749f]">No posts yet. Generated content is saved here automatically.</p>
              ) : (
                posts.map((p) => (
                  <div key={p.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <p className="truncate text-[11.5px] font-medium text-white">{p.title}</p>
                    <p className="text-[9.5px] text-[#8e86b1]">{PLATFORM_LABEL[p.platform]} · {timeAgo(p.createdAt)}</p>
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        className="text-[9.5px] text-brand-300 hover:text-brand-200"
                        onClick={() => schedule(p.id)}
                      >
                        Schedule
                      </button>
                      <button
                        type="button"
                        className="ml-auto text-[#7c749f] hover:text-rose-300"
                        aria-label="Delete post"
                        onClick={() => mutateWorkspace((d) => { d.social = d.social.filter((x) => x.id !== p.id); })}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        <Panel className="p-3.5">
          <SectionHeader
            icon={<Share2 size={16} />}
            title="Generated posts"
            right={
              posts.length > 0 ? (
                <Button size="sm" variant="ghost" onClick={() => downloadText("social-posts.txt", posts.map((p) => `[${PLATFORM_LABEL[p.platform]}] ${p.title}\n${p.caption}\n${p.hashtags.join(" ")}`).join("\n\n---\n\n"))}>
                  <Download size={12} /> Export
                </Button>
              ) : undefined
            }
          />
          {posts.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={<Share2 size={18} />}
                title="Nothing generated yet"
                description="Pick platforms, describe the content and generate. Each post includes a caption, hashtags and a thumbnail concept."
              />
            </div>
          ) : (
            <div className="mt-2.5 grid gap-2 lg:grid-cols-2">
              {posts.map((post) => (
                <article key={post.id} className="rounded-xl border border-[#2a1e4d] bg-[#080414]/60 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="brand">{PLATFORM_LABEL[post.platform]}</Badge>
                    <span className="text-[9px] text-[#6f679a]">{timeAgo(post.createdAt)}</span>
                  </div>
                  <h3 className="mt-1.5 text-[12px] font-semibold text-white">{post.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-[#c2bbdd]">{post.caption}</p>
                  <p className="mt-1 text-[10.5px] text-brand-300">{post.hashtags.join(" ")}</p>
                  {post.thumbnailConcept && (
                    <p className="mt-1 text-[9.5px] leading-relaxed text-[#7c749f]">Thumbnail: {post.thumbnailConcept}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const ok = await copy(`${post.caption}\n\n${post.hashtags.join(" ")}`);
                        toast.push(ok ? "Caption copied." : "Clipboard blocked.", ok ? "success" : "error");
                      }}
                    >
                      <Copy size={11} /> Copy
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => schedule(post.id)}>
                      <CalendarPlus size={11} /> Schedule
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="mt-3 text-[9.5px] leading-relaxed text-[#6f679a]">
            Nothing is posted to any platform automatically. The queue records your intent so you can publish manually or wire
            platform APIs later.
          </p>
        </Panel>
      </div>
    </div>
  );
}
