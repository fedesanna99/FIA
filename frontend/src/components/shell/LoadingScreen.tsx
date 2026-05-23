/**
 * LoadingScreen (Precision v2.0 PR8) — schermata avanzamento solver.
 *
 * Mockup C5b di handoff `REDESIGN ARCHITETTI.zip`. Rimpiazza il semplice
 * spinner precedente con una vista ricca delle 6 fasi del solver +
 * stream di log testuale "Algoritmo > AI" (differenziatore tecnico).
 *
 * Le 6 fasi sono coerenti col flow FEM standard:
 *   1. validation     → controllo modello
 *   2. discretization → mesh assembly
 *   3. assembly       → K matrix
 *   4. factorization  → LU decomp
 *   5. solve          → back-substitution
 *   6. postprocess    → stress recovery
 *
 * API stateless:
 *   - `phase` = fase corrente (string uguale ai phase IDs)
 *   - `progress` = 0..1 globale (per progress bar superiore)
 *   - `logs` = array di righe testuali (append-only, ultime 20 mostrate)
 *
 * Le fasi prima della corrente sono "done", la corrente "active",
 * quelle dopo "queued".
 *
 * Per integrazione reale: collega `phase` al WebSocket /ws/jobs/{id}.
 * Per ora i consumer possono passare phase mocked.
 */
import { Check, Loader2 } from "lucide-react";
import { cn } from "../ui/cn";

export type SolverPhase =
  | "validation"
  | "discretization"
  | "assembly"
  | "factorization"
  | "solve"
  | "postprocess";

interface PhaseSpec {
  id: SolverPhase;
  label: string;
  description: string;
}

const PHASES: readonly PhaseSpec[] = [
  { id: "validation",     label: "Validazione",       description: "Controllo modello + connettività" },
  { id: "discretization", label: "Discretizzazione",  description: "Mesh assembly + DOF count" },
  { id: "assembly",       label: "Assembly K",        description: "Matrice rigidezza globale" },
  { id: "factorization",  label: "Fattorizzazione",   description: "Decomposizione LU sparse" },
  { id: "solve",          label: "Solve",             description: "Back-substitution" },
  { id: "postprocess",    label: "Post-processing",   description: "Stress recovery + tensioni" },
];

interface Props {
  phase: SolverPhase | null;
  /** Progress globale 0..1. */
  progress?: number;
  /** Righe di log streamabili (le ultime 20 mostrate). */
  logs?: readonly string[];
  /** ETA secondi residui stimati (mostrato sotto la progress bar). */
  etaSeconds?: number | null;
  /** Mostrato sotto il titolo (es. "Statica · Trave bi-appoggiata"). */
  subtitle?: string;
  className?: string;
}

type PhaseState = "done" | "active" | "queued";

function stateOf(phaseId: SolverPhase, current: SolverPhase | null): PhaseState {
  if (!current) return "queued";
  const cIdx = PHASES.findIndex((p) => p.id === current);
  const pIdx = PHASES.findIndex((p) => p.id === phaseId);
  if (pIdx < cIdx) return "done";
  if (pIdx === cIdx) return "active";
  return "queued";
}

function formatEta(sec: number): string {
  if (sec < 60) return `${Math.ceil(sec)} s`;
  const m = Math.floor(sec / 60);
  const s = Math.ceil(sec - m * 60);
  return `${m}m ${s}s`;
}

export function LoadingScreen({
  phase,
  progress = 0,
  logs = [],
  etaSeconds = null,
  subtitle,
  className,
}: Props) {
  const tailLogs = logs.slice(-20);
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));

  return (
    <div
      className={cn(
        "absolute inset-0 z-panel flex flex-col items-center justify-center bg-bg/95 backdrop-blur-sm px-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="loading-screen"
    >
      <div className="w-full max-w-md space-y-4">
        {/* Heading */}
        <div className="text-center space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-wide-4 text-ink-3">
            Analisi in corso
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight-2 text-ink">
            Solver attivo
          </h2>
          {subtitle && (
            <div className="font-mono text-xs text-ink-2 tabular-nums">{subtitle}</div>
          )}
        </div>

        {/* Progress bar indeterminate o determinate */}
        <div className="h-1 bg-bg-hover border border-border relative overflow-hidden">
          {progress > 0 ? (
            <div
              className="h-full bg-accent transition-all duration-mid"
              style={{ width: `${pct}%` }}
              data-testid="loading-progress-bar"
            />
          ) : (
            <div className="h-full bg-accent absolute animate-indeterminate" />
          )}
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-ink-3 tabular-nums">
          <span>{pct}%</span>
          {etaSeconds !== null && etaSeconds >= 0 && (
            <span>ETA {formatEta(etaSeconds)}</span>
          )}
        </div>

        {/* Phases list */}
        <ol className="space-y-1 border border-border bg-bg-panel" data-testid="loading-phases">
          {PHASES.map((p) => {
            const state = stateOf(p.id, phase);
            return (
              <li
                key={p.id}
                className={cn(
                  "flex items-start gap-2 px-3 py-1.5 border-b border-border last:border-b-0",
                  state === "active" && "bg-accent-subtle",
                )}
                data-testid={`phase-${p.id}`}
                data-state={state}
              >
                <span
                  className={cn(
                    "w-4 h-4 flex-shrink-0 flex items-center justify-center border mt-0.5",
                    state === "done"   && "bg-accent border-accent text-white",
                    state === "active" && "bg-accent-subtle border-accent text-accent",
                    state === "queued" && "bg-bg-hover border-border text-ink-3",
                  )}
                  aria-hidden="true"
                >
                  {state === "done" && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                  {state === "active" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-xs font-medium",
                      state === "active" && "text-accent",
                      state === "done"   && "text-ink-2",
                      state === "queued" && "text-ink-3",
                    )}
                  >
                    {p.label}
                  </div>
                  <div className="font-mono text-[10px] text-ink-3 truncate">{p.description}</div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Log stream (terminal-like, last 20 lines) */}
        {tailLogs.length > 0 && (
          <div
            className="bg-bg border border-border px-3 py-2 font-mono text-[10px] text-ink-2 max-h-32 overflow-y-auto"
            data-testid="loading-log-stream"
          >
            {tailLogs.map((line, i) => (
              <div key={i} className="whitespace-pre leading-tight">{line}</div>
            ))}
          </div>
        )}

        <div className="text-center font-mono text-[10px] text-ink-3 leading-snug">
          Algoritmo deterministico · niente AI · puoi seguire il log riga per riga
        </div>
      </div>
    </div>
  );
}

/** Export per consumer di test e mock di phases. */
export const SOLVER_PHASES = PHASES;
