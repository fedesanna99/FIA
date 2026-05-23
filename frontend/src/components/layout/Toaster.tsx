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
    ringIcon: "text-accent",
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
            className="bg-bg-elevated border border-border-light shadow-dialog p-3.5 min-w-[300px] max-w-[360px] flex items-start gap-2.5 animate-slide-up"
            role="status"
            aria-live="polite"
          >
            <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border ${tone.bgIcon} ${tone.ringIcon} border-current/30`}>
              {tone.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-semibold tracking-tight-1 text-ink mb-0.5 break-words">{title}</div>
              {description && (
                <div className="text-[11px] text-ink-2 font-mono break-words leading-snug">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-ink-3 hover:text-ink hover:bg-bg-hover p-1 flex-shrink-0 transition-colors"
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
