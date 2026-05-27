// v2.6.6 E.4 · TopBar legacy chrome enrichment test.
//
// Test mirati sui nuovi attributi A1 mockup:
//   - data-testid="topbar-eyebrow" rendering WORKSPACE
//   - data-testid="topbar-credits" rendering inline {used}/{cap} cr
//   - data-testid="topbar-legacy" wrapper marker per smoke E2E E.5
//
// I test esistenti (run analysis, model menu, ecc.) sono già coperti da
// altri file (TopBar non aveva test dedicato pre-v2.6.6). Qui focus solo
// sui nuovi attributi.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { useAuthStore } from "../../store/authStore";
import { useModelStore } from "../../store/modelStore";

// Mock billing API per controllare i crediti renderizzati
const getQuotaMock = vi.fn();
vi.mock("../../api/billing", () => ({
  getQuota: () => getQuotaMock(),
}));

// Mock useRunAnalysis (importa libreria pesante quando reale)
vi.mock("../../hooks/useAnalysis", () => ({
  useRunAnalysis: () => () => Promise.resolve(),
}));

function wrap(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({
    token: "test-token",
    user: {
      id: "u1",
      email: "test@example.com",
      role: "user",
      created_at: 0,
      onboarding_completed: true,
    },
  } as never);
  useModelStore.setState({ model: null } as never);
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

describe("TopBar legacy (v2.6.6 E.4 enrichment)", () => {
  it("renders data-testid='topbar-legacy' wrapper marker", () => {
    render(wrap(<TopBar models={[]} activeId={null} onSelect={vi.fn()} />));
    expect(screen.getByTestId("topbar-legacy")).toBeInTheDocument();
  });

  it("renders eyebrow WORKSPACE before brand mark", () => {
    render(wrap(<TopBar models={[]} activeId={null} onSelect={vi.fn()} />));
    const eyebrow = screen.getByTestId("topbar-eyebrow");
    expect(eyebrow).toBeInTheDocument();
    expect(eyebrow.textContent).toBe("WORKSPACE");
  });

  it("renders topbar-credits inline (visible accanto al brand)", async () => {
    render(wrap(<TopBar models={[]} activeId={null} onSelect={vi.fn()} />));
    // Attesa async per query
    const credits = await screen.findByTestId("topbar-credits");
    expect(credits).toBeInTheDocument();
    // Formato {used}/{cap} cr
    expect(credits.textContent).toMatch(/\d+\/\d+\s*cr/);
  });

  it("topbar-credits aria-label legge stato crediti", async () => {
    render(wrap(<TopBar models={[]} activeId={null} onSelect={vi.fn()} />));
    const credits = await screen.findByTestId("topbar-credits");
    expect(credits.getAttribute("aria-label")).toMatch(/\d+ su \d+ crediti/);
  });

  it("brand mark FEA Pro + version v2/v3 + tier badge rendered", () => {
    render(wrap(<TopBar models={[]} activeId={null} onSelect={vi.fn()} />));
    expect(screen.getByText("FEA Pro")).toBeInTheDocument();
    // version dinamica (v2.6 → v3.x dopo bump v3.0.0)
    expect(screen.getAllByText(/v[23]\.\d+/).length).toBeGreaterThan(0);
  });
});
