/**
 * Preconditions registry (v2.5.6 cluster F, DEC-A4).
 *
 * Mapping dichiarativo `FeatureId` → precondizioni richieste, label italiano,
 * azione propositiva. Centralizza la logica "questo bottone richiede X" che
 * prima era sparsa nei singoli callsite via `disabled={!model || !results}`.
 *
 * Pattern d'uso (via `<FeatureButton featureId="run-static">`):
 *   1. Il button consulta `checkFeature(featureId, state)` per decidere
 *      `available` / tooltip / propose-action.
 *   2. Se mancano precondizioni, mostra tooltip italiano `disabledLabel` e
 *      (opzionale) lancia `disabledAction` al click.
 *
 * Estendere il registry significa aggiungere una entry in `FEATURE_PRECONDITIONS`
 * e (se serve) una nuova `PreconditionId` con valutazione in `evaluatePrecondition`.
 */
import type { FEAModel } from "../types/model";
import type { StaticResults, ModalResults } from "../types/results";

export type PreconditionId =
  | "model-exists"
  | "model-has-constraints"
  | "model-has-loads"
  | "static-results-exist"
  | "modal-results-exist"
  | "node-selected"
  | "element-selected"
  | "history-can-undo"
  | "history-can-redo";

export type FeatureId =
  | "run-static"
  | "run-modal"
  | "run-buckling"
  | "verify-ec3"
  | "verify-ec2"
  | "verify-ec8"
  | "export-pdf"
  | "export-xlsx"
  | "inspect-node"
  | "inspect-element"
  | "undo"
  | "redo";

export interface FeatureConfig {
  requires: PreconditionId[];
  /** Messaggio italiano in tooltip + empty state quando feature non disponibile. */
  disabledLabel: string;
  /** Azione propositiva (FeatureId) lanciabile dal click su disabled. Null se nessuna. */
  disabledAction: FeatureId | null;
  /** Label italiano del CTA propose-action (es. "Esegui analisi statica"). */
  disabledActionLabel: string | null;
}

export const FEATURE_PRECONDITIONS: Record<FeatureId, FeatureConfig> = {
  "run-static": {
    requires: ["model-exists", "model-has-constraints", "model-has-loads"],
    disabledLabel: "Definisci vincoli e carichi prima di lanciare l'analisi",
    disabledAction: null,
    disabledActionLabel: null,
  },
  "run-modal": {
    requires: ["model-exists", "model-has-constraints"],
    disabledLabel: "Definisci vincoli prima dell'analisi modale",
    disabledAction: null,
    disabledActionLabel: null,
  },
  "run-buckling": {
    requires: ["model-exists", "model-has-constraints", "model-has-loads"],
    disabledLabel: "Servono vincoli e carichi per l'analisi di buckling",
    disabledAction: null,
    disabledActionLabel: null,
  },
  "verify-ec3": {
    requires: ["static-results-exist"],
    disabledLabel: "Esegui l'analisi statica prima delle verifiche EC3",
    disabledAction: "run-static",
    disabledActionLabel: "Esegui analisi statica",
  },
  "verify-ec2": {
    requires: ["static-results-exist"],
    disabledLabel: "Esegui l'analisi statica prima delle verifiche EC2",
    disabledAction: "run-static",
    disabledActionLabel: "Esegui analisi statica",
  },
  "verify-ec8": {
    requires: ["static-results-exist"],
    disabledLabel: "Esegui l'analisi statica prima delle verifiche sismiche EC8",
    disabledAction: "run-static",
    disabledActionLabel: "Esegui analisi statica",
  },
  "export-pdf": {
    requires: ["model-exists"],
    disabledLabel: "Carica un modello per esportare il report",
    disabledAction: null,
    disabledActionLabel: null,
  },
  "export-xlsx": {
    requires: ["model-exists"],
    disabledLabel: "Carica un modello per esportare il workbook",
    disabledAction: null,
    disabledActionLabel: null,
  },
  "inspect-node": {
    requires: ["node-selected"],
    disabledLabel: "Seleziona un nodo dal viewport",
    disabledAction: null,
    disabledActionLabel: null,
  },
  "inspect-element": {
    requires: ["element-selected"],
    disabledLabel: "Seleziona un elemento dal viewport",
    disabledAction: null,
    disabledActionLabel: null,
  },
  undo: {
    requires: ["history-can-undo"],
    disabledLabel: "Nessuna modifica da annullare",
    disabledAction: null,
    disabledActionLabel: null,
  },
  redo: {
    requires: ["history-can-redo"],
    disabledLabel: "Nessuna modifica da ripetere",
    disabledAction: null,
    disabledActionLabel: null,
  },
};

/**
 * Snapshot dello stato app per evaluate precondizioni.
 *
 * Le set di selezione vengono dal `modelStore` (multi-set, viewport-driven);
 * il `selectionStore` separato gestisce single-set per inspector ma non
 * partecipa alle precondizioni di feature globali.
 */
export interface AppPreconditionState {
  model: FEAModel | null;
  staticResults: StaticResults | null;
  modalResults: ModalResults | null;
  selectedNodeIds: ReadonlySet<number>;
  selectedElementIds: ReadonlySet<number>;
  canUndo: boolean;
  canRedo: boolean;
}

export function evaluatePrecondition(
  precondition: PreconditionId,
  state: AppPreconditionState,
): boolean {
  switch (precondition) {
    case "model-exists":
      return state.model !== null;
    case "model-has-constraints":
      return (state.model?.constraints?.length ?? 0) > 0;
    case "model-has-loads":
      return (state.model?.loads?.length ?? 0) > 0;
    case "static-results-exist":
      return state.staticResults !== null;
    case "modal-results-exist":
      return state.modalResults !== null;
    case "node-selected":
      return state.selectedNodeIds.size > 0;
    case "element-selected":
      return state.selectedElementIds.size > 0;
    case "history-can-undo":
      return state.canUndo;
    case "history-can-redo":
      return state.canRedo;
  }
}

export interface FeatureAvailability {
  available: boolean;
  /** Precondizioni mancanti (vuoto se available). */
  missing: PreconditionId[];
  /** Label italiano per tooltip/empty state quando !available. */
  disabledLabel: string;
  disabledAction: FeatureId | null;
  disabledActionLabel: string | null;
}

export function checkFeature(
  featureId: FeatureId,
  state: AppPreconditionState,
): FeatureAvailability {
  const config = FEATURE_PRECONDITIONS[featureId];
  const missing = config.requires.filter((p) => !evaluatePrecondition(p, state));
  return {
    available: missing.length === 0,
    missing,
    disabledLabel: config.disabledLabel,
    disabledAction: config.disabledAction,
    disabledActionLabel: config.disabledActionLabel,
  };
}
