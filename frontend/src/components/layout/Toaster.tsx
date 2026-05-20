import { useToastStore } from "../../store/toastStore";

const STYLE = {
  success: { bg: "bg-accent-success/15 border-accent-success/40 text-accent-success", icon: "✓" },
  error:   { bg: "bg-accent-danger/15 border-accent-danger/40 text-accent-danger",   icon: "✕" },
  warning: { bg: "bg-accent-warning/15 border-accent-warning/40 text-accent-warning", icon: "⚠" },
  info:    { bg: "bg-accent-primary/15 border-accent-primary/40 text-accent-primary", icon: "ⓘ" },
} as const;

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed bottom-12 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const s = STYLE[t.level];
        return (
          <div
            key={t.id}
            className={`border rounded px-3 py-2 text-xs flex items-start gap-2 shadow-lg backdrop-blur ${s.bg}`}
            onClick={() => dismiss(t.id)}
          >
            <span className="font-bold mt-0.5">{s.icon}</span>
            <span className="flex-1">{t.message}</span>
            <button className="text-ink-dim hover:text-ink ml-2" title="Chiudi">×</button>
          </div>
        );
      })}
    </div>
  );
}
