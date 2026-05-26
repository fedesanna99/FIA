// v2.6.2 Shell · ShellTopBar tests
// v2.6.2.1 polish F3: aggiunti test per modelShortId slug semantico.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShellTopBar, modelShortId } from "./ShellTopBar";
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

  // v2.6.5 D.3: brand eyebrow "WORKSPACE" mockup A1
  it("renders WORKSPACE eyebrow before brand mark", () => {
    renderWithQc(<ShellTopBar />);
    const eyebrow = screen.getByTestId("topbar-eyebrow");
    expect(eyebrow).toBeInTheDocument();
    expect(eyebrow.textContent).toBe("WORKSPACE");
  });
});

describe("modelShortId (v2.6.2.1 F3)", () => {
  it("returns initials uppercase from multi-word name", () => {
    expect(modelShortId({ id: "abc", name: "Telaio portale 2D" })).toBe("TP2");
  });

  it("returns initials from 2-word name", () => {
    expect(modelShortId({ id: "abc", name: "Mensola lineare" })).toBe("ML");
  });

  it("returns first 4 letters when single word", () => {
    expect(modelShortId({ id: "abc", name: "Pushover" })).toBe("P");
  });

  it("falls back to UUID prefix uppercase when name empty", () => {
    expect(modelShortId({ id: "abc123def", name: "" })).toBe("ABC1");
  });

  it("returns dash for null model", () => {
    expect(modelShortId(null)).toBe("—");
  });

  it("limits result to 4 characters", () => {
    expect(modelShortId({ id: "x", name: "Acca Bibi Cici Didi Eeee Fefe" })).toBe("ABCD");
  });
});
