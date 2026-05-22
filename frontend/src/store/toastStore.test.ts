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
});
