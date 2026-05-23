/**
 * PercorsoStepper (Precision v2.0 PR7) — stepper persistente 6-fasi.
 *
 * Mockup C2-C7 di handoff `REDESIGN ARCHITETTI.zip`. Visualizza la
 * progressione del "Percorso guidato" attraverso 6 step semantici:
 *
 *   1. Geometria      → C2
 *   2. Vincoli/Carichi → C3
 *   3. Materiali/Sezioni → C4
 *   4. Esegui         → C5
 *   5. Critical       → C6
 *   6. Report         → C7
 *
 * API stateless: il consumer passa `currentStep` (1-based) e l'handler
 * `onStepClick` per la navigazione. Lo stepper deriva done/current/todo
 * dal currentStep.
 *
 * Stili Precision:
 *   - Hairline border bottom
 *   - font-mono uppercase per label
 *   - Cyan accent per current step
 *   - bg-accent fill per done, bg-bg-hover per todo
 *   - Click su step done = navigation indietro consentita
 *   - Click su step todo = disabilitato (l'utente deve completare in ordine)
 */
import { Check } from "lucide-react";
import { cn } from "../ui/cn";

export interface PercorsoStep {
  id: string;
  label: string;
  /** Hint/descrizione breve mostrato al hover/focus (opzionale). */
  hint?: string;
}

interface Props {
  steps: readonly PercorsoStep[];
  /** Step corrente (1-based). 0 = nessuno started. */
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  /** Mostra label complete sotto i marker o solo dots. */
  compact?: boolean;
  className?: string;
}

/** I 6 step canonical per il percorso strutturale base. */
export const PERCORSO_STEPS_6: readonly PercorsoStep[] = [
  { id: "geometria",           label: "Geometria",            hint: "Nodi, elementi, sezioni" },
  { id: "vincoli-carichi",     label: "Vincoli / Carichi",    hint: "Boundary conditions" },
  { id: "materiali-sezioni",   label: "Materiali / Sezioni",  hint: "Acciaio, calcestruzzo, legno" },
  { id: "esegui",              label: "Esegui",               hint: "Lancia il solver" },
  { id: "critical",            label: "Critical",             hint: "Punti deboli + UC" },
  { id: "report",              label: "Report",               hint: "Esporta PDF" },
];

type StepState = "done" | "current" | "todo";

function stateOf(idx: number, current: number): StepState {
  if (idx < current) return "done";
  if (idx === current) return "current";
  return "todo";
}

export function PercorsoStepper({
  steps,
  currentStep,
  onStepClick,
  compact = false,
  className,
}: Props) {
  return (
    <nav
      className={cn(
        "flex items-center gap-0 border-b border-border bg-bg-panel px-4 py-2",
        className,
      )}
      aria-label="Stepper percorso"
      data-testid="percorso-stepper"
    >
      {steps.map((step, i) => {
        const state = stateOf(i + 1, currentStep);
        const stepNumber = i + 1;
        const clickable = state !== "todo" && !!onStepClick;
        return (
          <div key={step.id} className="flex items-center flex-1" data-testid={`stepper-${step.id}`}>
            <button
              type="button"
              disabled={!clickable}
              onClick={clickable ? () => onStepClick?.(stepNumber) : undefined}
              aria-current={state === "current" ? "step" : undefined}
              title={step.hint}
              className={cn(
                "flex items-center gap-2 flex-1 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                clickable ? "cursor-pointer hover:text-ink" : "cursor-default",
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 flex-shrink-0 flex items-center justify-center border font-mono text-[10px] font-semibold",
                  state === "done"    && "bg-accent text-white border-accent",
                  state === "current" && "bg-accent-subtle text-accent border-accent",
                  state === "todo"    && "bg-bg-hover text-ink-3 border-border",
                )}
                aria-hidden="true"
              >
                {state === "done" ? <Check className="w-3 h-3" strokeWidth={2.5} /> : stepNumber}
              </span>
              {!compact && (
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-wide-3 truncate text-left",
                    state === "current" && "text-accent font-semibold",
                    state === "done"    && "text-ink-2",
                    state === "todo"    && "text-ink-3",
                  )}
                >
                  {step.label}
                </span>
              )}
            </button>
            {/* Connector tra step (tranne dopo l'ultimo) */}
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px w-3 flex-shrink-0 mx-1",
                  state === "done" ? "bg-accent" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
