import { useState } from "react";
import { Link } from "react-router-dom";
import { Info, Sparkles, TrendingUp, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, Input, Panel, SectionHeader } from "@/components/ui/primitives";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { generateTrendIdeas, formatAIError } from "@/lib/generation";
import { timeAgo } from "@/lib/utils";

export default function Trends() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const [niche, setNiche] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (niche.trim().length < 3) {
      toast.push("Enter a niche or audience first.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await generateTrendIdeas(niche, {
        cloudApiBase: settings.cloudApiBase,
        brandVoice: settings.brandVoice,
      });
      mutateWorkspace((d) => {
        d.trends = result.trends;
      });
      toast.push(`${result.trends.length} editorial ideas generated via ${result.provider}. ${result.disclaimer}`, "success");
    } catch (err) {
      toast.push(formatAIError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const sample = ws.trends.some((t) => t.source === "sample");

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<TrendingUp size={18} />}
        title="Trend Research"
        description="Research angles worth testing in your niche. This build does not claim live platform trend data — connect a source or use labelled AI ideas."
      />
      <ProviderHint feature="Trend ideation" />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void run()}
          placeholder="Your niche, e.g. fitness for busy parents"
          className="h-11 flex-1 text-[12.5px]"
          aria-label="Niche"
        />
        <Button variant="primary" className="h-11 px-5" onClick={run} loading={busy}>
          <Sparkles size={14} /> Generate trend ideas
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel className="p-3.5">
          <SectionHeader
            icon={<TrendingUp size={16} />}
            title="Opportunity ranking"
            right={
              sample ? <Badge tone="sample">Sample data</Badge> : <Badge tone="info">AI editorial ideas</Badge>
            }
          />
          {sample && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-2.5 text-[10.5px] leading-relaxed text-amber-200/90">
              <Info size={13} className="mt-0.5 shrink-0" />
              These five topics are illustrative placeholders from the initial workspace. They are not measured trends. Generate
              ideas for your niche, or clear them.
            </div>
          )}
          <ul className="mt-2.5 space-y-1.5">
            {ws.trends.map((topic, i) => (
              <li key={topic.id} className="flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-[#c2bbdd]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-[#ded8f7]">{topic.topic}</p>
                  <p className="text-[9.5px] text-[#7c749f]">
                    {topic.source === "sample" ? "Sample topic" : "AI idea"} · {timeAgo(topic.checkedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-400">
                    <TrendingUp size={11} />+{topic.growth}%
                  </p>
                  <p className="text-[8.5px] text-[#6f679a]">{topic.source === "sample" ? "illustrative" : "confidence"}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-300"
              onClick={() => {
                if (!confirm("Clear all saved trend entries?")) return;
                mutateWorkspace((d) => { d.trends = []; });
              }}
            >
              <Trash2 size={12} /> Clear topics
            </Button>
            <Link to="/calendar" className="ml-auto inline-flex items-center text-[10.5px] text-brand-300 hover:text-brand-200">
              Plan around these →
            </Link>
          </div>
        </Panel>

        <Panel className="p-3.5">
          <SectionHeader icon={<Info size={16} />} title="How this works" />
          <div className="mt-2 space-y-2.5 text-[11px] leading-relaxed text-[#a29ac4]">
            <p>
              <strong className="text-white">No fabricated live data.</strong> Real trend metrics require an official platform API or
              a licensed trend provider. Neither is configured here, so the panel is clearly labelled.
            </p>
            <p>
              <strong className="text-white">AI ideation.</strong> With a text provider connected, the studio proposes angles based on
              your niche. These are editorial suggestions, not measurements.
            </p>
            <p>
              <strong className="text-white">Verification.</strong> Before producing content, check the idea in each platform's own
              search and analytics. The studio will never claim a topic is trending when it has not measured it.
            </p>
            <div className="rounded-lg border border-[#2a1e4d] bg-[#080414]/60 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-300">Connect real data later</p>
              <p className="mt-1 text-[10.5px] text-[#8e86b1]">
                Add a trend endpoint to the included Worker (`/api/trends`) and point Settings → Cloud API base at it. Until then,
                everything stays labelled.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
