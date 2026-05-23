/**
 * ChecksRail (Precision v2.0) — B3 verifiche normative · lista verticale.
 *
 * Mockup B3 di handoff Claude Design. Lista compatta di checks normativi
 * (EC2/EC3/EC8/NTC18 ecc.) con icon-state + name + sub + meta. Click su
 * un item seleziona il check corrente (per la `<ChecksDetailTable>` a
 * destra).
 *
 * Animations:
 *   - Mount: `animate-fade-in` sulla rail intera (120ms)
 *   - Active indicator: barra cyan 2px sinistra con `transition-all duration-mid`
 *     che scivola tra item attivi → sensazione "spostamento focus" anziché
 *     ridisegno completo
 *   - Hover: bg-bg-hover con `transition-colors duration-fast`
 *   - Status icon: `animate-pulse` quando state="active-warn" (focus su critico)
 *
 * Stateless: il consumer passa `checks`, `activeId`, `onSelect`.
 */
import { Check, AlertTriangle, X, type LucideIcon } from "lucide-react";
import { Chip } from "../ui";
import { cn } from "../ui/cn";

export interface CheckItem {
  id: string;
  name: string;
  /** Es. "EC3 §6.2.5" o "NTC18 §7.3" */
  reference: string;
  state: "pass" | "warn" | "fail" | "queued";
  /** Es. "12 / 12" oppure "UC 0.88" */
  meta?: string;
}

interface Props {
  checks: readonly CheckItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

const STATE_META: Record<CheckItem["state"], {
  icon: LucideIcon;
  iconClass: string;
  pulse?: boolean;
  label: string;
}> = {
  pass:   { icon: Check,          iconClass: "bg-success text-white border-success",    label: "OK" },
  warn:   { icon: AlertTriangle,  iconClass: "bg-warn text-white border-warn",          label: "Attenzione", pulse: true },
  fail:   { icon: X,              iconClass: "bg-danger text-white border-danger",      label: "Fail" },
  queued: { icon: Check,          iconClass: "bg-bg-hover text-ink-3 border-border",    label: "In coda" },
};

export function ChecksRail({ checks, activeId, onSelect, className }: Props) {
  return (
    <nav
      className={cn(
        "bg-bg-panel border border-border overflow-y-auto animate-fade-in",
        className,
      )}
      aria-label="Verifiche normative"
      data-testid="checks-rail"
    >
      <header className="px-3 py-2 border-b border-border bg-bg sticky top-0 z-panel">
        <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3">
          Checks · {checks.length} totali
        </div>
      </header>
      <ul className="divide-y divide-border">
        {checks.map((c) => {
          const meta = STATE_META[c.state];
          const Icon = meta.icon;
          const isActive = c.id === activeId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect?.(c.id)}
                aria-current={isActive ? "true" : undefined}
                data-testid={`check-${c.id}`}
                className={cn(
                  "w-full grid grid-cols-[20px_1fr_auto] gap-2 items-center text-left",
                  "px-3 py-2.5 transition-colors duration-fast",
                  "hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
                  "relative",
                  isActive && "bg-accent-subtle",
                )}
              >
                {/* Active indicator (slide-in) */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2 bottom-2 w-0.5 bg-accent animate-slide-right"
                  />
                )}
                <span
                  className={cn(
                    "w-5 h-5 inline-flex items-center justify-center border",
                    meta.iconClass,
                    meta.pulse && "animate-pulse",
                  )}
                  aria-hidden="true"
                >
                  <Icon className="w-3 h-3" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <div className={cn(
                    "text-base font-medium truncate",
                    isActive ? "text-ink" : "text-ink-2",
                  )}>
                    {c.name}
                  </div>
                  <div className="font-mono text-[10px] text-ink-3 truncate">{c.reference}</div>
                </div>
                {c.meta && (
                  <Chip
                    tone={c.state === "fail" ? "danger" : c.state === "warn" ? "warn" : c.state === "pass" ? "success" : "neutral"}
                  >
                    {c.meta}
                  </Chip>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
