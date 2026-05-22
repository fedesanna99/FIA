import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast, useToastStore } from "./toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    useToastStore.setState({ toasts: [] });
  });

  it("deduplica toast identici ravvicinati", () => {
    toast("error", "Errore bootstrap duplicato");
    toast("error", "Errore bootstrap duplicato");

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("mantiene al massimo tre toast visibili", () => {
    toast("error", "Errore A");
    toast("error", "Errore B");
    toast("error", "Errore C");
    toast("error", "Errore D");

    const messages = useToastStore.getState().toasts.map((t) => t.message);
    expect(messages).toEqual(["Errore B", "Errore C", "Errore D"]);
  });

  // v1.6.1 T3 · BUG-3: il bell counter (TopBar) filtra error/warning,
  // quindi documento qui la semantica attesa lato store.
  it("permette di filtrare error/warning per il bell counter", () => {
    // Stack limit = 3, quindi setStato diretto per testare il filtro
    // senza dipendere dalla policy di shift.
    useToastStore.setState({
      toasts: [
        { id: 1, level: "info", message: "Tema scuro applicato", ttlMs: 4000 },
        { id: 2, level: "success", message: "Modello salvato", ttlMs: 3500 },
        { id: 3, level: "warning", message: "Quota in esaurimento", ttlMs: 5000 },
        { id: 4, level: "error", message: "Network timeout", ttlMs: 6000 },
      ],
    });
    const all = useToastStore.getState().toasts;
    const unread = all.filter((t) => t.level === "error" || t.level === "warning");

    expect(all).toHaveLength(4);
    expect(unread).toHaveLength(2);
    expect(unread.map((t) => t.level)).toEqual(["warning", "error"]);
  });

  it("bell counter e' 0 quando lo store ha solo info/success", () => {
    useToastStore.setState({
      toasts: [
        { id: 1, level: "info", message: "Onboarding pronto", ttlMs: 4000 },
        { id: 2, level: "success", message: "Salvato", ttlMs: 3500 },
      ],
    });
    const unread = useToastStore
      .getState()
      .toasts.filter((t) => t.level === "error" || t.level === "warning");
    expect(unread).toHaveLength(0);
  });
});
