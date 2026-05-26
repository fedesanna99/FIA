// v2.6.2 Shell · ShellTopBar tests
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShellTopBar } from "./ShellTopBar";
import { useWorkspaceStore } from "../store/workspaceStore";

// Stub hook useRunAnalysis (importa libreria pesante quando reale)
vi.mock("../hooks/useAnalysis", () => ({
  useRunAnalysis: () => () => Promise.resolve(),
}));

function renderWithQc(node: React.ReactNode) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

describe("ShellTopBar", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().setPalette(false);
  });

  it("renders brand block with FEA Pro + version", () => {
    renderWithQc(<ShellTopBar />);
    expect(screen.getByText(/FEA Pro/)).toBeInTheDocument();
    // APP_VERSION
    expect(screen.getByText(/v2\.6/)).toBeInTheDocument();
  });

  it("renders Esegui run button", () => {
    renderWithQc(<ShellTopBar />);
    expect(screen.getByRole("button", { name: /esegui analisi statica/i })).toBeInTheDocument();
  });

  it("search pill opens command palette on click", () => {
    renderWithQc(<ShellTopBar />);
    expect(useWorkspaceStore.getState().paletteOpen).toBe(false);
    const search = screen.getByTestId("topbar-search");
    fireEvent.click(search);
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
  });

  it("renders trust badge Preliminary", () => {
    renderWithQc(<ShellTopBar />);
    expect(screen.getByText("Preliminary")).toBeInTheDocument();
  });
});
