import { useCallback } from "react";
import { analysisApi, openProgressSocket } from "../api/client";
import { useAnalysisStore } from "../store/analysisStore";
import { useResultsStore } from "../store/resultsStore";
import { useModelStore } from "../store/modelStore";
import { modelHash } from "../utils/geometry";
import { toast } from "../store/toastStore";

export function useRunAnalysis() {
  const model = useModelStore((s) => s.model);
  const {
    analysisType, staticParams, modalParams, dynamicParams,
    setRunning, setProgress,
  } = useAnalysisStore();
  const { setStatic, setModal, setDynamic, setModelHashAtAnalysis } = useResultsStore();

  return useCallback(async () => {
    if (!model) return;
    setRunning(true);
    setProgress(0, "Connessione...");
    const ws = openProgressSocket(model.id, (p) => {
      setProgress(p.progress, p.message);
    });
    try {
      if (analysisType === "static") {
        const r = await analysisApi.static(model.id, staticParams);
        setStatic(r);
      } else if (analysisType === "modal") {
        const r = await analysisApi.modal(model.id, modalParams);
        setModal(r);
      } else {
        const r = await analysisApi.dynamic(model.id, dynamicParams);
        setDynamic(r);
      }
      setProgress(1.0, "Completato");
      setModelHashAtAnalysis(modelHash(model));
      toast("success", `Analisi ${analysisType} completata`);
    } catch (e: any) {
      setProgress(0, `Errore: ${e?.response?.data?.detail ?? e?.message ?? "sconosciuto"}`);
    } finally {
      setRunning(false);
      try { ws.close(); } catch { /* ignore */ }
    }
  }, [model, analysisType, staticParams, modalParams, dynamicParams,
      setRunning, setProgress, setStatic, setModal, setDynamic, setModelHashAtAnalysis]);
}
