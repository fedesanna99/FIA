// redesign/workspace-fasi · FETTA 1 · Spina 3 fasi (Costruisci/Esegui/Risultati)
//
// Spina additiva sotto la topbar di Shell custom. NON sostituisce la
// rail sinistra (railConfig.ts LOCKED): è una MAPPA gerarchica del
// flusso "uso un FEA" — Costruisci → Esegui → Risultati.
//
// REGOLE (vedi prompt FETTA 1):
//   1. Ogni passo è SEMPRE cliccabile (mai disabilitare). Cliccare un
//      passo porta al workspace corrispondente (Costruisci→"modello",
//      Esegui→"analisi", Risultati→"risultati") via la stessa via
//      usata dalla rail sinistra (setActiveWs in Shell.tsx).
//   2. Stato visivo derivato dagli store reali (modelStore /
//      analysisStore / resultsStore). Nessuna nuova logica.
//   3. Lo stato è SOLO informativo: niente blocchi, niente toast,
//      niente redirect forzati.
//
// Pattern "stale" identico a `components/viewport/StaleResultsBanner.tsx`:
//   modelHash(model) !== resultsStore.modelHashAtAnalysis → risultati
//   obsoleti (cerchietto warning sul passo Risultati).

import { useMemo } from "react";
import { Check, Loader2, AlertTriangle, Circle } from "lucide-react";
import { useModelStore } from "../store/modelStore";
import { useAnalysisStore } from "../store/analysisStore";
import { useResultsStore } from "../store/resultsStore";
import { modelHash } from "../utils/geometry";

type ShellWorkspaceId = "modello" | "analisi" | "risultati" | "verifiche" | "io" | "view";

interface ShellPhaseStepperProps {
  active: ShellWorkspaceId;
  onChange: (id: ShellWorkspaceId) => void;
}

export type PhaseStepState = "empty" | "partial" | "running" | "done" | "stale";

interface StepConfig {
  index: number;
  testid: "phase-step-build" | "phase-step-run" | "phase-step-results";
  label: string;
  workspace: ShellWorkspaceId;
}

const STEPS: StepConfig[] = [
  { index: 1, testid: "phase-step-build",   label: "Costruisci", workspace: "modello"   },
  { index: 2, testid: "phase-step-run",     label: "Esegui",     workspace: "analisi"   },
  { index: 3, testid: "phase-step-results", label: "Risultati",  workspace: "risultati" },
];

export function ShellPhaseStepper({ active, onChange }: ShellPhaseStepperProps) {
  const model = useModelStore((s) => s.model);
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const staticResults = useResultsStore((s) => s.staticResults);
  const modalResults = useResultsStore((s) => s.modalResults);
  const dynamicResults = useResultsStore((s) => s.dynamicResults);
  const modelHashAtAnalysis = useResultsStore((s) => s.modelHashAtAnalysis);

  // ── Stati derivati dagli store reali ───────────────────────────────────
  const buildState: PhaseStepState = useMemo(() => {
    if (!model) return "empty";
    const nodes = model.nodes?.length ?? 0;
    const elements = model.elements?.length ?? 0;
    const constraints = model.constraints?.length ?? 0;
    if (nodes > 0 && elements > 0 && constraints > 0) return "done";
    if (nodes > 0 || elements > 0 || constraints > 0) return "partial";
    return "empty";
  }, [model]);

  // Pattern stale identico a `components/viewport/StaleResultsBanner.tsx`.
  // hasResults + isFresh sono CONDIVISI fra runState e resultsState: la
  // spina racconta una storia coerente "calcolo fresco vs da rilanciare".
  const hasResults = !!(staticResults || modalResults || dynamicResults);
  const currentHash = useMemo(() => modelHash(model), [model]);
  const stale =
    hasResults && modelHashAtAnalysis !== null && currentHash !== modelHashAtAnalysis;
  const isFresh = hasResults && !stale;

  // Run state: durante il calcolo è "running" (spinner). Senza calcolo o
  // con calcolo STALE è "empty" — la ✓ si stacca insieme allo stale di
  // Risultati per segnalare "devi rilanciare" (Esegui◦ + Risultati⚠).
  // Con calcolo fresco è "done" (✓ verde).
  const runState: PhaseStepState = isRunning ? "running" : (isFresh ? "done" : "empty");

  // Results state: empty se nessun calcolo, stale (⚠) se modello cambiato
  // dopo il calcolo, done (✓) altrimenti.
  const resultsState: PhaseStepState = !hasResults ? "empty" : stale ? "stale" : "done";

  const stateByTestid: Record<StepConfig["testid"], PhaseStepState> = {
    "phase-step-build":   buildState,
    "phase-step-run":     runState,
    "phase-step-results": resultsState,
  };

  return (
    <nav className="shell-phase" data-shell="phase" aria-label="Fasi del progetto">
      <ol className="shell-phase-list">
        {STEPS.map((step, i) => {
          const state = stateByTestid[step.testid];
          const isActive = active === step.workspace;
          return (
            <li key={step.testid} className="shell-phase-li">
              <button
                type="button"
                className={[
                  "shell-phase-step",
                  `shell-phase-step--${state}`,
                  isActive ? "is-active" : "",
                ].filter(Boolean).join(" ")}
                data-testid={step.testid}
                data-state={state}
                aria-current={isActive ? "step" : undefined}
                onClick={() => onChange(step.workspace)}
                title={`${step.label} — ${describeState(state)}`}
              >
                <span className="shell-phase-num" aria-hidden>{step.index}</span>
                <span className="shell-phase-label">{step.label}</span>
                <StepStatusIcon state={state} />
              </button>
              {i < STEPS.length - 1 && (
                <span className="shell-phase-sep" aria-hidden>→</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function describeState(state: PhaseStepState): string {
  switch (state) {
    case "empty":   return "Da iniziare";
    case "partial": return "In costruzione";
    case "running": return "In esecuzione";
    case "done":    return "Completato";
    case "stale":   return "Risultati da aggiornare";
  }
}

function StepStatusIcon({ state }: { state: PhaseStepState }) {
  switch (state) {
    case "running":
      return <Loader2 className="shell-phase-icon shell-phase-icon--spin" size={14} aria-hidden />;
    case "done":
      return <Check className="shell-phase-icon shell-phase-icon--done" size={14} aria-hidden />;
    case "stale":
      return <AlertTriangle className="shell-phase-icon shell-phase-icon--stale" size={14} aria-hidden />;
    case "partial":
      return <Circle className="shell-phase-icon shell-phase-icon--partial" size={10} aria-hidden />;
    case "empty":
    default:
      return <Circle className="shell-phase-icon shell-phase-icon--empty" size={10} aria-hidden />;
  }
}
