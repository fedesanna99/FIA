// redesign/workspace-fasi · rifinitura FETTA 2b
//
// Helper non-invasivo per il toast "Analisi completata → Vai ai Risultati":
//   - mostrato SOLO se l'utente NON è già sulla fase Risultati
//   - persistente 10s (TTL > default 3500ms success)
//   - CTA "Vai ai Risultati →" che dispatcha `feapro:shell:goto-workspace`;
//     Shell.tsx ascolta e cambia activeWs a "risultati"
//   - in caso di FAIL non chiamare questa funzione (rotta errori gia' esistente)
//
// Scelte di design:
//   - Niente nuovo store di "navigation intent": riusa il pattern feapro:*
//     events gia' in App.tsx + Shell.tsx, no superficie nuova
//   - "Sapere se siamo gia' su risultati" leggendo sessionStorage:
//     `feapro:shell:active-workspace` e' la chiave persisted da Shell.tsx
//     (vedi Shell.tsx:102). Lettura sincrona, no hook circular import.
//   - Testabile come pura funzione mockando solo sessionStorage e toast.

import { toast } from "../store/toastStore";
import type { AnalysisType } from "../types/results";

const SHELL_WORKSPACE_KEY = "feapro:shell:active-workspace";
const GOTO_EVENT = "feapro:shell:goto-workspace";
const TOAST_TTL_MS = 10_000;

const TYPE_LABELS: Record<AnalysisType, string> = {
  static: "Statica lineare",
  modal: "Modale",
  dynamic: "Dinamica",
  buckling: "Buckling",
};

/**
 * Mostra il toast non-invasivo "Analisi completata · vai ai Risultati"
 * SOLO se l'utente non è già sulla fase Risultati. Idempotente: il
 * toastStore stesso de-duplica i toast identici (vedi push() check).
 *
 * @param analysisType  tipo di analisi appena completata
 * @param solveTimeMs   tempo solver in ms (opzionale, se backend lo espone)
 */
export function showAnalysisCompleteToast(
  analysisType: AnalysisType,
  solveTimeMs?: number,
): void {
  if (isOnResultsWorkspace()) {
    // Utente gia' su Risultati: niente toast. Aggiornamento silenzioso
    // (resultsStore e' gia' stato popolato da useAnalysis).
    return;
  }

  const label = TYPE_LABELS[analysisType] ?? "Analisi";
  const timeChip =
    typeof solveTimeMs === "number" && Number.isFinite(solveTimeMs)
      ? ` · ${Math.round(solveTimeMs)} ms`
      : "";
  const message = `Analisi completata · ${label}${timeChip}`;

  toast(
    "success",
    message,
    TOAST_TTL_MS,
    {
      label: "Vai ai Risultati →",
      testid: "analysis-complete-goto",
      onClick: () => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
          new CustomEvent(GOTO_EVENT, { detail: { ws: "risultati" } }),
        );
      },
    },
    { testid: "analysis-complete-toast" },
  );
}

/**
 * Legge il workspace attivo della Shell custom dal sessionStorage.
 * Tab-scope: l'utente che apre il modello in un'altra tab non viene
 * influenzato.
 */
function isOnResultsWorkspace(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SHELL_WORKSPACE_KEY) === "risultati";
  } catch {
    return false;
  }
}

/** Nome dell'evento custom dispatchato dalla CTA. Esportato per Shell.tsx. */
export const ANALYSIS_GOTO_EVENT = GOTO_EVENT;
