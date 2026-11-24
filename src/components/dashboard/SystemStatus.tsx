import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Database, HardDrive, Server } from "lucide-react";
import { Badge, Panel, SectionHeader } from "@/components/ui/primitives";
import { useConnections } from "@/lib/hooks";
import { useSettings, useWorkspace } from "@/lib/store";

function Row({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "warn" | "neutral";
}) {
  return (
    <div className="flex items-center gap-2 py-[5px]">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/[0.04] text-[#a29ac4]">{icon}</span>
      <span className="flex-1 truncate text-[11px] text-[#c2bbdd]">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

export function SystemStatus() {
  const connections = useConnections();
  const ws = useWorkspace();
  const settings = useSettings();
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    try {
      const key = "__tjv_probe__";
      window.localStorage.setItem(key, "1");
      window.localStorage.removeItem(key);
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, []);

  const saved = ws.projects.length + ws.transcripts.length + ws.scripts.length + ws.social.length;
  const useWorker = Boolean(settings.cloudApiBase);

  return (
    <Panel className="flex h-full flex-col p-3.5">
      <SectionHeader
        icon={<Activity size={16} />}
        title="System Status"
        right={
          <Link to="/settings" className="text-[10.5px] font-medium text-brand-300 hover:text-brand-200">
            Details →
          </Link>
        }
      />
      <div className="mt-2 divide-y divide-white/[0.05]">
        <Row
          icon={<Server size={12} />}
          label="AI Providers"
          value={connections.length ? `${connections.length} connected` : "Not connected"}
          tone={connections.length ? "success" : "warn"}
        />
        <Row
          icon={<Database size={12} />}
          label="Database"
          value={storageOk ? `Local · ${saved} items` : "Unavailable"}
          tone={storageOk ? "success" : "warn"}
        />
        <Row
          icon={<HardDrive size={12} />}
          label="File Storage"
          value={useWorker ? "Worker proxy configured" : "Browser only"}
          tone={useWorker ? "success" : "neutral"}
        />
        <Row
          icon={<Activity size={12} />}
          label="Background Jobs"
          value={useWorker ? "Worker endpoint set" : "Not configured"}
          tone={useWorker ? "success" : "neutral"}
        />
      </div>
      <p className="mt-auto pt-2 text-[9px] leading-relaxed text-[#6f679a]">
        Status reflects this browser session. Nothing is reported active unless it is actually configured.
      </p>
    </Panel>
  );
}
