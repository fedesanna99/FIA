/**
 * usePreconditions (v2.5.6 cluster F T4, DEC-A4).
 *
 * Hook che compone uno snapshot reactive `AppPreconditionState` leggendo dai
 * 3 store coinvolti: `modelStore`, `resultsStore`, `historyStore`. Il consumer
 * (tipicamente `FeatureButton`) usa questo snapshot per `checkFeature(...)`
 * e ri-renderizza quando una delle dipendenze cambia.
 *
 * Selettori granularissimi via Zustand subscribe — ogni cambio di Set di
 * selezione triggera SOLO il re-render dei consumer FeatureButton, non tutti
 * i componenti che usano modelStore.
 */
import { useModelStore } from "../store/modelStore";
import { useModelHistory } from "../store/historyStore";
import { useResultsStore } from "../store/resultsStore";
import type { AppPreconditionState } from "../lib/preconditions";

export function useFeaturePreconditionState(): AppPreconditionState {
  const model = useModelStore((s) => s.model);
  const selectedNodeIds = useModelStore((s) => s.selectedNodeIds);
  const selectedElementIds = useModelStore((s) => s.selectedElementIds);
  const staticResults = useResultsStore((s) => s.staticResults);
  const modalResults = useResultsStore((s) => s.modalResults);
  const canUndo = useModelHistory((s) => s.past.length > 1);
  const canRedo = useModelHistory((s) => s.future.length > 0);

  return {
    model,
    staticResults,
    modalResults,
    selectedNodeIds,
    selectedElementIds,
    canUndo,
    canRedo,
  };
}
