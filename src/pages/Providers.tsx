import { useState } from "react";
import { AlertTriangle, CheckCircle2, Cpu, ExternalLink, KeyRound, Loader2, ShieldCheck, Unplug } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge, Button, Input, Panel, SectionHeader, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useConnections } from "@/lib/hooks";
import {
  PROVIDERS,
  getProvider,
  maskKey,
  removeConnection,
  upsertConnection,
  type ProviderConnection,
  type ProviderId,
} from "@/lib/providers";
import { testConnection } from "@/lib/ai";
import { useSettings, updateSettings } from "@/lib/store";
import type { AIFeature } from "@/lib/types";

const FEATURE_LABEL: Record<AIFeature, string> = {
  text: "Text",
  analysis: "Analysis",
  transcription: "Transcription",
  image: "Image",
  speech: "Speech",
};

export default function Providers() {
  const connections = useConnections();
  const settings = useSettings();
  const toast = useToast();
  const [expanded, setExpanded] = useState<ProviderId | null>(null);
  const [form, setForm] = useState<{ apiKey: string; model: string; baseUrl: string; mode: "direct" | "proxy" }>({
    apiKey: "",
    model: "",
    baseUrl: "",
    mode: "direct",
  });
  const [busy, setBusy] = useState<string | null>(null);

  const openForm = (id: ProviderId) => {
    const existing = connections.find((c) => c.providerId === id);
    const def = getProvider(id);
    setForm({
      apiKey: existing?.apiKey ?? "",
      model: existing?.model ?? def.defaultModel,
      baseUrl: existing?.baseUrl ?? "",
      mode: existing?.mode ?? "direct",
    });
    setExpanded(id === expanded ? null : id);
  };

  const save = async (id: ProviderId, test: boolean) => {
    const def = getProvider(id);
    if (form.mode === "direct" && !form.apiKey.trim()) {
      toast.push("An API key is required for direct mode.", "error");
      return;
    }
    if (form.mode === "proxy" && !settings.cloudApiBase.trim()) {
      toast.push("Add your Worker URL in Settings before using proxy mode.", "error");
      return;
    }
    const conn: ProviderConnection = {
      providerId: id,
      apiKey: form.apiKey.trim() || undefined,
      model: form.model || def.defaultModel,
      baseUrl: form.baseUrl.trim() || undefined,
      mode: form.mode,
      connectedAt: Date.now(),
    };
    upsertConnection(conn);
    if (!test) {
      toast.push(`${def.name} configuration saved.`, "success");
      setExpanded(null);
      return;
    }
    setBusy(id);
    const target: ProviderConnection & { cloudApiBase?: string } = { ...conn, cloudApiBase: settings.cloudApiBase };
    const result = await testConnection(target);
    upsertConnection({ ...conn, lastTest: { ...result, at: Date.now() } });
    setBusy(null);
    toast.push(`${def.name}: ${result.message}`, result.ok ? "success" : "error");
  };

  return (
    <div className="space-y-3">
      <PageHeader
        icon={<Cpu size={18} />}
        title="AI Providers"
        description="Bring your own keys. Each feature can use a different provider, and the studio falls back to another connected provider when one fails."
      />

      <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-[11px] leading-relaxed text-emerald-100/85">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-400" />
        <p>
          Keys are stored in this browser's localStorage and are never committed to Git or written to a public database. For
          production, deploy the included Worker and store keys as Cloudflare secrets, then switch a provider to{" "}
          <strong>proxy</strong> mode.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-2.5">
          {PROVIDERS.map((def) => {
            const conn = connections.find((c) => c.providerId === def.id);
            const isOpen = expanded === def.id;
            return (
              <Panel key={def.id} className="p-3.5">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-300">
                    <Cpu size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-[13.5px] font-semibold text-white">{def.name}</h2>
                      {conn ? (
                        conn.lastTest ? (
                          <Badge tone={conn.lastTest.ok ? "success" : "danger"}>
                            {conn.lastTest.ok ? "Verified" : "Test failed"}
                          </Badge>
                        ) : (
                          <Badge tone="success">Connected</Badge>
                        )
                      ) : (
                        <Badge tone="neutral">Not connected</Badge>
                      )}
                      {def.features.map((f) => (
                        <span key={f} className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#a29ac4]">
                          {FEATURE_LABEL[f]}
                        </span>
                      ))}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#8e86b1]">{def.tagline}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#7c749f]">{def.freeTier}</p>

                    {conn && !isOpen && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-[#a29ac4]">
                        <span className="font-mono">{maskKey(conn.apiKey) || "worker secret"}</span>
                        <span>·</span>
                        <span>{conn.model}</span>
                        <span>·</span>
                        <span>{conn.mode}</span>
                        {conn.lastTest && (
                          <span className={conn.lastTest.ok ? "text-emerald-400" : "text-rose-400"}>· {conn.lastTest.message}</span>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button size="sm" variant={conn ? "secondary" : "primary"} onClick={() => openForm(def.id)}>
                        <KeyRound size={12} /> {conn ? "Replace key / configure" : "Connect"}
                      </Button>
                      {conn && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busy === def.id}
                            onClick={async () => {
                              setBusy(def.id);
                              const target: ProviderConnection & { cloudApiBase?: string } = { ...conn, cloudApiBase: settings.cloudApiBase };
                              const result = await testConnection(target);
                              upsertConnection({ ...conn, lastTest: { ...result, at: Date.now() } });
                              setBusy(null);
                              toast.push(`${def.name}: ${result.message}`, result.ok ? "success" : "error");
                            }}
                          >
                            {busy === def.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Test connection
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-300"
                            onClick={() => {
                              removeConnection(def.id);
                              toast.push(`${def.name} disconnected.`, "info");
                            }}
                          >
                            <Unplug size={12} /> Disconnect
                          </Button>
                        </>
                      )}
                      {def.keyUrl && (
                        <a
                          href={def.keyUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-brand-300 hover:bg-white/[0.06]"
                        >
                          Get free key <ExternalLink size={10} />
                        </a>
                      )}
                      <a
                        href={def.docsUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-[#8e86b1] hover:bg-white/[0.06] hover:text-white"
                      >
                        Docs <ExternalLink size={10} />
                      </a>
                    </div>

                    {isOpen && (
                      <div className="mt-2.5 space-y-2 rounded-xl border border-[#2a1e4d] bg-[#080414]/70 p-2.5">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="block">
                            <span className="label">Mode</span>
                            <Select
                              value={form.mode}
                              onChange={(e) => setForm({ ...form, mode: e.target.value as "direct" | "proxy" })}
                              className="h-9 text-[11.5px]"
                            >
                              <option value="direct">Direct from browser</option>
                              <option value="proxy">Cloudflare Worker proxy</option>
                            </Select>
                          </label>
                          <label className="block">
                            <span className="label">Model</span>
                            <Select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="h-9 text-[11.5px]">
                              {[...new Set([...def.models, form.model])].filter(Boolean).map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </Select>
                          </label>
                        </div>
                        {form.mode === "direct" && (
                          <label className="block">
                            <span className="label">API key</span>
                            <Input
                              type="password"
                              value={form.apiKey}
                              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                              placeholder={def.keyPrefix ? `${def.keyPrefix}…` : "Paste your key"}
                              autoComplete="off"
                              className="h-9 font-mono text-[11.5px]"
                            />
                          </label>
                        )}
                        <label className="block">
                          <span className="label">Base URL {def.id !== "custom" && <span className="normal-case text-[#6f679a]">(optional override)</span>}</span>
                          <Input
                            value={form.baseUrl}
                            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                            placeholder={def.baseUrl ?? "https://your-endpoint/v1"}
                            className="h-9 font-mono text-[11px]"
                          />
                        </label>
                        <p className="text-[9.5px] leading-relaxed text-[#7c749f]">{def.notes}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="primary" onClick={() => void save(def.id, true)} loading={busy === def.id}>
                            Save & test
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => void save(def.id, false)}>
                            Save only
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>

        <div className="space-y-3">
          <Panel className="p-3.5">
            <SectionHeader icon={<Cpu size={16} />} title="Task routing" subtitle="Which provider handles each feature" />
            <div className="mt-2 space-y-2">
              {(Object.keys(FEATURE_LABEL) as AIFeature[]).map((feature) => {
                const eligible = connections.filter((c) => getProvider(c.providerId).features.includes(feature));
                return (
                  <label key={feature} className="block">
                    <span className="label">{FEATURE_LABEL[feature]}</span>
                    <Select
                      value={settings.routing[feature] ?? ""}
                      onChange={(e) =>
                        updateSettings({
                          routing: { ...settings.routing, [feature]: e.target.value || undefined },
                        })
                      }
                      className="h-9 text-[11.5px]"
                    >
                      <option value="">Auto (first connected)</option>
                      {eligible.map((c) => (
                        <option key={c.providerId} value={c.providerId}>
                          {getProvider(c.providerId).name} · {c.model}
                        </option>
                      ))}
                    </Select>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-[#7c749f]">
              <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-400" />
              Auto routing is not hard-wired to any paid service. If the chosen provider fails, the next connected provider that
              supports the feature is tried.
            </p>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeader icon={<ShieldCheck size={16} />} title="Free-first rules" />
            <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-[#a29ac4]">
              <li>• No provider is billed until you add your own key.</li>
              <li>• Free tiers, credit grants and rate limits are always labelled as such.</li>
              <li>• Quotas and model access are controlled by the provider and can change.</li>
              <li>• Local work (saving, editing, exporting, charts) never calls an API.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
