import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ExternalLink, KeyRound, PlugZap, ShieldCheck } from "lucide-react";
import { Badge, Button, Input, Panel, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useConnections } from "@/lib/hooks";
import { getProvider, maskKey, removeConnection, upsertConnection, type ProviderId } from "@/lib/providers";
import { testConnection } from "@/lib/ai";
import { useSettings } from "@/lib/store";

const QUICK_PROVIDERS: ProviderId[] = ["gemini", "openrouter", "groq"];

export function ApiSetupPanel() {
  const connections = useConnections();
  const settings = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const [providerId, setProviderId] = useState<ProviderId>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"connect" | "test" | null>(null);

  const connected = connections[0];
  const def = getProvider(providerId);

  const connect = async () => {
    if (!apiKey.trim()) {
      toast.push("Paste an API key first.", "error");
      return;
    }
    setBusy("connect");
    const connection = {
      providerId,
      apiKey: apiKey.trim(),
      model: def.defaultModel,
      mode: "direct" as const,
      connectedAt: Date.now(),
    };
    upsertConnection(connection);
    const result = await testConnection(connection);
    upsertConnection({ ...connection, lastTest: { ...result, at: Date.now() } });
    setBusy(null);
    if (result.ok) {
      setApiKey("");
      toast.push(result.message, "success");
    } else {
      toast.push(`Saved, but the test failed: ${result.message}`, "error");
    }
  };

  const test = async () => {
    if (!connected) return;
    setBusy("test");
    const target = { ...connected };
    if (settings.cloudApiBase) (target as typeof target & { cloudApiBase?: string }).cloudApiBase = settings.cloudApiBase;
    const result = await testConnection(target);
    upsertConnection({ ...connected, lastTest: { ...result, at: Date.now() } });
    setBusy(null);
    toast.push(result.message, result.ok ? "success" : "error");
  };

  return (
    <Panel className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
            <KeyRound size={15} />
          </span>
          <div>
            <h2 className="text-[12.5px] font-semibold text-white">API Setup</h2>
            <p className="text-[10px] text-[#8e86b1]">Free option</p>
          </div>
        </div>
        <Badge tone={connected ? "success" : "warn"}>{connected ? "Connected" : "Not connected"}</Badge>
      </div>

      <div className="mt-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.07] p-2.5">
        <p className="text-[11px] font-semibold text-brand-200">Need more AI power?</p>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#a99fd0]">
          Add a free API key to unlock transcription, analysis and generation at no cost.
        </p>
      </div>

      {connected ? (
        <div className="mt-3 space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-[#8e86b1]">Provider</span>
            <span className="font-medium text-white">{getProvider(connected.providerId).name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8e86b1]">Key</span>
            <span className="font-mono text-[10px] text-[#c2bbdd]">{maskKey(connected.apiKey) || "Worker secret"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8e86b1]">Free tier</span>
            <Badge tone="success">Free key</Badge>
          </div>
          {connected.lastTest && (
            <p className={`text-[10px] leading-relaxed ${connected.lastTest.ok ? "text-emerald-400" : "text-rose-400"}`}>
              {connected.lastTest.ok ? "✓ " : "✕ "}
              {connected.lastTest.message}
            </p>
          )}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Button size="sm" onClick={test} loading={busy === "test"}>
              Test Connection
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate("/providers")}>
              Manage
            </Button>
          </div>
          <button
            type="button"
            className="w-full text-[10px] text-[#7c749f] hover:text-rose-300"
            onClick={() => {
              removeConnection(connected.providerId);
              toast.push(`${getProvider(connected.providerId).name} disconnected.`, "info");
            }}
          >
            Disconnect key
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Select
            aria-label="Provider"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value as ProviderId)}
            className="h-9 text-[11.5px]"
          >
            {QUICK_PROVIDERS.map((id) => (
              <option key={id} value={id}>
                {getProvider(id).name}
              </option>
            ))}
          </Select>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key…"
            aria-label="API key"
            autoComplete="off"
            className="h-9 font-mono text-[11.5px]"
          />
          <Button size="sm" variant="primary" className="w-full" onClick={connect} loading={busy === "connect"}>
            <PlugZap size={13} /> Connect Key
          </Button>
          <p className="flex items-center gap-1 text-[9.5px] leading-relaxed text-[#7c749f]">
            <ShieldCheck size={11} className="shrink-0 text-emerald-400" />
            Stored in this browser only. Never committed to GitHub.
          </p>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2">
        <span className="flex items-center gap-1 text-[9.5px] text-emerald-400">
          <CheckCircle2 size={11} /> Free tier available
          <span className="text-[#7c749f]">· no subscription</span>
        </span>
        <a
          href={def.keyUrl || "https://ai.google.dev/gemini-api/docs/pricing"}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-[9.5px] text-[#a99fd0] hover:text-white"
        >
          Learn More <ExternalLink size={10} />
        </a>
      </div>
      <Link to="/providers" className="mt-1 block text-[9.5px] text-[#7c749f] hover:text-brand-300">
        Compare all supported providers →
      </Link>
    </Panel>
  );
}
