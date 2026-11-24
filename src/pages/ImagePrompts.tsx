import { useState } from "react";
import { Copy, Download, Image as ImageIcon, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Input, Panel, SectionHeader, Select, Textarea } from "@/components/ui/primitives";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useCopy } from "@/lib/hooks";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { generateImagePrompts, formatAIError } from "@/lib/generation";
import { generateImage, AIError } from "@/lib/ai";
import { downloadText, timeAgo } from "@/lib/utils";

export default function ImagePrompts() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const { copy } = useCopy();
  const [concept, setConcept] = useState("");
  const [style, setStyle] = useState("cinematic neon editorial");
  const [aspect, setAspect] = useState("9:16");
  const [count, setCount] = useState("4");
  const [busy, setBusy] = useState(false);
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [rendered, setRendered] = useState<Record<string, string>>({});
  const [imageDialog, setImageDialog] = useState<{ url: string; prompt: string } | null>(null);

  const run = async () => {
    if (concept.trim().length < 5) {
      toast.push("Describe the visual concept first.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await generateImagePrompts(
        { concept, style, aspect, count: Number(count) || 4 },
        { cloudApiBase: settings.cloudApiBase, brandVoice: settings.brandVoice },
      );
      mutateWorkspace((d) => {
        d.images.unshift(...result.images);
      });
      toast.push(`${result.images.length} prompts generated via ${result.provider}.`, "success");
    } catch (err) {
      toast.push(formatAIError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const render = async (promptId: string, text: string) => {
    setRenderingId(promptId);
    try {
      const result = await generateImage(text, { aspect, cloudApiBase: settings.cloudApiBase });
      setRendered((prev) => ({ ...prev, [promptId]: result.dataUrl }));
      setImageDialog({ url: result.dataUrl, prompt: text });
      toast.push(`Image rendered with ${result.provider}. Download it if you want to keep it.`, "success");
    } catch (err) {
      toast.push(err instanceof AIError ? err.message : "Image rendering failed.", "error");
    } finally {
      setRenderingId(null);
    }
  };

  const images = [...ws.images].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<ImageIcon size={18} />}
        title="Image Prompt Studio"
        description="Write production-ready image prompts for thumbnails, b-roll and cover art. Optional rendering uses Gemini's image model when your key has access."
      />
      <ProviderHint feature="Image prompt generation" />

      <div className="grid gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel className="space-y-2.5 p-3.5">
          <SectionHeader icon={<Wand2 size={16} />} title="Prompt builder" />
          <label className="block">
            <span className="label">Concept</span>
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g. Futuristic creator studio with holographic play buttons"
              className="min-h-[84px] text-[12px]"
            />
          </label>
          <label className="block">
            <span className="label">Style</span>
            <Input value={style} onChange={(e) => setStyle(e.target.value)} className="h-9 text-[12px]" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label">Aspect</span>
              <Select value={aspect} onChange={(e) => setAspect(e.target.value)} className="h-9 text-[11.5px]">
                {["9:16", "16:9", "1:1", "4:5"].map((a) => <option key={a}>{a}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className="label">Prompts</span>
              <Input value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" className="h-9 text-[11.5px]" />
            </label>
          </div>
          <Button variant="primary" className="w-full" onClick={run} loading={busy}>
            <Sparkles size={14} /> Generate prompts
          </Button>
          <p className="text-[9.5px] leading-relaxed text-[#7c749f]">
            Gemini image rendering availability depends on your key, region and Google's current model access. Prompt generation
            works with any text provider.
          </p>
        </Panel>

        <Panel className="p-3.5">
          <SectionHeader
            icon={<ImageIcon size={16} />}
            title="Saved prompts"
            right={<Badge tone="neutral">{images.length}</Badge>}
          />
          {images.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={<ImageIcon size={18} />}
                title="No image prompts yet"
                description="Describe a concept and generate prompts. They are saved automatically and can be rendered or copied into any image tool."
              />
            </div>
          ) : (
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {images.map((img) => (
                <div key={img.id} className="rounded-xl border border-[#2a1e4d] bg-[#080414]/60 p-2.5">
                  {rendered[img.id] ? (
                    <button type="button" onClick={() => setImageDialog({ url: rendered[img.id], prompt: img.prompt })} className="mb-2 block w-full overflow-hidden rounded-lg">
                      <img src={rendered[img.id]} alt={img.prompt} className="h-32 w-full object-cover" />
                    </button>
                  ) : (
                    <div className="mb-2 grid h-20 place-items-center rounded-lg border border-dashed border-[#33265c] text-[9.5px] text-[#6f679a]">
                      Preview only when rendered
                    </div>
                  )}
                  <p className="line-clamp-4 text-[11px] leading-relaxed text-[#d7d1ee]">{img.prompt}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <Badge tone="neutral">{img.aspect ?? aspect}</Badge>
                    <span className="text-[9px] text-[#6f679a]">{timeAgo(img.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const ok = await copy(img.prompt);
                        toast.push(ok ? "Prompt copied." : "Clipboard blocked.", ok ? "success" : "error");
                      }}
                    >
                      <Copy size={11} /> Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      loading={renderingId === img.id}
                      onClick={() => void render(img.id, img.prompt)}
                    >
                      Render
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-rose-300"
                      aria-label="Delete prompt"
                      onClick={() => mutateWorkspace((d) => { d.images = d.images.filter((i) => i.id !== img.id); })}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {images.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => downloadText("image-prompts.txt", images.map((i) => `${i.prompt}${i.negative ? `\nNEGATIVE: ${i.negative}` : ""}`).join("\n\n"))}
            >
              <Download size={12} /> Export all prompts
            </Button>
          )}
        </Panel>
      </div>

      {imageDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-label="Close" onClick={() => setImageDialog(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[#2a1e4d] bg-[#0b0619] p-3">
            <img src={imageDialog.url} alt={imageDialog.prompt} className="w-full rounded-xl" />
            <p className="mt-2 line-clamp-3 text-[10.5px] text-[#8e86b1]">{imageDialog.prompt}</p>
            <div className="mt-2 flex gap-2">
              <a
                href={imageDialog.url}
                download="tj-ai-image.png"
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-gradient text-[12px] font-medium text-white"
              >
                <Download size={13} /> Download PNG
              </a>
              <Button size="md" variant="secondary" onClick={() => setImageDialog(null)}>Close</Button>
            </div>
            <p className="mt-2 text-[9px] text-[#6f679a]">Images are generated by your provider and are not stored in the workspace.</p>
          </div>
        </div>
      )}
    </div>
  );
}
