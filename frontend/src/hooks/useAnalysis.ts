import { useCallback } from "react";
import { analysisApi, openProgressSocket } from "../api/client";
import { useAnalysisStore } from "../store/analysisStore";
import { useResultsStore } from "../store/resultsStore";
import { useModelStore } from "../store/modelStore";
import { useJobsStore, JOB_KIND_LABELS, type JobKind } from "../store/jobsStore";
import { modelHash } from "../utils/geometry";
import { translateApiError } from "../lib/apiErrors";
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

    // v1.6 S0 · B17: registra il job nel jobsStore → chip topbar visibile.
    const jobKind: JobKind =
      analysisType === "static" ? "static" :
      analysisType === "modal" ? "modal" : "dynamic-newmark";
    const jobId = useJobsStore.getState().start({
      kind: jobKind,
      label: JOB_KIND_LABELS[jobKind],
    });

    const ws = openProgressSocket(model.id, (p) => {
      setProgress(p.progress, p.message);
      useJobsStore.getState().updateProgress(jobId, p.progress);
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
      useJobsStore.getState().finish(jobId, { success: true });
      toast("success", `Analisi ${analysisType} completata`);
    } catch (e: any) {
      // v1.6 S0 · B05 + B17: errore tradotto in IT, job marcato error.
      const { title, description } = translateApiError(e?.response?.data ?? e);
      setProgress(0, `Errore: ${title}`);
      useJobsStore.getState().finish(jobId, {
        success: false,
        errorMessage: description ?? title,
      });
    } finally {
      setRunning(false);
      try { ws.close(); } catch { /* ignore */ }
    }
  }, [model, analysisType, staticParams, modalParams, dynamicParams,
      setRunning, setProgress, setStatic, setModal, setDynamic, setModelHashAtAnalysis]);
}
