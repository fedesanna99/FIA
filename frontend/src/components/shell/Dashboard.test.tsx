import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { FEAModel } from "../../types/model";
import { Dashboard } from "./Dashboard";

vi.mock("../../api/billing", () => ({
  getQuota: vi.fn().mockResolvedValue({
    user_id: "demo_user",
    tier: "free",
    month: "2026-05",
    used_credits: 0,
    cap_credits: 100,
    bonus_credits: 0,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const model: FEAModel = {
  id: "m1",
  name: "Telaio test",
  units: "SI",
  is_3d: true,
  nodes: [],
  elements: [],
  loads: [],
  constraints: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Dashboard offline/database state", () => {
  it("mostra il banner offline e permette il retry", () => {
    const onRetryModels = vi.fn();
    render(
      <Dashboard
        models={[]}
        modelsUnavailable
        onRetryModels={onRetryModels}
        onSelect={() => {}}
      />,
      { wrapper },
    );

    expect(screen.getByText("Backend/database non disponibile.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /riprova/i }));
    expect(onRetryModels).toHaveBeenCalledTimes(1);
  });

  it("disabilita le quick action quando le API dei modelli non rispondono", () => {
    render(
      <Dashboard models={[]} modelsUnavailable onSelect={() => {}} />,
      { wrapper },
    );

    expect(screen.getByTestId("dashboard-action-new")).toBeDisabled();
    expect(screen.getByTestId("dashboard-action-template")).toBeDisabled();
    expect(screen.getByTestId("dashboard-action-import")).toBeDisabled();
    expect(screen.getByTestId("dashboard-action-examples")).toBeDisabled();
    // v2.1.6: testo banner aggiornato dal refactor Precision PR16. Il
    // wording attuale spiega che la UI resta navigabile ma le API
    // (modelli/salvataggi) richiedono il backend.
    expect(screen.getByText("Backend/database non disponibile.")).toBeInTheDocument();
    expect(
      screen.getByText(/La UI resta navigabile, ma modelli e salvataggi richiedono le API\./),
    ).toBeInTheDocument();
  });

  it("mantiene le action abilitate quando i modelli sono disponibili", () => {
    const onSelect = vi.fn();
    render(<Dashboard models={[model]} onSelect={onSelect} />, { wrapper });

    expect(screen.queryByText("Backend/database non disponibile.")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-action-new")).not.toBeDisabled();
    fireEvent.click(screen.getByText("Telaio test"));
    expect(onSelect).toHaveBeenCalledWith("m1");
  });

  // v1.8 T1 / v2.0 PR13: CTA doppia Studio Pro / Percorsi (rifatta come hub
  // panel A1 Claude Design con axis-tag + titolo 2 righe + bullets)
  it("mostra hub doppi Studio Pro + Percorsi (v2.0 PR13)", () => {
    render(<Dashboard models={[]} onSelect={() => {}} />, { wrapper });
    expect(screen.getByTestId("home-cta-studio-pro")).toBeInTheDocument();
    expect(screen.getByTestId("home-cta-percorsi")).toBeInTheDocument();
    // Axis-tag presenti in tipografia Precision.
    expect(screen.getByText(/\/ Studio Pro/)).toBeInTheDocument();
    expect(screen.getByText(/\/ Percorsi/)).toBeInTheDocument();
    // Titoli a 2 righe.
    expect(screen.getByText(/Controllo totale/)).toBeInTheDocument();
    expect(screen.getByText(/Guidato, senza/)).toBeInTheDocument();
  });

  it("CTA Percorsi dispatcha evento feapro:open-percorsi", () => {
    const listener = vi.fn();
    window.addEventListener("feapro:open-percorsi", listener);
    render(<Dashboard models={[]} onSelect={() => {}} />, { wrapper });
    fireEvent.click(screen.getByTestId("home-cta-percorsi"));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("feapro:open-percorsi", listener);
  });

  it("CTA Studio Pro/Percorsi disabilitate quando modelsUnavailable", () => {
    render(<Dashboard models={[]} modelsUnavailable onSelect={() => {}} />, { wrapper });
    expect(screen.getByTestId("home-cta-studio-pro")).toBeDisabled();
    expect(screen.getByTestId("home-cta-percorsi")).toBeDisabled();
  });

  // v1.6.1 T2 · BUG-2
  it("non espone un bottone 'View' inline accanto a QuotaCard", () => {
    render(<Dashboard models={[model]} onSelect={() => {}} />, { wrapper });
    expect(screen.queryByTestId("dashboard-open-view")).not.toBeInTheDocument();
    // Difensivo: nessun bottone con label esatto "View" nel corpo Dashboard.
    const viewButtons = screen
      .queryAllByRole("button", { name: /^View$/ })
      .filter((b) => !b.getAttribute("data-testid")?.startsWith("right-rail"));
    expect(viewButtons).toHaveLength(0);
  });
});
