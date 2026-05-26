/**
 * RecentModelsGrid.test.tsx (v2.6.5 D.2).
 *
 * Test sezione "Modelli recenti" home dashboard. Mock TanStack Query
 * fetch via modelsApi.list (no MSW richiesto).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RecentModelsGrid } from "./RecentModelsGrid";

// Mock modelsApi.list per controllare il payload nei diversi test
const listMock = vi.fn();
vi.mock("../../api/client", () => ({
  modelsApi: {
    list: () => listMock(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  listMock.mockReset();
});

const makeModel = (id: string, name: string, is3d = false, nodes = 5) => ({
  id,
  name,
  units: "SI",
  is_3d: is3d,
  nodes: Array.from({ length: nodes }, (_, i) => ({ id: `n${i}`, x: 0, y: 0, z: 0 })),
  elements: Array.from({ length: 4 }, (_, i) => ({ id: `e${i}` })),
  loads: [],
  constraints: [],
});

describe("RecentModelsGrid (v2.6.5 D.2 + v2.6.6 E.3)", () => {
  // v2.6.6 E.3: empty state esplicito invece di auto-hide su 0 modelli.
  it("renders empty state when 0 user models (v2.6.6 E.3 fix composition)", async () => {
    listMock.mockResolvedValue([]);
    render(<RecentModelsGrid onSelect={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("recent-models-empty")).toBeInTheDocument();
    });
    // Title sempre visibile
    expect(screen.getByText("Modelli recenti")).toBeInTheDocument();
    // CTA presenti
    expect(screen.getByTestId("recent-empty-cta-templates")).toBeInTheDocument();
    expect(screen.getByTestId("recent-empty-cta-new")).toBeInTheDocument();
  });

  it("v2.6.6 E.3: empty state CTA 'Apri galleria template' dispatches feapro:open-template-gallery", async () => {
    listMock.mockResolvedValue([]);
    const listener = vi.fn();
    window.addEventListener("feapro:open-template-gallery", listener);
    render(<RecentModelsGrid onSelect={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("recent-empty-cta-templates")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("recent-empty-cta-templates"));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("feapro:open-template-gallery", listener);
  });

  it("v2.6.6 E.3: empty state CTA 'Nuovo modello da zero' dispatches feapro:open-new-model", async () => {
    listMock.mockResolvedValue([]);
    const listener = vi.fn();
    window.addEventListener("feapro:open-new-model", listener);
    render(<RecentModelsGrid onSelect={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("recent-empty-cta-new")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("recent-empty-cta-new"));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("feapro:open-new-model", listener);
  });

  it("v2.6.6 E.3: loading state renders skeleton placeholder (4 cards)", async () => {
    // Promise mai risolta → resta in loading
    listMock.mockImplementation(() => new Promise(() => { /* never */ }));
    render(<RecentModelsGrid onSelect={vi.fn()} />, { wrapper });
    // Skeleton wrapper presente
    expect(screen.getByTestId("recent-models-skeleton")).toBeInTheDocument();
    // 4 skeleton card placeholder
    expect(screen.getByTestId("recent-model-skeleton-0")).toBeInTheDocument();
    expect(screen.getByTestId("recent-model-skeleton-1")).toBeInTheDocument();
    expect(screen.getByTestId("recent-model-skeleton-2")).toBeInTheDocument();
    expect(screen.getByTestId("recent-model-skeleton-3")).toBeInTheDocument();
    // aria-busy per accessibility
    expect(screen.getByTestId("recent-models-skeleton").getAttribute("aria-busy")).toBe("true");
  });

  it("filters out demo models (id starts with 'ex_')", async () => {
    listMock.mockResolvedValue([
      makeModel("ex_simple_beam_2d", "Demo Trave"),
      makeModel("m1", "Modello utente"),
    ]);
    render(<RecentModelsGrid onSelect={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Modello utente")).toBeInTheDocument();
    });
    // Demo NON deve apparire
    expect(screen.queryByText("Demo Trave")).toBeNull();
  });

  it("renders up to 4 cards (slice + reverse for most recent first)", async () => {
    listMock.mockResolvedValue([
      makeModel("m1", "Uno"),
      makeModel("m2", "Due"),
      makeModel("m3", "Tre"),
      makeModel("m4", "Quattro"),
      makeModel("m5", "Cinque"),
      makeModel("m6", "Sei"),
    ]);
    render(<RecentModelsGrid onSelect={vi.fn()} />, { wrapper });
    await waitFor(() => {
      // Reverse order: m6 è il più recente
      expect(screen.getByText("Sei")).toBeInTheDocument();
    });
    // Devono apparire 4: Sei, Cinque, Quattro, Tre
    expect(screen.getByText("Sei")).toBeInTheDocument();
    expect(screen.getByText("Cinque")).toBeInTheDocument();
    expect(screen.getByText("Quattro")).toBeInTheDocument();
    expect(screen.getByText("Tre")).toBeInTheDocument();
    // Uno e Due NON devono apparire (slice 4)
    expect(screen.queryByText("Uno")).toBeNull();
    expect(screen.queryByText("Due")).toBeNull();
  });

  it("click on card calls onSelect with model id", async () => {
    listMock.mockResolvedValue([makeModel("m1", "Trave bi-appoggiata", false, 11)]);
    const onSelect = vi.fn();
    render(<RecentModelsGrid onSelect={onSelect} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("recent-model-m1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("recent-model-m1"));
    expect(onSelect).toHaveBeenCalledWith("m1");
  });

  it("status badge OK for non-empty model, DRAFT for nodes=0", async () => {
    listMock.mockResolvedValue([
      makeModel("m1", "Pieno", false, 5),
      makeModel("m2", "Vuoto", false, 0),
    ]);
    render(<RecentModelsGrid onSelect={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Pieno")).toBeInTheDocument();
    });
    // m1 (5 nodi) → badge OK
    const cardM1 = screen.getByTestId("recent-model-m1");
    expect(cardM1.querySelector("[data-testid='badge-ok']")).not.toBeNull();
    // m2 (0 nodi) → badge DRAFT
    const cardM2 = screen.getByTestId("recent-model-m2");
    expect(cardM2.querySelector("[data-testid='badge-draft']")).not.toBeNull();
  });

  it("'Vedi tutti →' dispatches feapro:open-models-list", async () => {
    listMock.mockResolvedValue([makeModel("m1", "Trave", false, 5)]);
    const listener = vi.fn();
    window.addEventListener("feapro:open-models-list", listener);
    render(<RecentModelsGrid onSelect={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("recent-models-see-all")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("recent-models-see-all"));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("feapro:open-models-list", listener);
  });

  it("3D model shows 3D in metadata", async () => {
    listMock.mockResolvedValue([makeModel("m3d", "Cubo 3D", true, 8)]);
    render(<RecentModelsGrid onSelect={vi.fn()} />, { wrapper });
    await waitFor(() => {
      const card = screen.getByTestId("recent-model-m3d");
      expect(card.textContent).toContain("3D");
    });
  });
});
