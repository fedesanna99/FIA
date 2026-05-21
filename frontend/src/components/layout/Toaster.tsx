/**
 * Toaster (alpha.30) — refactor visivo mockup v1.3.
 *
 * Pattern: card bg-bg-panel + bordo + shadow-elev. Icona in cerchio colorato
 * a sinistra (tonalita' = level). Titolo bold, descrizione mono opzionale
 * (split del message su " · " o "\n"). Close X in alto a destra.
 *
 * Il toastStore espone solo `message`: per ora se contiene " · " o "\n"
 * lo splittiamo in titolo + descrizione, altrimenti tutto e' titolo.
 * Quando arriveranno azioni strutturate (es. "Vedi report", "Riavvia")
 * basterà estendere `Toast` con `actions?: ToastAction[]`.
 */
import { Check, X as XIcon, AlertTriangle, Info, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useToastStore, type ToastLevel } from "../../store/toastStore";

const TONE: Record<
  ToastLevel,
  { icon: ReactNode; bgIcon: string; ringIcon: string }
> = {
  success: {
    icon: <Check className="w-4 h-4" />,
    bgIcon: "bg-bg-success",
    ringIcon: "text-success",
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    bgIcon: "bg-bg-coral",
    ringIcon: "text-danger",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bgIcon: "bg-bg-warn",
    ringIcon: "text-warn",
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    bgIcon: "bg-bg-info",
    ringIcon: "text-info",
  },
};

function splitMessage(msg: string): { title: string; description: string | null } {
  // Split su " · " oppure newline. Se il separatore non c'e', tutto e' titolo.
  const sep = msg.includes("\n") ? "\n" : msg.includes(" · ") ? " · " : null;
  if (!sep) return { title: msg, description: null };
  const [title, ...rest] = msg.split(sep);
  return { title: title.trim(), description: rest.join(sep).trim() };
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed bottom-12 right-6 z-[200] flex flex-col gap-2">
      {toasts.map((t) => {
        const tone = TONE[t.level];
        const { title, description } = splitMessage(t.message);
        return (
          <div
            key={t.id}
            className="bg-bg-panel border border-border rounded-lg shadow-elev p-3.5 min-w-[280px] max-w-[340px] flex items-start gap-2.5 animate-slide-up"
            role="status"
            aria-live="polite"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tone.bgIcon} ${tone.ringIcon}`}>
              {tone.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-ink mb-0.5 break-words">{title}</div>
              {description && (
                <div className="text-[11px] text-ink-muted font-mono break-words">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-ink-dim hover:text-ink p-0.5 flex-shrink-0"
              aria-label="Chiudi notifica"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
