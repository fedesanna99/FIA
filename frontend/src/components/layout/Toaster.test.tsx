import { describe, it, expect, beforeEach } from "vitest";
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
});
