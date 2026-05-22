import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useModalBackButton } from "./useModalBackButton";


describe("useModalBackButton · v1.6 S0 B08", () => {
  beforeEach(() => {
    // Reset history a uno stato pulito tra i test
    window.history.replaceState(null, "", window.location.href);
  });

  it("push uno state quando il modal si apre", () => {
    const onClose = vi.fn();
    const prevState = window.history.state;
    renderHook(() => useModalBackButton(true, onClose));
    // Lo state dovrebbe essere stato modificato (modal: true marker)
    expect(window.history.state).not.toBe(prevState);
    expect(window.history.state).toMatchObject({ modal: true });
  });

  it("popstate chiama onClose quando il modal e' aperto", () => {
    const onClose = vi.fn();
    renderHook(() => useModalBackButton(true, onClose));
    expect(onClose).not.toHaveBeenCalled();
    // Simula il back del browser
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("non registra listener quando isOpen=false", () => {
    const onClose = vi.fn();
    renderHook(() => useModalBackButton(false, onClose));
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cleanup rimuove listener al unmount", () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useModalBackButton(true, onClose));
    unmount();
    window.dispatchEvent(new PopStateEvent("popstate"));
    // Dopo unmount il handler e' stato rimosso → onClose NON chiamato
    expect(onClose).not.toHaveBeenCalled();
  });

  it("modal toggle (open→close→open) registra nuovo state ogni volta", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(({ open }) => useModalBackButton(open, onClose), {
      initialProps: { open: true },
    });
    expect(window.history.state).toMatchObject({ modal: true });
    // Chiudi (cleanup chiama history.back())
    rerender({ open: false });
    // Riapri → push di nuovo
    rerender({ open: true });
    expect(window.history.state).toMatchObject({ modal: true });
  });
});
