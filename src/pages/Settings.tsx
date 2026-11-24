import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, FlaskConical, RefreshCw, Settings2, ShieldCheck, Upload, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, Input, Panel, SectionHeader, Select, Spinner, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useConnections } from "@/lib/hooks";
import { loadSampleWorkspace, mutateWorkspace, resetWorkspace, updateSettings, useSettings, useWorkspace } from "@/lib/store";
import { testConnection } from "@/lib/ai";
import { fetchVideoMetadata } from "@/lib/metadata";
import { downloadText, timeAgo } from "@/lib/utils";
import { APP_INFO } from "@/lib/appInfo";

interface CheckResult {
  id: string;
  label: string;
  state: "pending" | "running" | "pass" | "fail";
  detail: string;
}

export default function Settings() {
  const ws = useWorkspace();
  const settings = useSettings();
  const connections = useConnections();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [brandVoice, setBrandVoice] = useState(settings.brandVoice);
  const [cloudApiBase, setCloudApiBase] = useState(settings.cloudApiBase);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const storageBytes = new Blob([JSON.stringify(ws)]).size;

  const saveSettings = () => {
    updateSettings({ brandVoice, cloudApiBase: cloudApiBase.trim() });
    toast.push("Settings saved.", "success");
  };

  const exportWorkspace = () => {
    downloadText(
      `tj-studio-workspace-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(ws, null, 2),
      "application/json",
    );
  };

  const importWorkspace = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.projects)) {
          throw new Error("Not a studio workspace export.");
        }
        mutateWorkspace((draft) => {
          Object.assign(draft, parsed, { version: 1 });
        });
        toast.push("Workspace imported.", "success");
      } catch (err) {
        toast.push(err instanceof Error ? err.message : "Import failed.", "error");
      }
    };
    reader.readAsText(file);
  };

  const runDiagnostics = async () => {
    setRunning(true);
    const initial: CheckResult[] = [
      { id: "storage", label: "Local database (browser storage)", state: "running", detail: "" },
      { id: "metadata", label: "Public metadata endpoint", state: "pending", detail: "" },
      ...connections.map((c) => ({
        id: `provider-${c.providerId}`,
        label: `AI provider — ${c.providerId}`,
        state: "pending" as const,
        detail: "",
      })),
      { id: "worker", label: "Cloudflare Worker proxy", state: "pending", detail: "" },
    ];
    setChecks(initial);
    const update = (id: string, patch: Partial<CheckResult>) =>
      setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

    try {
      window.localStorage.setItem("__tjv_diag__", "1");
      window.localStorage.removeItem("__tjv_diag__");
      update("storage", { state: "pass", detail: `${ws.projects.length} projects · ${(storageBytes / 1024).toFixed(1)} KB used` });
    } catch {
      update("storage", { state: "fail", detail: "localStorage is unavailable (private mode or blocked)." });
    }

    try {
      const meta = await fetchVideoMetadata("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
      update("metadata", {
        state: meta.title ? "pass" : "fail",
        detail: meta.title ? `Reached oEmbed — “${meta.title.slice(0, 48)}”` : "Endpoint responded without a title.",
      });
    } catch (err) {
      update("metadata", { state: "fail", detail: err instanceof Error ? err.message : "Metadata request failed." });
    }

    for (const conn of connections) {
      const target = { ...conn, cloudApiBase: settings.cloudApiBase } as typeof conn & { cloudApiBase?: string };
      const result = await testConnection(target);
      update(`provider-${conn.providerId}`, { state: result.ok ? "pass" : "fail", detail: result.message });
    }

    if (settings.cloudApiBase.trim()) {
      try {
        const res = await fetch(`${settings.cloudApiBase.replace(/\/+$/, "")}/api/health`);
        const data = await res.json();
        update("worker", { state: res.ok ? "pass" : "fail", detail: res.ok ? `Worker healthy · providers: ${(data.providers ?? []).join(", ") || "none"}` : `HTTP ${res.status}` });
      } catch (err) {
        update("worker", { state: "fail", detail: err instanceof Error ? err.message : "Worker unreachable." });
      }
    } else {
      update("worker", { state: "fail", detail: "No Worker URL configured (optional for browser-only use)." });
    }
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<Settings2 size={18} />}
        title="Settings & Diagnostics"
        description="Studio preferences, workspace data and real connection tests. Nothing here reports a pass unless it actually ran."
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Panel className="p-3.5">
            <SectionHeader icon={<Settings2 size={16} />} title="Studio preferences" />
            <div className="mt-2.5 space-y-2.5">
              <label className="block">
                <span className="label">Brand voice</span>
                <Textarea value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} className="min-h-[70px] text-[12px]" />
                <span className="mt-1 block text-[9.5px] text-[#7c749f]">Included with every generation request.</span>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Default aspect ratio</span>
                  <Select
                    value={settings.defaultAspect}
                    onChange={(e) => updateSettings({ defaultAspect: e.target.value })}
                    className="h-9 text-[11.5px]"
                  >
                    {["9:16", "16:9", "1:1", "4:5"].map((a) => <option key={a}>{a}</option>)}
                  </Select>
                </label>
                <label className="block">
                  <span className="label">Cloudflare Worker URL</span>
                  <Input
                    value={cloudApiBase}
                    onChange={(e) => setCloudApiBase(e.target.value)}
                    placeholder="https://tj-studio-api.your-name.workers.dev"
                    className="h-9 font-mono text-[10.5px]"
                  />
                </label>
              </div>
              <Button size="sm" variant="primary" onClick={saveSettings}>Save preferences</Button>
            </div>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeader icon={<Database size={16} />} title="Workspace data" subtitle="Local-first storage in this browser" />
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10.5px] sm:grid-cols-4">
              {[
                ["Projects", ws.projects.length],
                ["Transcripts", ws.transcripts.length],
                ["Scripts", ws.scripts.length],
                ["Content", ws.social.length + ws.images.length + ws.storyboards.length + ws.voiceovers.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                  <p className="text-[15px] font-bold text-white">{value}</p>
                  <p className="text-[9.5px] text-[#8e86b1]">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[9.5px] text-[#7c749f]">
              About {(storageBytes / 1024).toFixed(1)} KB stored · last change {ws.projects[0] ? timeAgo(ws.projects[0].updatedAt) : "—"}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Button size="sm" variant="secondary" onClick={exportWorkspace}><Download size={12} /> Export JSON backup</Button>
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={12} /> Import backup</Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!confirm("Load the labelled sample workspace? It replaces current projects and content.")) return;
                  loadSampleWorkspace();
                  toast.push("Sample workspace loaded (marked as sample data).", "success");
                }}
              >
                Load sample data
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (!confirm("Delete ALL workspace data in this browser? API keys are managed separately.")) return;
                  resetWorkspace();
                  toast.push("Workspace reset.", "info");
                }}
              >
                Reset workspace
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importWorkspace(file);
                }}
              />
            </div>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeader
              icon={<FlaskConical size={16} />}
              title="Diagnostics"
              right={<Button size="sm" variant="primary" onClick={runDiagnostics} loading={running}><RefreshCw size={12} /> Run checks</Button>}
            />
            {checks.length === 0 ? (
              <p className="mt-2 text-[11px] leading-relaxed text-[#8e86b1]">
                Run the checks to verify browser storage, the public metadata endpoint, each connected AI provider and the Worker
                proxy. Failures are reported as failures.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2">
                    <span className="mt-0.5">
                      {c.state === "running" ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : c.state === "pass" ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : c.state === "fail" ? (
                        <XCircle size={14} className="text-rose-400" />
                      ) : (
                        <AlertTriangle size={14} className="text-[#5b5378]" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#ded8f7]">{c.label}</p>
                      <p className="break-words text-[10px] leading-snug text-[#8e86b1]">{c.detail || "Waiting…"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel className="p-3.5">
            <SectionHeader icon={<ShieldCheck size={16} />} title="Security posture" />
            <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-[#a29ac4]">
              <li>• API keys live in this browser only, in a separate storage key from workspace content.</li>
              <li>• Keys are never logged, never included in exports, and never written to project records.</li>
              <li>• Backups contain workspace content only.</li>
              <li>• For multi-device production use, deploy the Worker and keep provider keys as Cloudflare secrets.</li>
            </ul>
            <p className="mt-2 text-[9.5px] text-[#6f679a]">
              This build has no server-side accounts, so there is no cross-user data surface. Add Cloudflare Access if you deploy
              privately.
            </p>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeader icon={<CheckCircle2 size={16} />} title="About" />
            <div className="mt-2 space-y-1 text-[10.5px] text-[#a29ac4]">
              <p className="text-[12px] font-semibold text-white">{APP_INFO.name}</p>
              <p className="text-brand-300">{APP_INFO.tagline}</p>
              <p>Version {APP_INFO.version}</p>
              <p>Build: browser-first · Cloudflare-ready</p>
              <p className="pt-1 text-[9.5px] leading-relaxed text-[#7c749f]">{APP_INFO.disclaimer}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="success">Free Forever</Badge>
              <Badge tone="neutral">No subscription</Badge>
              <Badge tone="info">Open source credits</Badge>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
