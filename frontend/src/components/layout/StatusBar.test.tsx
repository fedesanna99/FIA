// v2.6.6 E.4 · StatusBar legacy chrome enrichment test.
//
// Verifica refactor v2.6.6 E.4: Online · WebSocket · Sync · counter
// modelli · Solver · counts · crediti · ⌘K Cerca · version. data-testid
// coerenti con ShellStatusBar (sb-ws, sb-sync, sb-models-open, sb-credits).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { StatusBar } from "./StatusBar";
import { useAuthStore } from "../../store/authStore";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";

const getQuotaMock = vi.fn();
vi.mock("../../api/billing", () => ({
  getQuota: () => getQuotaMock(),
}));

function wrap(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAuthStore.setState({
    token: "t",
    user: {
      id: "u1",
      email: "test@example.com",
      role: "user",
      created_at: 0,
      onboarding_completed: true,
    },
  } as never);
  useModelStore.setState({ model: null } as never);
  useAnalysisStore.setState({
    analysisType: "static",
    isRunning: false,
    progress: 0,
    progressMessage: "",
  } as never);
  getQuotaMock.mockReset();
  getQuotaMock.mockResolvedValue({
    user_id: "u1",
    tier: "free",
    cap_credits: 50,
    bonus_credits: 0,
    used_credits: 0,
    month: "2026-05",
  });
});

describe("StatusBar legacy (v2.6.6 E.4 enrichment)", () => {
  it("renders data-testid='statusbar-legacy' wrapper marker", () => {
    render(wrap(<StatusBar />));
    expect(screen.getByTestId("statusbar-legacy")).toBeInTheDocument();
  });

  it("renders Online + WebSocket + Sync + counter modelli per A1 mockup", () => {
    render(wrap(<StatusBar />));
    expect(screen.getByText(/Online/i)).toBeInTheDocument();
    expect(screen.getByTestId("sb-ws")).toBeInTheDocument();
    expect(screen.getByText(/WebSocket connesso/)).toBeInTheDocument();
    expect(screen.getByTestId("sb-sync")).toBeInTheDocument();
    expect(screen.getByText(/Sync OK/)).toBeInTheDocument();
  });

  it("counter '0 modelli aperti' quando no model active", () => {
    render(wrap(<StatusBar />));
    expect(screen.getByText(/0 modelli aperti/)).toBeInTheDocument();
  });

  it("counter '1 modelli aperti' quando model is active", () => {
    useModelStore.setState({
      model: {
        id: "m1", name: "Trave", units: "SI", is_3d: false,
        nodes: [{ id: "n1", x: 0, y: 0, z: 0 }],
        elements: [], loads: [], constraints: [],
      },
    } as never);
    render(wrap(<StatusBar />));
    expect(screen.getByText(/1 modelli aperti/)).toBeInTheDocument();
  });

  it("renders Solver ready (default)", () => {
    render(wrap(<StatusBar />));
    expect(screen.getByText(/Solver/i)).toBeInTheDocument();
    expect(screen.getByText(/ready/i)).toBeInTheDocument();
  });

  it("renders ⌘K Cerca shortcut hint", () => {
    render(wrap(<StatusBar />));
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    expect(screen.getByText("Cerca")).toBeInTheDocument();
  });

  it("renders crediti inline (sb-credits testid)", async () => {
    render(wrap(<StatusBar />));
    const credits = await screen.findByTestId("sb-credits");
    expect(credits).toBeInTheDocument();
    expect(credits.textContent).toMatch(/\d+\/\d+\s*cr/);
  });

  it("renders version chip (statusbar-help button con APP_VERSION)", () => {
    render(wrap(<StatusBar />));
    expect(screen.getByTestId("statusbar-help")).toBeInTheDocument();
  });
});
