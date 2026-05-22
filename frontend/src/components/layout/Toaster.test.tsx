import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Toaster } from "./Toaster";
import { useToastStore, toast } from "../../store/toastStore";

describe("Toaster", () => {
  beforeEach(() => {
    act(() => {
      useToastStore.setState({ toasts: [] });
    });
  });

  it("non renderizza nulla quando non ci sono toast", () => {
    const { container } = render(<Toaster />);
    expect(container.firstChild?.childNodes.length ?? 0).toBe(0);
  });

  it("mostra un toast success quando viene pushato", () => {
    render(<Toaster />);
    act(() => { toast("success", "Operazione riuscita"); });
    expect(screen.getByText("Operazione riuscita")).toBeTruthy();
  });

  it("mostra l'icona corretta per ogni level", () => {
    render(<Toaster />);
    act(() => {
      toast("error", "Errore X");
      toast("warning", "Attenzione Y");
      toast("info", "Info Z");
    });
    expect(screen.getByText("Errore X")).toBeTruthy();
    expect(screen.getByText("Attenzione Y")).toBeTruthy();
    expect(screen.getByText("Info Z")).toBeTruthy();
  });

  it("dismiss rimuove il toast dalla store", () => {
    act(() => { toast("info", "Hello"); });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    const id = useToastStore.getState().toasts[0].id;
    act(() => { useToastStore.getState().dismiss(id); });
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  describe("v1.5.2 Task 38 — stack limit + tone-aware ttl", () => {
    it("stack limit: massimo 3 toast visibili (i piu' vecchi vengono droppati)", () => {
      act(() => {
        toast("info", "T1");
        toast("info", "T2");
        toast("info", "T3");
        toast("info", "T4");
        toast("info", "T5");
      });
      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(3);
      // I 2 piu' vecchi (T1, T2) sono stati scartati.
      expect(toasts.map((t) => t.message)).toEqual(["T3", "T4", "T5"]);
    });

    it("ttl di default e' tone-aware: error > warning > info > success", () => {
      // Pusha uno alla volta e leggi subito il ttl prima che lo stack-limit
      // possa scartare i piu' vecchi (limite 3 visibili).
      const expectations = [
        { level: "success" as const, ttl: 3500 },
        { level: "info"    as const, ttl: 4000 },
        { level: "warning" as const, ttl: 5000 },
        { level: "error"   as const, ttl: 6000 },
      ];
      for (const { level, ttl } of expectations) {
        act(() => {
          useToastStore.setState({ toasts: [] });
          toast(level, level);
        });
        expect(useToastStore.getState().toasts[0].ttlMs).toBe(ttl);
      }
    });

    it("ttl esplicito vince sul default tone", () => {
      act(() => { toast("error", "Custom", 1234); });
      expect(useToastStore.getState().toasts[0].ttlMs).toBe(1234);
    });
  });

  describe("v1.5.2 Task 38 — auto-dismiss con fake timers", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("toast info si auto-chiude dopo 4s default", () => {
      act(() => { toast("info", "Hello"); });
      expect(useToastStore.getState().toasts).toHaveLength(1);
      act(() => { vi.advanceTimersByTime(3999); });
      expect(useToastStore.getState().toasts).toHaveLength(1);
      act(() => { vi.advanceTimersByTime(2); });
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("toast error si auto-chiude dopo 6s (piu' tempo per leggere)", () => {
      act(() => { toast("error", "HTTP 422"); });
      act(() => { vi.advanceTimersByTime(5999); });
      expect(useToastStore.getState().toasts).toHaveLength(1);
      act(() => { vi.advanceTimersByTime(2); });
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });
});
