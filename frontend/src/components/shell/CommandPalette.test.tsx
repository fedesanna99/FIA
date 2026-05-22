import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

import { CommandPalette } from "./CommandPalette";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useModelStore } from "../../store/modelStore";


// I store sono Zustand: facciamo reset esplicito (no QueryClient mocking necessario).
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}


beforeEach(() => {
  act(() => {
    useWorkspaceStore.setState({ paletteOpen: true, workspace: "model" } as any);
    useModelStore.setState({ model: null } as any);
  });
});


describe("CommandPalette · v1.6 S0 B02 click-outside backdrop", () => {
  it("renderizza il backdrop come elemento DOM cliccabile", () => {
    render(<CommandPalette />, { wrapper });
    const backdrop = screen.getByTestId("palette-backdrop");
    expect(backdrop).toBeInTheDocument();
    expect(backdrop.getAttribute("aria-hidden")).toBe("true");
  });

  it("click sul backdrop chiama setPalette(false) e chiude la palette", () => {
    render(<CommandPalette />, { wrapper });
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
    const backdrop = screen.getByTestId("palette-backdrop");
    fireEvent.click(backdrop);
    expect(useWorkspaceStore.getState().paletteOpen).toBe(false);
  });

  it("click sul container interno (input/lista) NON chiude la palette", () => {
    render(<CommandPalette />, { wrapper });
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
    const input = screen.getByTestId("palette-input");
    fireEvent.click(input);
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
  });

  it("Ctrl+K toggle apre/chiude la palette globalmente", () => {
    // Parto chiusa
    act(() => useWorkspaceStore.setState({ paletteOpen: false } as any));
    render(<CommandPalette />, { wrapper });
    expect(useWorkspaceStore.getState().paletteOpen).toBe(false);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(useWorkspaceStore.getState().paletteOpen).toBe(false);
  });
});
