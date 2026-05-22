/**
 * jobsStore (v1.6 Sprint 0 · B17) — registro dei job (analisi) in
 * esecuzione/conclusi. Permette feedback visivo non-bloccante: chip
 * TopBar che mostra "Statica · 32%" mentre l'utente continua a
 * navigare nei pannelli.
 *
 * Pattern: ogni run di analisi pusha un nuovo Job tramite `start()` →
 * il chip in TopBar legge `activeJob` (l'ultimo job running) e si
 * aggiorna live via `updateProgress`. Quando finisce, `finish()` lo
 * marca success/error e libera activeJob per il prossimo run.
 *
 * Coesistenza con analysisStore: lo store legacy mantiene isRunning/
 * progress per i panel solver esistenti; jobsStore e' lo strato UX
 * "global background work". Non sostituisce, completa.
 */
import { create } from "zustand";


export type JobKind =
  | "static"
  | "modal"
  | "buckling"
  | "dynamic-newmark"
  | "seismic-th"
  | "pushover"
  | "nonlinear-nr"
  | "arc-length";


export type JobStatus = "running" | "success" | "error" | "cancelled";


export interface Job {
  id: string;
  kind: JobKind;
  label: string;
  status: JobStatus;
  /** 0..1 (0% .. 100%). */
  progress: number;
  startedAt: number;
  finishedAt?: number;
  errorMessage?: string;
  resultId?: string;
}


interface JobsState {
  jobs: Job[];
  /** Il piu' recente job ancora "running". Null se nessun job attivo. */
  activeJob: Job | null;
  start: (job: Omit<Job, "id" | "status" | "progress" | "startedAt">) => string;
  updateProgress: (id: string, progress: number) => void;
  finish: (id: string, opts?: { success?: boolean; resultId?: string; errorMessage?: string }) => void;
  cancel: (id: string) => void;
  clear: () => void;
}


// Generatore id semplice (no nanoid dep). Counter monotono.
let _counter = 0;
const nextId = () => `job_${Date.now()}_${++_counter}`;


export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  activeJob: null,

  start: (job) => {
    const id = nextId();
    const newJob: Job = {
      ...job,
      id,
      status: "running",
      progress: 0,
      startedAt: Date.now(),
    };
    set((s) => ({
      jobs: [...s.jobs, newJob],
      activeJob: newJob,
    }));
    return id;
  },

  updateProgress: (id, progress) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, progress } : j)),
      activeJob: s.activeJob?.id === id
        ? { ...s.activeJob, progress }
        : s.activeJob,
    }));
  },

  finish: (id, opts = {}) => {
    const { success = true, resultId, errorMessage } = opts;
    set((s) => {
      const jobs = s.jobs.map((j) =>
        j.id === id
          ? {
              ...j,
              status: success ? ("success" as const) : ("error" as const),
              progress: 1,
              finishedAt: Date.now(),
              resultId,
              errorMessage,
            }
          : j,
      );
      // Libera activeJob se era quello che ha finito. Se altri job
      // running esistono, prendi il piu' recente come nuovo activeJob.
      let activeJob = s.activeJob?.id === id ? null : s.activeJob;
      if (activeJob === null) {
        const stillRunning = jobs.filter((j) => j.status === "running");
        if (stillRunning.length > 0) {
          activeJob = stillRunning[stillRunning.length - 1];
        }
      }
      return { jobs, activeJob };
    });
  },

  cancel: (id) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, status: "cancelled", finishedAt: Date.now() } : j)),
      activeJob: s.activeJob?.id === id ? null : s.activeJob,
    }));
  },

  clear: () => set({ jobs: [], activeJob: null }),
}));


/** Label umano per il tipo di job. */
export const JOB_KIND_LABELS: Record<JobKind, string> = {
  "static":         "Statica lineare",
  "modal":          "Modale",
  "buckling":       "Buckling lineare",
  "dynamic-newmark": "Dinamica Newmark",
  "seismic-th":     "Sismica TH",
  "pushover":       "Pushover",
  "nonlinear-nr":   "Non-lineare NR",
  "arc-length":     "Arc-length",
};
