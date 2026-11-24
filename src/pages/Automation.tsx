import { useState } from "react";
import { ArrowRight, Play, Plus, Sparkles, Trash2, Workflow as WorkflowIcon, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, EmptyState, Input, Panel, SectionHeader, Textarea } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { ProviderHint } from "@/components/ProviderHint";
import { useToast } from "@/components/ui/toast";
import { useSettings, useWorkspace, mutateWorkspace } from "@/lib/store";
import { AIError, chat } from "@/lib/ai";
import { timeAgo, uid } from "@/lib/utils";
import type { Workflow } from "@/lib/types";

const TEMPLATES: Array<Pick<Workflow, "name" | "trigger" | "steps">> = [
  {
    name: "Video to publish pack",
    trigger: "A new video project is analysed",
    steps: [
      { id: "s1", action: "Extract hooks", detail: "Pull 3 opening hooks from the transcript" },
      { id: "s2", action: "Write script", detail: "Write a 45-second original script from the strongest angle" },
      { id: "s3", action: "Captions", detail: "Produce TikTok and Instagram captions with hashtags" },
      { id: "s4", action: "Schedule", detail: "Suggest tomorrow's publish time" },
    ],
  },
  {
    name: "Weekly trend repurpose",
    trigger: "Every Monday",
    steps: [
      { id: "s1", action: "Pick angle", detail: "Choose a niche angle with a clear curiosity gap" },
      { id: "s2", action: "Hook + outline", detail: "Write a hook and 5-beat outline" },
      { id: "s3", action: "Voiceover", detail: "Draft a 30-second narration" },
    ],
  },
];

