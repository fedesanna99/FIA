import { describe, it, expect, beforeEach } from "vitest";
import { useJobsStore } from "./jobsStore";


beforeEach(() => {
  useJobsStore.getState().clear();
});


describe("jobsStore · v1.6 S0 B17", () => {
  it("clean state: no jobs, no activeJob", () => {
    expect(useJobsStore.getState().jobs).toEqual([]);
    expect(useJobsStore.getState().activeJob).toBeNull();
  });

  it("start() crea un job running con id, status='running', progress=0", () => {
    const id = useJobsStore.getState().start({
      kind: "static",
      label: "Statica lineare",
    });
    const s = useJobsStore.getState();
    expect(id).toMatch(/^job_/);
    expect(s.jobs).toHaveLength(1);
    expect(s.jobs[0].status).toBe("running");
    expect(s.jobs[0].progress).toBe(0);
    expect(s.activeJob?.id).toBe(id);
    expect(s.activeJob?.label).toBe("Statica lineare");
  });

  it("updateProgress aggiorna sia il job che activeJob", () => {
    const id = useJobsStore.getState().start({ kind: "modal", label: "Modale" });
    useJobsStore.getState().updateProgress(id, 0.42);
    const s = useJobsStore.getState();
    expect(s.jobs[0].progress).toBe(0.42);
    expect(s.activeJob?.progress).toBe(0.42);
  });

  it("finish(success) marca status='success', progress=1, libera activeJob", () => {
    const id = useJobsStore.getState().start({ kind: "static", label: "Test" });
    useJobsStore.getState().finish(id, { success: true, resultId: "res_1" });
    const s = useJobsStore.getState();
    expect(s.jobs[0].status).toBe("success");
    expect(s.jobs[0].progress).toBe(1);
    expect(s.jobs[0].resultId).toBe("res_1");
    expect(s.activeJob).toBeNull();
  });

  it("finish(error) marca error + errorMessage", () => {
    const id = useJobsStore.getState().start({ kind: "static", label: "Test" });
    useJobsStore.getState().finish(id, {
      success: false,
      errorMessage: "matrice singolare",
    });
    const job = useJobsStore.getState().jobs[0];
    expect(job.status).toBe("error");
    expect(job.errorMessage).toBe("matrice singolare");
  });

  it("cancel() marca cancelled + libera activeJob", () => {
    const id = useJobsStore.getState().start({ kind: "modal", label: "Test" });
    useJobsStore.getState().cancel(id);
    const s = useJobsStore.getState();
    expect(s.jobs[0].status).toBe("cancelled");
    expect(s.activeJob).toBeNull();
  });

  it("2 job concorrenti: activeJob e' il piu' recente; finish del primo NON libera activeJob", () => {
    const id1 = useJobsStore.getState().start({ kind: "static", label: "Job1" });
    const id2 = useJobsStore.getState().start({ kind: "modal", label: "Job2" });
    expect(useJobsStore.getState().activeJob?.id).toBe(id2);
    useJobsStore.getState().finish(id1, { success: true });
    // Job2 e' ancora running, activeJob resta Job2
    expect(useJobsStore.getState().activeJob?.id).toBe(id2);
  });

  it("clear() reset completo", () => {
    useJobsStore.getState().start({ kind: "static", label: "Test" });
    useJobsStore.getState().clear();
    expect(useJobsStore.getState().jobs).toEqual([]);
    expect(useJobsStore.getState().activeJob).toBeNull();
  });
});
