import { useEffect, useState, useSyncExternalStore } from "react";
import { loadConnections, type ProviderConnection } from "./providers";

const connectionListeners = new Set<() => void>();
let connectionsSnapshot: ProviderConnection[] = typeof window === "undefined" ? [] : loadConnections();

function refreshConnections() {
  connectionsSnapshot = loadConnections();
  connectionListeners.forEach((l) => l());
}

export function subscribeConnections(listener: () => void) {
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
}

export function getConnectionsSnapshot() {
  return connectionsSnapshot;
}

if (typeof window !== "undefined") {
  window.addEventListener("tjv:connections", refreshConnections);
}

export function useConnections(): ProviderConnection[] {
  return useSyncExternalStore(subscribeConnections, getConnectionsSnapshot, getConnectionsSnapshot);
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      return true;
    } catch {
      return false;
    }
  };
  return { copied, copy };
}