export default function Automation() {
  const ws = useWorkspace();
  const settings = useSettings();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("Manual run");
  const [stepsText, setStepsText] = useState("Extract hooks\nWrite script\nGenerate captions");
  const [runTarget, setRunTarget] = useState<Workflow | null>(null);
  const [topic, setTopic] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ name: string; text: string } | null>(null);

  const create = () => {
    if (!name.trim()) {
      toast.push("Name the workflow first.", "error");
      return;
    }
    const steps = stepsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ id: uid("step"), action: line, detail: "" }));
    if (!steps.length) {
      toast.push("Add at least one step.", "error");
      return;
    }
    const wf: Workflow = { id: uid("wf"), name, trigger, steps, enabled: true, createdAt: Date.now() };
    mutateWorkspace((d) => {
      d.workflows.unshift(wf);
    });
    setOpen(false);
    setName("");
    toast.push("Workflow created.", "success");
  };

  const addTemplate = (t: (typeof TEMPLATES)[number]) => {
    mutateWorkspace((d) => {
      d.workflows.unshift({ ...t, id: uid("wf"), enabled: false, createdAt: Date.now() });
    });
    toast.push(`Template “${t.name}” added. Enable it when ready.`, "success");
  };

  const runFlow = async () => {
    if (!runTarget) return;
    setRunning(true);
    try {
      const result = await chat({
        feature: "analysis",
        system:
          "You execute a creator workflow step by step. Produce concrete, original output for each step, labelled by step name. Never claim to have published or scheduled anything on a platform.",
        prompt: `Workflow: ${runTarget.name}\nTrigger: ${runTarget.trigger}\nSteps:\n${runTarget.steps
          .map((s, i) => `${i + 1}. ${s.action}${s.detail ? ` — ${s.detail}` : ""}`)
          .join("\n")}\n\nSubject: ${topic || "A short-form creator video about practical AI tools"}\n\nExecute every step and return the final production pack as plain text with headings.`,
        temperature: 0.8,
        maxTokens: 2200,
        cloudApiBase: settings.cloudApiBase,
      });
      setOutput({ name: runTarget.name, text: result.text });
      mutateWorkspace((d) => {
        d.scripts.unshift({
          id: uid("script"),
          title: `${runTarget.name} — ${new Date().toLocaleDateString()}`,
          format: "short",
          body: result.text,
          createdAt: Date.now(),
        });
      });
      setRunTarget(null);
      toast.push(`Workflow executed via ${result.provider}. Output saved as a script.`, "success");
    } catch (err) {
      toast.push(err instanceof AIError ? err.message : "Workflow run failed.", "error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<WorkflowIcon size={18} />}
        title="Automation Workflows"
        description="Chain the studio's steps into repeatable production runs. Runs execute your configured AI provider — they never post to a platform on their own."
        actions={<Button size="sm" variant="primary" onClick={() => setOpen(true)}><Plus size={13} /> New workflow</Button>}
      />
      <ProviderHint feature="Workflow execution" />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="p-3.5">
          <SectionHeader icon={<WorkflowIcon size={16} />} title="Your workflows" right={<Badge tone="neutral">{ws.workflows.length}</Badge>} />
          {ws.workflows.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={<WorkflowIcon size={18} />}
                title="No workflows yet"
                description="Create one from scratch or start with a template. Each run produces a production pack you can edit and save."
              />
            </div>
          ) : (
            <div className="mt-2.5 space-y-2">
              {ws.workflows.map((wf) => (
                <div key={wf.id} className="rounded-xl border border-[#2a1e4d] bg-[#080414]/60 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12.5px] font-semibold text-white">{wf.name}</p>
                    <Badge tone={wf.enabled ? "success" : "neutral"}>{wf.enabled ? "Enabled" : "Paused"}</Badge>
                    <span className="ml-auto text-[9.5px] text-[#6f679a]">{timeAgo(wf.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#8e86b1]">Trigger: {wf.trigger}</p>
                  <ol className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-[#b6aed6]">
                    {wf.steps.map((s, i) => (
                      <span key={s.id} className="flex items-center gap-1">
                        <span className="rounded bg-white/[0.05] px-1.5 py-0.5">{s.action}</span>
                        {i < wf.steps.length - 1 && <ArrowRight size={9} className="text-[#5b5378]" />}
                      </span>
                    ))}
                  </ol>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => { setRunTarget(wf); setTopic(""); }}>
                      <Play size={11} /> Run once
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        mutateWorkspace((d) => {
                          const target = d.workflows.find((x) => x.id === wf.id);
                          if (target) target.enabled = !target.enabled;
                        })
                      }
                    >
                      {wf.enabled ? "Pause" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-rose-300"
                      aria-label="Delete workflow"
                      onClick={() => {
                        if (!confirm(`Delete “${wf.name}”?`)) return;
                        mutateWorkspace((d) => {
                          d.workflows = d.workflows.filter((x) => x.id !== wf.id);
                        });
                      }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-3">
          <Panel className="p-3.5">
            <SectionHeader icon={<Zap size={16} />} title="Templates" />
            <div className="mt-2 space-y-1.5">
              {TEMPLATES.map((t) => (
                <div key={t.name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                  <p className="text-[11.5px] font-medium text-white">{t.name}</p>
                  <p className="text-[9.5px] text-[#8e86b1]">{t.steps.length} steps · {t.trigger}</p>
                  <Button size="sm" variant="ghost" className="mt-1 h-6 px-0 text-brand-300" onClick={() => addTemplate(t)}>
                    Add template →
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
          {output && (
            <Panel className="p-3.5">
              <SectionHeader icon={<Sparkles size={16} />} title={output.name} subtitle="Latest run output" />
              <pre className="mt-2 max-h-[280px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-[#06030f]/80 p-2 text-[10.5px] leading-relaxed text-[#b6aed6]">
                {output.text}
              </pre>
              <p className="mt-1.5 text-[9px] text-[#6f679a]">Saved to Script Studio automatically.</p>
            </Panel>
          )}
        </div>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New workflow"
        description="One step per line. Steps run in order when you execute the workflow."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={create}>Create</Button></>}
      >
        <label className="block">
          <span className="label">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tuesday carousel pack" />
        </label>
        <label className="block">
          <span className="label">Trigger</span>
          <Input value={trigger} onChange={(e) => setTrigger(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Steps</span>
          <Textarea value={stepsText} onChange={(e) => setStepsText(e.target.value)} className="min-h-[120px] font-mono text-[11.5px]" />
        </label>
      </Dialog>

      <Dialog
        open={Boolean(runTarget)}
        onClose={() => setRunTarget(null)}
        title={`Run “${runTarget?.name ?? ""}”`}
        description="The workflow will call your configured AI provider once and save the result as a script."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRunTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={runFlow} loading={running}>
              <Play size={13} /> Execute
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="label">Subject (optional)</span>
          <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What should this run be about?" />
        </label>
      </Dialog>
    </div>
  );
}
