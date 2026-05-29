// v2.6.2 Shell · ShellTopBar tests
// v2.6.2.1 polish F3: aggiunti test per modelShortId slug semantico.
// v3.4 Fetta E2-IA Commit E2.1: aggiunti test per 3 icone fisse + 2 toggle.
// v3.4 Fetta M1 mobile (30/05/2026): aggiunto MemoryRouter al wrap di render
// (ShellTopBar ora include ShellTopBarMobileMenu che usa useNavigate, in
// aggiunta a quello gia' presente in ShellTopBar per handleModelli/Jobs).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShellTopBar, modelShortId } from "./ShellTopBar";
import { useWorkspaceStore } from "../store/workspaceStore";
// v3.4 Fetta E2-IA Commit E2.4: reset leftTreeStore fra i test
// (il toggle Albero ora cabla a uno store Zustand singleton invece
// di useState locale → deve essere isolato fra i test).
import { useLeftTreeStore } from "../store/leftTreeStore";

// Stub hook useRunAnalysis (importa libreria pesante quando reale)
vi.mock("../hooks/useAnalysis", () => ({
  useRunAnalysis: () => () => Promise.resolve(),
}));

// v3.4 Fetta M1 mobile: stub onboarding (importato da ShellTopBarMobileMenu)
vi.mock("../lib/onboarding", () => ({
  useResetOnboarding: () => () => Promise.resolve(),
  startOnboardingTour: vi.fn(),
}));

function renderWithQc(node: React.ReactNode) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ShellTopBar", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().setPalette(false);
    // v3.4 Fetta E2-IA Commit E2.1: assicura che il focus mode sia OFF
    // all'inizio di ogni test (il toggle Focus lo cambia).
    useWorkspaceStore.getState().exitEmptyState();
    // v3.4 Fetta E2-IA Commit E2.4: reset toggle Albero a "closed".
    useLeftTreeStore.setState({ treeState: "closed" });
    try { window.localStorage.removeItem("feapro-left-tree"); } catch { /* ignore */ }
  });

  it("renders brand block with FEA Pro + version", () => {
    renderWithQc(<ShellTopBar />);
    expect(screen.getByText(/FEA Pro/)).toBeInTheDocument();
    // APP_VERSION (version-agnostic, v2.6 → v3.x dopo bump v3.0.0)
    expect(screen.getByText(/v[23]\.\d+/)).toBeInTheDocument();
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

  // ──────────────────────────────────────────────────────────────────────
  // v3.4 Fetta E2-IA Commit E2.1 — 3 icone fisse + 2 toggle
  // ──────────────────────────────────────────────────────────────────────

  it("renders 3 icone fisse Home/Modelli/Jobs in topbar quick-nav", () => {
    renderWithQc(<ShellTopBar />);
    expect(screen.getByTestId("topbar-quick-nav")).toBeInTheDocument();
    expect(screen.getByTestId("topbar-nav-home")).toBeInTheDocument();
    expect(screen.getByTestId("topbar-nav-modelli")).toBeInTheDocument();
    expect(screen.getByTestId("topbar-nav-jobs")).toBeInTheDocument();
  });

  it("Home icon dispatches feapro:go-home event on click", () => {
    renderWithQc(<ShellTopBar />);
    const spy = vi.fn();
    window.addEventListener("feapro:go-home", spy);
    fireEvent.click(screen.getByTestId("topbar-nav-home"));
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener("feapro:go-home", spy);
  });

  it("Albero toggle defaults off and toggles aria-pressed + data-state", () => {
    renderWithQc(<ShellTopBar />);
    const btn = screen.getByTestId("topbar-toggle-tree");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.getAttribute("data-state")).toBe("off");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.getAttribute("data-state")).toBe("on");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.getAttribute("data-state")).toBe("off");
  });

  it("Focus toggle enters/exits workspaceStore empty state", () => {
    renderWithQc(<ShellTopBar />);
    const btn = screen.getByTestId("topbar-toggle-focus");
    expect(useWorkspaceStore.getState().isEmptyState).toBe(false);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(btn);
    expect(useWorkspaceStore.getState().isEmptyState).toBe(true);
    // Nuovo render → il bottone riflette lo store. NB: useWorkspaceStore è
    // sottoscritto via hook, quindi React deve aver gia' aggiornato il DOM.
    expect(screen.getByTestId("topbar-toggle-focus").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("topbar-toggle-focus").getAttribute("data-state")).toBe("on");
    // Toggle off
    fireEvent.click(screen.getByTestId("topbar-toggle-focus"));
    expect(useWorkspaceStore.getState().isEmptyState).toBe(false);
  });

  it("Focus toggle riflette lo store quando entrato in focus dall'esterno", () => {
    renderWithQc(<ShellTopBar />);
    const btn = screen.getByTestId("topbar-toggle-focus");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    // Esterno (es. tasto F globale) entra in focus mode → topbar lo riflette.
    // act() forza il flush del re-render Zustand → React prima dell'assert.
    act(() => {
      useWorkspaceStore.getState().enterEmptyState();
    });
    expect(screen.getByTestId("topbar-toggle-focus").getAttribute("aria-pressed")).toBe("true");
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
