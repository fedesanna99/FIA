/**
 * Shell.test.tsx (v2.6.3.1 BUG-#1 fix).
 *
 * Verifica il workspace takeover (viewport area piena per workspace
 * Verifiche). NB: i test girano in jsdom senza canvas R3F reale —
 * `children` è solo un wrapper data-testid.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Shell } from "./Shell";
import {
  useShellIntentStore,
  type ShellWorkspaceIntent,
} from "../store/shellIntentStore";

// Mock dei panel content (children non sono rilevanti, solo che Shell.tsx
// orchestri correttamente takeover vs normal).
vi.mock("./panels/MakePanel", () => ({
  MakePanel: () => <div data-testid="mock-make-panel">MakePanel</div>,
}));
vi.mock("./panels/SolvePanel", () => ({
  SolvePanel: () => <div data-testid="mock-solve-panel">SolvePanel</div>,
}));
vi.mock("./panels/InspectPanel", () => ({
  InspectPanel: () => <div data-testid="mock-inspect-panel">InspectPanel</div>,
}));
vi.mock("./panels/ToolsPanel", () => ({
  ToolsPanel: () => <div data-testid="mock-tools-panel">ToolsPanel</div>,
}));
vi.mock("./panels/VerifyPanel", () => ({
  VerifyPanel: ({ fullArea }: { fullArea?: boolean }) => (
    <div data-testid="mock-verify-panel" data-full-area={fullArea ? "true" : undefined}>
      VerifyPanel (fullArea={fullArea ? "1" : "0"})
    </div>
  ),
}));

// I sub-component della Shell sono già testati altrove; qui mock-iamo solo
// quello necessario per non rompere il render.
vi.mock("./ShellTopBar", () => ({
  ShellTopBar: () => <div data-testid="mock-topbar">TopBar</div>,
}));
vi.mock("./ShellRail", () => ({
  ShellRail: ({ active, onChange }: { active: string; onChange: (id: string) => void }) => (
    <nav data-testid="mock-rail" data-active={active}>
      <button data-testid="rail-modello" onClick={() => onChange("modello")}>M</button>
      <button data-testid="rail-verifiche" onClick={() => onChange("verifiche")}>V</button>
      <button data-testid="rail-risultati" onClick={() => onChange("risultati")}>R</button>
    </nav>
  ),
}));
vi.mock("./ShellViewport", () => ({
  ShellViewport: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="mock-viewport">{children}</section>
  ),
}));
vi.mock("./ShellPanel", () => ({
  ShellPanel: ({ workspace, children }: { workspace: string; children: React.ReactNode }) => (
    <aside data-testid="mock-shell-panel" data-workspace={workspace}>{children}</aside>
  ),
}));
// v3.4 Fetta E2-IA Commit E2.2: mock della ShellRightReopenTab. La tab
// verticale destra prende il posto di ShellPanel quando il rightPanelStore
// e' in stato "closed". Il behaviour interno (label, click open()) e'
// coperto da ShellRightReopenTab.test.tsx — qui mockata per orchestrazione.
vi.mock("./ShellRightReopenTab", () => ({
  ShellRightReopenTab: ({ workspace }: { workspace: string }) => (
    <button data-testid="mock-shell-right-reopen-tab" data-workspace={workspace}>
      ReopenTab
    </button>
  ),
}));
// v3.4 Fetta E2-IA Commit E2.4: mock del ShellLeftTreePanel. Il panel
// SX "Albero modello" viene renderizzato tra Rail e Viewport quando
// `leftTreeStore.treeState === "open"`. Il behaviour interno (sezioni,
// count modelStore, click X) e' coperto da ShellLeftTreePanel.test.tsx
// — qui mockato per testare l'orchestrazione (conditional rendering,
// data-attribute root, precedenze focus/takeover).
vi.mock("./ShellLeftTreePanel", () => ({
  ShellLeftTreePanel: () => (
    <aside data-testid="mock-shell-left-tree-panel">LeftTreePanel</aside>
  ),
}));
vi.mock("./ShellStatusBar", () => ({
  ShellStatusBar: () => <div data-testid="mock-statusbar">StatusBar</div>,
}));
vi.mock("./ShellCommandPalette", () => ({
  ShellCommandPalette: () => <div data-testid="mock-palette">Palette</div>,
}));
// redesign/workspace-fasi (FETTA 1): mock dello stepper così Shell.test.tsx
// resta focalizzato sull'orchestrazione (takeover/focus). Il behaviour
// dello stepper è coperto da ShellPhaseStepper.test.tsx.
vi.mock("./ShellPhaseStepper", () => ({
  ShellPhaseStepper: ({ active }: { active: string; onChange: (id: string) => void }) => (
    <nav data-testid="mock-phase-stepper" data-active={active}>PhaseStepper</nav>
  ),
}));
// redesign/workspace-fasi (FETTA 2a): mock ResultsTabsPanel +
// ResultsVerdictStrip per non rompere Shell.test (testati separatamente).
vi.mock("./results/ResultsTabsPanel", () => ({
  ResultsTabsPanel: () => <div data-testid="mock-results-tabs-panel">ResultsTabsPanel</div>,
}));
vi.mock("./results/ResultsVerdictStrip", () => ({
  ResultsVerdictStrip: () => <div data-testid="mock-results-verdict-strip">ResultsVerdictStrip</div>,
}));

import { vi } from "vitest";
// redesign/workspace-fasi (FETTA 0): reset isFocusMode (=isEmptyState)
// fra i test per evitare carry-over fra describe blocks (Zustand è singleton).
import { useWorkspaceStore } from "../store/workspaceStore";
// v3.4 Fetta E2-IA Commit E2.2: reset panel destro stato fra i test
// (default "open" → comportamento invariato sui test pre-esistenti).
import { useRightPanelStore } from "../store/rightPanelStore";
// v3.4 Fetta E2-IA Commit E2.4: reset panel SX "Albero" stato fra i
// test (default "closed" → grid 3-col invariata sui test pre-esistenti).
import { useLeftTreeStore } from "../store/leftTreeStore";

describe("Shell · workspace takeover (v2.6.3.1 BUG-#1)", () => {
  beforeEach(() => {
    // Reset focus mode prima di ogni test (Zustand store è singleton).
    useWorkspaceStore.setState({ isEmptyState: false });
    // rifinitura 2c: reset intent store (Zustand singleton).
    useShellIntentStore.setState({ pendingWorkspace: null });
    // Reset workspace persisted in sessionStorage (default = modello).
    try { window.sessionStorage.removeItem("feapro:shell:active-workspace"); } catch { /* ignore */ }
    // v3.4 Fetta E2-IA Commit E2.2: reset panel destro a "open"
    // (default) cosi' i test pre-esistenti sul takeover/normal mode
    // vedono il ShellPanel come prima.
    useRightPanelStore.setState({ panelState: "open" });
    try { window.localStorage.removeItem("feapro-right-panel"); } catch { /* ignore */ }
    // v3.4 Fetta E2-IA Commit E2.4: reset panel SX Albero a "closed"
    // (default) cosi' la grid resta 3-col come prima.
    useLeftTreeStore.setState({ treeState: "closed" });
    try { window.localStorage.removeItem("feapro-left-tree"); } catch { /* ignore */ }
  });

  it("default workspace=modello: renders ShellViewport + ShellPanel (normal mode)", () => {
    render(<Shell><div data-testid="canvas-children">Canvas R3F</div></Shell>);
    expect(screen.getByTestId("mock-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("mock-shell-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("shell-takeover-content")).toBeNull();
    // Canvas children è dentro viewport
    expect(screen.getByTestId("canvas-children")).toBeInTheDocument();
    // redesign/workspace-fasi (FETTA 1): la spina 3 fasi è renderizzata
    // sotto la topbar (additiva, NON sostituisce il rail).
    expect(screen.getByTestId("mock-phase-stepper")).toBeInTheDocument();
    // E coesiste con il rail (railConfig LOCKED, doppia navigazione voluta).
    expect(screen.getByTestId("mock-rail")).toBeInTheDocument();
  });

  it("switching to verifiche: replaces viewport+panel with takeover-content", () => {
    render(<Shell><div data-testid="canvas-children">Canvas R3F</div></Shell>);
    fireEvent.click(screen.getByTestId("rail-verifiche"));

    // Takeover content visibile
    expect(screen.getByTestId("shell-takeover-content")).toBeInTheDocument();
    // VerifyPanel renderizzato con fullArea=true
    const verify = screen.getByTestId("mock-verify-panel");
    expect(verify).toBeInTheDocument();
    expect(verify.getAttribute("data-full-area")).toBe("true");

    // Viewport e ShellPanel NON renderizzati in takeover
    expect(screen.queryByTestId("mock-viewport")).toBeNull();
    expect(screen.queryByTestId("mock-shell-panel")).toBeNull();
    expect(screen.queryByTestId("canvas-children")).toBeNull();
  });

  it("switching away from verifiche: restores normal mode", () => {
    render(<Shell><div data-testid="canvas-children">Canvas R3F</div></Shell>);
    fireEvent.click(screen.getByTestId("rail-verifiche"));
    expect(screen.getByTestId("shell-takeover-content")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("rail-risultati"));
    expect(screen.queryByTestId("shell-takeover-content")).toBeNull();
    expect(screen.getByTestId("mock-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("mock-shell-panel")).toBeInTheDocument();
  });

  it("shell-takeover-on class is applied to root when in takeover", () => {
    const { container } = render(<Shell><div /></Shell>);
    const root = container.querySelector(".shell");
    expect(root?.className).not.toContain("shell-takeover-on");

    fireEvent.click(screen.getByTestId("rail-verifiche"));
    expect(root?.className).toContain("shell-takeover-on");

    fireEvent.click(screen.getByTestId("rail-modello"));
    expect(root?.className).not.toContain("shell-takeover-on");
  });

  it("FETTA 2a: workspace=risultati monta ResultsTabsPanel + ResultsVerdictStrip overlay", () => {
    render(<Shell><div data-testid="canvas-children" /></Shell>);
    // Default workspace e' "modello": niente strip ne' results panel
    expect(screen.queryByTestId("mock-results-verdict-strip")).toBeNull();
    expect(screen.queryByTestId("mock-results-tabs-panel")).toBeNull();

    fireEvent.click(screen.getByTestId("rail-risultati"));
    // Ora vediamo il nuovo panel + l'overlay viewport
    expect(screen.getByTestId("mock-results-tabs-panel")).toBeInTheDocument();
    expect(screen.getByTestId("mock-results-verdict-strip")).toBeInTheDocument();
  });

  it("FETTA 2a: cambio da risultati a modello smonta la verdict strip", () => {
    render(<Shell><div /></Shell>);
    fireEvent.click(screen.getByTestId("rail-risultati"));
    expect(screen.getByTestId("mock-results-verdict-strip")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("rail-modello"));
    expect(screen.queryByTestId("mock-results-verdict-strip")).toBeNull();
  });

  it("rifinitura 2c: Shell consumes pendingWorkspace from intent store and updates activeWs", () => {
    // Bug catturato dal vivo: CTA toast non navigava (window event con
    // closure stale post-HMR). Fix: store globale Zustand, immune a HMR.
    // Default workspace = modello
    render(<Shell><div /></Shell>);
    expect(screen.getByTestId("mock-rail").getAttribute("data-active")).toBe("modello");
    expect(useShellIntentStore.getState().pendingWorkspace).toBeNull();

    // Esterna mente richiede risultati (come fa la CTA del toast)
    act(() => {
      useShellIntentStore.getState().requestWorkspace("risultati");
    });

    // Shell ha applicato l'intent (activeWs cambiato) E consumato (pending=null)
    expect(screen.getByTestId("mock-rail").getAttribute("data-active")).toBe("risultati");
    expect(useShellIntentStore.getState().pendingWorkspace).toBeNull();
  });

  it("rifinitura 2c: pendingWorkspace con valore sconosciuto NON cambia activeWs (silent + consume)", () => {
    render(<Shell><div /></Shell>);
    act(() => {
      useShellIntentStore.setState({
        pendingWorkspace: "non-esiste" as unknown as ShellWorkspaceIntent,
      });
    });
    expect(screen.getByTestId("mock-rail").getAttribute("data-active")).toBe("modello");
    // Comunque consumato per non lasciare lo store sporco
    expect(useShellIntentStore.getState().pendingWorkspace).toBeNull();
  });
});

describe("Shell · focus mode (redesign/workspace-fasi FETTA 0)", () => {
  beforeEach(() => {
    // Reset Zustand singleton fra i test
    useWorkspaceStore.setState({ isEmptyState: false });
    useShellIntentStore.setState({ pendingWorkspace: null });
    try { window.sessionStorage.removeItem("feapro:shell:active-workspace"); } catch { /* ignore */ }
    // v3.4 Fetta E2-IA Commit E2.2: reset panel destro a "open".
    useRightPanelStore.setState({ panelState: "open" });
    try { window.localStorage.removeItem("feapro-right-panel"); } catch { /* ignore */ }
    // v3.4 Fetta E2-IA Commit E2.4: reset panel SX Albero a "closed".
    useLeftTreeStore.setState({ treeState: "closed" });
    try { window.localStorage.removeItem("feapro-left-tree"); } catch { /* ignore */ }
  });

  it("focus mode: rail/panel/statusbar non renderizzati, topbar+viewport restano, pill exit visibile", () => {
    useWorkspaceStore.setState({ isEmptyState: true });
    render(<Shell><div data-testid="canvas-children">Canvas R3F</div></Shell>);

    // Viewport e canvas restano (Shell custom NON cade più sul legacy)
    expect(screen.getByTestId("mock-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-children")).toBeInTheDocument();
    // Topbar resta (bussola)
    expect(screen.getByTestId("mock-topbar")).toBeInTheDocument();
    // Rail / Panel / StatusBar nascosti
    expect(screen.queryByTestId("mock-rail")).toBeNull();
    expect(screen.queryByTestId("mock-shell-panel")).toBeNull();
    expect(screen.queryByTestId("mock-statusbar")).toBeNull();
    // redesign/workspace-fasi (FETTA 1): anche la spina 3 fasi è
    // nascosta in focus (riga grid collassata via shell-focus-on).
    expect(screen.queryByTestId("mock-phase-stepper")).toBeNull();
    // Pill di uscita visibile + reversibile
    const exit = screen.getByTestId("shell-focus-exit");
    expect(exit).toBeInTheDocument();
    expect(exit.getAttribute("aria-label")).toBe("Esci da focus mode");
  });

  it("shell-focus-on class + data-focus-mode applicati al root quando isFocusMode=true", () => {
    useWorkspaceStore.setState({ isEmptyState: true });
    const { container } = render(<Shell><div /></Shell>);
    const root = container.querySelector(".shell");
    expect(root?.className).toContain("shell-focus-on");
    expect(root?.getAttribute("data-focus-mode")).toBe("true");
  });

  it("click su pill 'Esci focus' chiama exitEmptyState e ripristina chrome completo", () => {
    useWorkspaceStore.setState({ isEmptyState: true });
    render(<Shell><div data-testid="canvas-children" /></Shell>);

    expect(screen.getByTestId("shell-focus-exit")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("shell-focus-exit"));

    // Stato store aggiornato → rerender → rail/panel/statusbar tornano
    expect(useWorkspaceStore.getState().isEmptyState).toBe(false);
    expect(screen.getByTestId("mock-rail")).toBeInTheDocument();
    expect(screen.getByTestId("mock-shell-panel")).toBeInTheDocument();
    expect(screen.getByTestId("mock-statusbar")).toBeInTheDocument();
    // FETTA 1: spina 3 fasi torna visibile insieme al resto del chrome
    expect(screen.getByTestId("mock-phase-stepper")).toBeInTheDocument();
    expect(screen.queryByTestId("shell-focus-exit")).toBeNull();
  });

  it("default (no focus): nessuna classe shell-focus-on, nessun pill exit", () => {
    const { container } = render(<Shell><div /></Shell>);
    const root = container.querySelector(".shell");
    expect(root?.className).not.toContain("shell-focus-on");
    expect(root?.getAttribute("data-focus-mode")).toBeNull();
    expect(screen.queryByTestId("shell-focus-exit")).toBeNull();
  });
});

// v3.4 Fetta E2-IA Commit E2.2: panel destro 2 stati (open / closed).
// Quando "open" ShellPanel renderizzato come prima (zero regression).
// Quando "closed" ShellRightReopenTab prende il posto della terza colonna
// della grid `.shell-mid` (32px via override --panel-w in shell.css).
// Focus mode e takeover restano prioritari (rail+panel+statusbar non
// renderizzati comunque).
describe("Shell · Fetta E2-IA E2.2 panel destro 2 stati", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ isEmptyState: false });
    useShellIntentStore.setState({ pendingWorkspace: null });
    try { window.sessionStorage.removeItem("feapro:shell:active-workspace"); } catch { /* ignore */ }
    useRightPanelStore.setState({ panelState: "open" });
    try { window.localStorage.removeItem("feapro-right-panel"); } catch { /* ignore */ }
  });

  it("default panelState=open → ShellPanel renderizzato, tab NON renderizzata", () => {
    render(<Shell><div /></Shell>);
    expect(screen.getByTestId("mock-shell-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-shell-right-reopen-tab")).toBeNull();
  });

  it("panelState=closed → ShellRightReopenTab visibile, ShellPanel NON renderizzato", () => {
    useRightPanelStore.setState({ panelState: "closed" });
    render(<Shell><div /></Shell>);
    expect(screen.getByTestId("mock-shell-right-reopen-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-shell-panel")).toBeNull();
  });

  it("data-panel-state attribute riflette lo stato corrente sul root .shell", () => {
    const { container } = render(<Shell><div /></Shell>);
    const root = container.querySelector(".shell");
    expect(root?.getAttribute("data-panel-state")).toBe("open");

    act(() => {
      useRightPanelStore.getState().close();
    });
    expect(root?.getAttribute("data-panel-state")).toBe("closed");
  });

  it("focus mode prende precedenza su panelState=closed (niente di entrambi)", () => {
    useWorkspaceStore.setState({ isEmptyState: true });
    useRightPanelStore.setState({ panelState: "closed" });
    render(<Shell><div data-testid="canvas" /></Shell>);
    expect(screen.queryByTestId("mock-shell-panel")).toBeNull();
    expect(screen.queryByTestId("mock-shell-right-reopen-tab")).toBeNull();
    // In focus mode il viewport resta visibile (pieno), tab/panel no.
    expect(screen.getByTestId("mock-viewport")).toBeInTheDocument();
  });

  it("takeover (verifiche) prende precedenza su panelState (niente tab in takeover)", () => {
    useRightPanelStore.setState({ panelState: "closed" });
    render(<Shell><div /></Shell>);
    fireEvent.click(screen.getByTestId("rail-verifiche"));
    // In takeover c'e' solo il takeover-content, niente panel ne' tab
    expect(screen.getByTestId("shell-takeover-content")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-shell-panel")).toBeNull();
    expect(screen.queryByTestId("mock-shell-right-reopen-tab")).toBeNull();
  });

  it("workspace prop e' passato alla ShellRightReopenTab", () => {
    useRightPanelStore.setState({ panelState: "closed" });
    render(<Shell><div /></Shell>);
    fireEvent.click(screen.getByTestId("rail-risultati"));
    const tab = screen.getByTestId("mock-shell-right-reopen-tab");
    expect(tab.getAttribute("data-workspace")).toBe("risultati");
  });
});

