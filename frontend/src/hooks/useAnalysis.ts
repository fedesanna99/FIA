import { useCallback } from "react";
import { analysisApi, openProgressSocket } from "../api/client";
import { useAnalysisStore } from "../store/analysisStore";
import { useResultsStore } from "../store/resultsStore";
import { useModelStore } from "../store/modelStore";
import { useJobsStore, JOB_KIND_LABELS, type JobKind } from "../store/jobsStore";
import { modelHash } from "../utils/geometry";
import { translateApiError } from "../lib/apiErrors";
import { notify } from "../store/notificationsStore";
// redesign/workspace-fasi rifinitura 2b: toast "Analisi completata →
// Vai ai Risultati" non-invasivo. Sostituisce il toast generico success.
import { showAnalysisCompleteToast } from "../lib/analysisCompleteToast";

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
      let solveTimeMs: number | undefined;
      if (analysisType === "static") {
        const r = await analysisApi.static(model.id, staticParams);
        setStatic(r);
        solveTimeMs = r.solve_time_ms;
      } else if (analysisType === "modal") {
        const r = await analysisApi.modal(model.id, modalParams);
        setModal(r);
        solveTimeMs = r.solve_time_ms;
      } else {
        const r = await analysisApi.dynamic(model.id, dynamicParams);
        setDynamic(r);
        solveTimeMs = r.solve_time_ms;
      }
      setProgress(1.0, "Completato");
      setModelHashAtAnalysis(modelHash(model));
      useJobsStore.getState().finish(jobId, { success: true });
      // redesign/workspace-fasi rifinitura 2b: toast non-invasivo
      // "Analisi completata → Vai ai Risultati" che appare SOLO se
      // l'utente non e' gia' sulla fase Risultati. Sostituisce il
      // vecchio toast generico success. La via verso Risultati e' una
      // CTA opzionale, mai forzata.
      showAnalysisCompleteToast(analysisType, solveTimeMs);
      // v1.7-polish-pass2 T2: notifica persistente nel bell badge.
      notify("success", `Analisi ${analysisType} completata`, "Risultati disponibili in Inspect");
    } catch (e: any) {
      // v1.6 S0 · B05 + B17: errore tradotto in IT, job marcato error.
      const { title, description } = translateApiError(e?.response?.data ?? e);
      setProgress(0, `Errore: ${title}`);
      useJobsStore.getState().finish(jobId, {
        success: false,
        errorMessage: description ?? title,
      });
      notify("error", `Errore analisi ${analysisType}`, description ?? title);
    } finally {
      setRunning(false);
      try { ws.close(); } catch { /* ignore */ }
    }
  }, [model, analysisType, staticParams, modalParams, dynamicParams,
      setRunning, setProgress, setStatic, setModal, setDynamic, setModelHashAtAnalysis]);
}
