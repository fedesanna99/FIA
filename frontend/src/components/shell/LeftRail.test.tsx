// v2.6.6 E.2 · LeftRail chrome legacy refactor test.
//
// LeftRail ora ha due modalità (single source of truth via useRailExpansion):
//   - expanded (default desktop ≥md): w-200px con <RailSections> shared
//     component (12 voci, 4 sezioni). Usa data-testid `rail-item-{id}`,
//     `rail-section-{id}`, `rail-collapse-toggle`.
//   - collapsed (mobile o user-pref): w-12 icon-only legacy con 3 voci
//     Make/Solve/Verify. Usa data-testid `left-rail-{model/analysis/verify}`,
//     `left-rail-palette`, `left-rail-help`, `left-rail-toggle-expand`.
//
// jsdom default: window.innerWidth = 1024 → useIsMobile() = false → mode
// expanded di default. Test collapsed forza localStorage "false".
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import { LeftRail } from "./LeftRail";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useLeftRailStore } from "../../store/leftRailStore";
import { useModelStore } from "../../store/modelStore";
import { useToastStore } from "../../store/toastStore";

const STORAGE_KEY = "feapro:rail:expanded";

beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: "model",
    activeTab: {} as never,
    helpOpen: false,
    paletteOpen: false,
  });
  useLeftRailStore.setState({ openSection: null });
  // Reset model store: default un modello fittizio caricato
  useModelStore.setState({
    model: {
      id: "test", name: "Test", units: "SI", is_3d: false,
      nodes: [], elements: [], loads: [], constraints: [],
    },
  } as never);
  useToastStore.setState({ toasts: [] });
  window.localStorage.clear();
});


function renderRail() {
  return render(
    <TooltipProvider>
      <LeftRail />
    </TooltipProvider>
  );
}


// ── Expanded mode (default v2.6.6) ─────────────────────────────────────
describe("LeftRail · expanded mode (v2.6.6 default)", () => {
  it("renders 4 text sections (WORKSPACE/SOLVE/VERIFY/RISORSE)", () => {
    renderRail();
    expect(screen.getByTestId("rail-section-WORKSPACE")).toBeInTheDocument();
    expect(screen.getByTestId("rail-section-SOLVE")).toBeInTheDocument();
    expect(screen.getByTestId("rail-section-VERIFY")).toBeInTheDocument();
    expect(screen.getByTestId("rail-section-RISORSE")).toBeInTheDocument();
  });

  it("renders 12 rail-item (Home/Modelli/Jobs/Cronologia + Lineare/Dinamica/Sismica + Risultati/Checks/Report + Template/Docs)", () => {
    renderRail();
    expect(screen.getByTestId("rail-item-home")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-models")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-jobs")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-history")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-linear")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-dynamic")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-seismic")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-results")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-checks")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-report")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-templates")).toBeInTheDocument();
    expect(screen.getByTestId("rail-item-docs")).toBeInTheDocument();
  });

  it("renders rail-collapse-toggle Comprimi button", () => {
    renderRail();
    expect(screen.getByTestId("rail-collapse-toggle")).toBeInTheDocument();
  });

  it("click rail-collapse-toggle persists collapsed pref in localStorage", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("rail-collapse-toggle"));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
  });

  it("rail-item-checks: click with active model dispatches workspace switch", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("rail-item-checks"));
    expect(useWorkspaceStore.getState().workspace).toBe("verify");
  });

  it("rail-item-linear: click with active model dispatches workspace switch (analisi/static)", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("rail-item-linear"));
    expect(useWorkspaceStore.getState().workspace).toBe("analysis");
  });

  it("rail-item-jobs (placeholder-toast): click emits info toast", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("rail-item-jobs"));
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].level).toBe("info");
    expect(toasts[0].message).toMatch(/Jobs/i);
  });

  // ── Click guard senza modello (v2.6.6 E.2) ──────────────────────
  describe("click guard: requiresModel senza modello attivo", () => {
    beforeEach(() => {
      useModelStore.setState({ model: null } as never);
    });

    it("rail-item-linear senza modello: emit toast educational con CTA", () => {
      renderRail();
      fireEvent.click(screen.getByTestId("rail-item-linear"));
      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].level).toBe("info");
      expect(toasts[0].message).toMatch(/Lineare/);
      expect(toasts[0].action).toBeDefined();
      expect(toasts[0].action?.label).toMatch(/galleria template/i);
    });

    it("rail-item-checks senza modello: NO workspace switch (toast prerequisite)", () => {
      const wsBefore = useWorkspaceStore.getState().workspace;
      renderRail();
      fireEvent.click(screen.getByTestId("rail-item-checks"));
      // Workspace non cambia
      expect(useWorkspaceStore.getState().workspace).toBe(wsBefore);
      // Toast emesso
      expect(useToastStore.getState().toasts.length).toBeGreaterThan(0);
    });

    it("rail-item-templates senza modello: open template gallery (no guard)", () => {
      const events: string[] = [];
      const listener = (e: Event) => events.push(e.type);
      window.addEventListener("feapro:open-template-gallery", listener);
      renderRail();
      fireEvent.click(screen.getByTestId("rail-item-templates"));
      window.removeEventListener("feapro:open-template-gallery", listener);
      expect(events).toContain("feapro:open-template-gallery");
    });
  });
});