// v3.4 Fetta E2-IA Commit E2.4: panel SX "Albero modello" 2 stati
// (open / closed). Default "closed" → grid 3-col come prima (zero
// regression). Quando "open" il ShellLeftTreePanel viene inserito
// fra Rail e Viewport come 2a colonna della grid `.shell-mid`
// (`--left-tree-w` 240px). Focus mode e takeover restano prioritari
// e fanno apparire data-left-tree-state="closed" anche se l'utente
// aveva treeState="open" come preferenza (vedi isLeftTreeVisible
// in Shell.tsx).
describe("Shell · Fetta E2-IA E2.4 panel SX Albero modello", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ isEmptyState: false });
    useShellIntentStore.setState({ pendingWorkspace: null });
    try { window.sessionStorage.removeItem("feapro:shell:active-workspace"); } catch { /* ignore */ }
    useRightPanelStore.setState({ panelState: "open" });
    try { window.localStorage.removeItem("feapro-right-panel"); } catch { /* ignore */ }
    useLeftTreeStore.setState({ treeState: "closed" });
    try { window.localStorage.removeItem("feapro-left-tree"); } catch { /* ignore */ }
  });

  it("default treeState=closed → ShellLeftTreePanel NON renderizzato", () => {
    render(<Shell><div /></Shell>);
    expect(screen.queryByTestId("mock-shell-left-tree-panel")).toBeNull();
  });

  it("treeState=open → ShellLeftTreePanel renderizzato fra Rail e Viewport", () => {
    useLeftTreeStore.setState({ treeState: "open" });
    render(<Shell><div /></Shell>);
    expect(screen.getByTestId("mock-shell-left-tree-panel")).toBeInTheDocument();
    // Coesiste con rail (sempre presente) e viewport
    expect(screen.getByTestId("mock-rail")).toBeInTheDocument();
    expect(screen.getByTestId("mock-viewport")).toBeInTheDocument();
  });

  it("data-left-tree-state riflette stato 'open' quando reso visibile", () => {
    useLeftTreeStore.setState({ treeState: "open" });
    const { container } = render(<Shell><div /></Shell>);
    const root = container.querySelector(".shell");
    expect(root?.getAttribute("data-left-tree-state")).toBe("open");
  });

  it("data-left-tree-state e' 'closed' per default", () => {
    const { container } = render(<Shell><div /></Shell>);
    const root = container.querySelector(".shell");
    expect(root?.getAttribute("data-left-tree-state")).toBe("closed");
  });

  it("focus mode fa apparire data-left-tree-state='closed' anche se store='open'", () => {
    useWorkspaceStore.setState({ isEmptyState: true });
    useLeftTreeStore.setState({ treeState: "open" });
    const { container } = render(<Shell><div /></Shell>);
    const root = container.querySelector(".shell");
    // L'attributo riflette isLeftTreeVisible (NON treeState diretto):
    // in focus la grid resta 1-col e nessun panel SX visibile.
    expect(root?.getAttribute("data-left-tree-state")).toBe("closed");
    expect(screen.queryByTestId("mock-shell-left-tree-panel")).toBeNull();
  });

  it("takeover (verifiche) fa apparire data-left-tree-state='closed' anche se store='open'", () => {
    useLeftTreeStore.setState({ treeState: "open" });
    render(<Shell><div /></Shell>);
    fireEvent.click(screen.getByTestId("rail-verifiche"));
    // In takeover la grid passa a 2-col → niente panel SX
    expect(screen.queryByTestId("mock-shell-left-tree-panel")).toBeNull();
    // E il data-attribute lo segnala
    const root = document.querySelector(".shell");
    expect(root?.getAttribute("data-left-tree-state")).toBe("closed");
  });

  it("toggle ripetuto via store: open → closed riflette nel DOM in real-time", () => {
    const { container } = render(<Shell><div /></Shell>);
    const root = container.querySelector(".shell");
    expect(root?.getAttribute("data-left-tree-state")).toBe("closed");

    act(() => {
      useLeftTreeStore.getState().open();
    });
    expect(root?.getAttribute("data-left-tree-state")).toBe("open");
    expect(screen.getByTestId("mock-shell-left-tree-panel")).toBeInTheDocument();

    act(() => {
      useLeftTreeStore.getState().close();
    });
    expect(root?.getAttribute("data-left-tree-state")).toBe("closed");
    expect(screen.queryByTestId("mock-shell-left-tree-panel")).toBeNull();
  });
});
