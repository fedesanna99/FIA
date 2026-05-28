/**
 * analysisCompleteToast.test.ts · redesign/workspace-fasi rifinitura 2b.
 *
 * Verifica:
 *  - mostra il toast quando non sono su risultati (qualunque altro WS o nessuno)
 *  - NON mostra il toast quando sono gia' sulla fase Risultati
 *  - testid del toast + dell'action sono "analysis-complete-toast" e
 *    "analysis-complete-goto" (richiesti dal prompt)
 *  - TTL = 10000ms (non si chiude da solo nei 3.5s di default success)
 *  - action.onClick dispatcha l'evento `feapro:shell:goto-workspace`
 *    con detail.ws="risultati"
 *  - messaggio include il tipo analisi + tempo solver se presente
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { showAnalysisCompleteToast, ANALYSIS_GOTO_EVENT } from "./analysisCompleteToast";
import { useToastStore } from "../store/toastStore";

const WS_KEY = "feapro:shell:active-workspace";

describe("showAnalysisCompleteToast · rifinitura 2b", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    try { window.sessionStorage.removeItem(WS_KEY); } catch { /* ignore */ }
  });

  it("nessun workspace persistito: mostra il toast (utente fuori da Risultati)", () => {
    showAnalysisCompleteToast("static", 123);
    const toasts = useToastStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].level).toBe("success");
    expect(toasts[0].testid).toBe("analysis-complete-toast");
    expect(toasts[0].action?.testid).toBe("analysis-complete-goto");
  });

  it("workspace='modello' (Costruisci): mostra il toast", () => {
    window.sessionStorage.setItem(WS_KEY, "modello");
    showAnalysisCompleteToast("static", 123);
    expect(useToastStore.getState().toasts.length).toBe(1);
  });

  it("workspace='analisi' (Esegui): mostra il toast", () => {
    window.sessionStorage.setItem(WS_KEY, "analisi");
    showAnalysisCompleteToast("static", 123);
    expect(useToastStore.getState().toasts.length).toBe(1);
  });

  it("workspace='verifiche': mostra il toast (Risultati e' diverso da Verifiche)", () => {
    window.sessionStorage.setItem(WS_KEY, "verifiche");
    showAnalysisCompleteToast("static");
    expect(useToastStore.getState().toasts.length).toBe(1);
  });

  it("workspace='risultati': NON mostra il toast (utente gia' lì)", () => {
    window.sessionStorage.setItem(WS_KEY, "risultati");
    showAnalysisCompleteToast("static", 123);
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it("messaggio: include label tipo + tempo solver in ms", () => {
    showAnalysisCompleteToast("static", 123.7);
    const msg = useToastStore.getState().toasts[0]?.message ?? "";
    expect(msg).toContain("Analisi completata");
    expect(msg).toContain("Statica lineare");
    expect(msg).toContain("124"); // arrotondamento 123.7 → 124
    expect(msg).toContain("ms");
  });

  it("messaggio: omette tempo se solveTimeMs assente", () => {
    showAnalysisCompleteToast("modal");
    const msg = useToastStore.getState().toasts[0]?.message ?? "";
    expect(msg).toContain("Modale");
    expect(msg).not.toContain("ms");
  });

  it("TTL = 10000ms (persistente, non si chiude da solo nei default success 3.5s)", () => {
    showAnalysisCompleteToast("static", 50);
    expect(useToastStore.getState().toasts[0].ttlMs).toBe(10_000);
  });

  it("action.onClick dispatcha feapro:shell:goto-workspace con ws='risultati'", () => {
    const spy = vi.fn();
    window.addEventListener(ANALYSIS_GOTO_EVENT, spy as EventListener);
    showAnalysisCompleteToast("static");
    const action = useToastStore.getState().toasts[0]?.action;
    expect(action).toBeDefined();
    action!.onClick();
    expect(spy).toHaveBeenCalledOnce();
    const evt = spy.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toEqual({ ws: "risultati" });
    window.removeEventListener(ANALYSIS_GOTO_EVENT, spy as EventListener);
  });

  it("label CTA: 'Vai ai Risultati →'", () => {
    showAnalysisCompleteToast("static");
    expect(useToastStore.getState().toasts[0].action?.label).toBe("Vai ai Risultati →");
  });

  it("idempotente: chiamate consecutive identiche non duplicano (dedup toastStore)", () => {
    showAnalysisCompleteToast("static", 100);
    showAnalysisCompleteToast("static", 100);
    expect(useToastStore.getState().toasts.length).toBe(1);
  });
});