// ── Collapsed mode (user-pref override) ────────────────────────────────
describe("LeftRail · collapsed mode (legacy fallback)", () => {
  beforeEach(() => {
    // Forza collapsed via localStorage
    window.localStorage.setItem(STORAGE_KEY, "false");
  });

  it("renders 3 main workspace buttons (Make/Solve/Verify) legacy", () => {
    renderRail();
    expect(screen.getByTestId("left-rail-model")).toBeInTheDocument();
    expect(screen.getByTestId("left-rail-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("left-rail-verify")).toBeInTheDocument();
  });

  it("does NOT render legacy Results/IO buttons (v1.5.2 Task 35)", () => {
    renderRail();
    expect(screen.queryByTestId("left-rail-results")).toBeNull();
    expect(screen.queryByTestId("left-rail-io")).toBeNull();
  });

  it("click on Solve opens slide panel + sets workspace=analysis", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-analysis"));
    expect(useWorkspaceStore.getState().workspace).toBe("analysis");
    expect(useLeftRailStore.getState().openSection).toBe("analysis");
  });

  it("click on Verify opens slide panel + sets workspace=verify", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-verify"));
    expect(useWorkspaceStore.getState().workspace).toBe("verify");
    expect(useLeftRailStore.getState().openSection).toBe("verify");
  });

  it("toggle: clicking same active button closes slide panel", () => {
    useLeftRailStore.setState({ openSection: "model" });
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-model"));
    expect(useWorkspaceStore.getState().workspace).toBe("model");
    expect(useLeftRailStore.getState().openSection).toBeNull();
  });

  it("aria-expanded reflects open state (toggle pattern)", () => {
    renderRail();
    expect(screen.getByTestId("left-rail-model")).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByTestId("left-rail-model"));
    expect(screen.getByTestId("left-rail-model")).toHaveAttribute("aria-expanded", "true");
  });

  it("palette + help buttons rendered", () => {
    renderRail();
    expect(screen.getByTestId("left-rail-palette")).toBeInTheDocument();
    expect(screen.getByTestId("left-rail-help")).toBeInTheDocument();
  });

  it("clicking palette button toggles palette open", () => {
    renderRail();
    expect(useWorkspaceStore.getState().paletteOpen).toBe(false);
    fireEvent.click(screen.getByTestId("left-rail-palette"));
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
  });

  it("v2.6.6 E.2: toggle Espandi rail riporta a expanded mode", () => {
    renderRail();
    expect(screen.getByTestId("left-rail-toggle-expand")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("left-rail-toggle-expand"));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  // v1.6 S0 · B03: disabled state legacy mantenuto
  describe("disabled state quando model===null (collapsed)", () => {
    beforeEach(() => {
      useModelStore.setState({ model: null } as never);
    });

    it("Make/Solve/Verify hanno aria-disabled=true", () => {
      renderRail();
      expect(screen.getByTestId("left-rail-model").getAttribute("aria-disabled")).toBe("true");
      expect(screen.getByTestId("left-rail-analysis").getAttribute("aria-disabled")).toBe("true");
      expect(screen.getByTestId("left-rail-verify").getAttribute("aria-disabled")).toBe("true");
    });

    it("click su Make disabled NON apre il pannello", () => {
      renderRail();
      fireEvent.click(screen.getByTestId("left-rail-model"));
      expect(useLeftRailStore.getState().openSection).toBeNull();
    });

    it("palette + help restano abilitati senza modello", () => {
      renderRail();
      expect(screen.getByTestId("left-rail-palette")).not.toHaveAttribute("aria-disabled");
      expect(screen.getByTestId("left-rail-help")).not.toHaveAttribute("aria-disabled");
    });
  });
});
