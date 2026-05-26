// v2.6.2 Shell · ShellCommandPalette tests
// v2.6.2.1 polish F2: estesi per verificare lettura registry paletteItems.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShellCommandPalette } from "./ShellCommandPalette";
import { useWorkspaceStore } from "../store/workspaceStore";
import { PALETTE_ITEMS } from "../lib/paletteItems";

// Stub useRunAnalysis (peso pesante, non ci serve mock vero)
vi.mock("../hooks/useAnalysis", () => ({
  useRunAnalysis: () => () => Promise.resolve(),
}));

function renderWithQc(node: React.ReactNode) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

describe("ShellCommandPalette", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().setPalette(false);
  });

  it("does not render content when palette closed", () => {
    renderWithQc(<ShellCommandPalette />);
    expect(screen.queryByTestId("shell-command-palette")).not.toBeInTheDocument();
  });

  it("renders modal content when palette open", () => {
    useWorkspaceStore.getState().setPalette(true);
    renderWithQc(<ShellCommandPalette />);
    expect(screen.getByTestId("shell-command-palette")).toBeInTheDocument();
    expect(screen.getByTestId("shell-palette-input")).toBeInTheDocument();
  });

  it("renders many palette items from the registry (>= 100)", () => {
    useWorkspaceStore.getState().setPalette(true);
    renderWithQc(<ShellCommandPalette />);
    // Registry centrale ha ~140 voci. Almeno 100 devono renderizzarsi
    // (Command.Item con data-testid `shell-palette-item-{id}`).
    const items = screen.getAllByTestId(/^shell-palette-item-/);
    expect(items.length).toBeGreaterThanOrEqual(100);
    // Sanity: cardinalità totale corrisponde ai PALETTE_ITEMS importati.
    expect(items.length).toBe(PALETTE_ITEMS.length);
  });

  it("placeholder cita il numero di comandi disponibili", () => {
    useWorkspaceStore.getState().setPalette(true);
    renderWithQc(<ShellCommandPalette />);
    const input = screen.getByTestId("shell-palette-input");
    expect(input).toHaveAttribute(
      "placeholder",
      expect.stringContaining(String(PALETTE_ITEMS.length)),
    );
  });
});
