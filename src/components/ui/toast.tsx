import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}
interface ToastContextValue {
  push: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ push: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-3), { id, tone, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-3 z-[80] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:bottom-5 sm:right-5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3 text-sm shadow-2xl backdrop-blur-md",
              toast.tone === "success" && "border-emerald-500/30 bg-[#0a1f18]/95 text-emerald-100",
              toast.tone === "error" && "border-rose-500/30 bg-[#210d15]/95 text-rose-100",
              toast.tone === "info" && "border-brand-500/30 bg-[#120a26]/95 text-[#e7e1ff]",
            )}
          >
            <span className="mt-0.5 shrink-0">
              {toast.tone === "success" ? (
                <CheckCircle2 size={16} />
              ) : toast.tone === "error" ? (
                <AlertTriangle size={16} />
              ) : (
                <Info size={16} />
              )}
            </span>
            <p className="flex-1 whitespace-pre-wrap leading-relaxed">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded p-0.5 opacity-60 hover:opacity-100"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
