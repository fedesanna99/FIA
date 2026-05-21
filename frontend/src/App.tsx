/**
 * App shell v4 — Sprint 4 / Asse G7 (alpha.22) viewport-first.
 *
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │ TopBar (48 px)                                                  │
 *  ├──┬──────────────┬─────────────────────────────────┬────────────┤
 *  │L │              │                                 │ RightRail  │
 *  │e │ LeftSlide-   │       Viewport 3D               │ (48 px)    │
 *  │f │ Panel        │       (Three.js — full-width)   │ + slide-in │
 *  │t │ 360-440px    │                                 │ panel 320px│
 *  │R │ (slide-in)   │   (centro dell'esperienza)      │ overlay    │
 *  │a │              │                                 │            │
 *  │i │              │                                 │            │
 *  │l │              │                                 │            │
 *  ├──┴──────────────┴─────────────────────────────────┴────────────┤
 *  │ StatusBar (24 px)                                               │
 *  └────────────────────────────────────────────────────────────────┘
 *
 *  alpha.22 (viewport-first):
 *   - WorkspacePanel 380px fisso RIMOSSO.
 *   - LeftRail diventa toggle slide-in (mirror del RightRail).
 *   - Make/Solve/Verify aprono il LeftSlidePanel.
 *   - Viewport 3D occupa lo spazio principale tra i due rail.
 *   - Default theme = "light" per esposizione palette warm-neutral.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { TopBar } from "./components/shell/TopBar";
import { LeftRail } from "./components/shell/LeftRail";
import { LeftSlidePanel } from "./components/shell/LeftSlidePanel";
import { RightRail } from "./components/shell/RightRail";
import { RightSlidePanel } from "./components/shell/RightSlidePanel";
import { CommandPalette } from "./components/shell/CommandPalette";
import { HelpSheet } from "./components/shell/HelpSheet";
import { OnboardingTour } from "./components/shell/OnboardingTour";
import { ClimateContextBadge } from "./components/shell/ClimateContextBadge";
import { StatusBar } from "./components/layout/StatusBar";
import { Toaster } from "./components/layout/Toaster";
import { Viewport3D } from "./components/viewport/Viewport3D";
import { DropZone } from "./components/viewport/DropZone";
import { Dashboard } from "./components/shell/Dashboard";
import { HelpDialog } from "./components/dialogs/HelpDialog";
import { NodeDialog } from "./components/dialogs/NodeDialog";
import { ElementDialog } from "./components/dialogs/ElementDialog";
import { LoadDialog } from "./components/dialogs/LoadDialog";
import { ConstraintDialog } from "./components/dialogs/ConstraintDialog";
import { MeshWizardDialog } from "./components/dialogs/MeshWizardDialog";
import { ImportWizard } from "./components/dialogs/wizards/ImportWizard";
import { MobileTabbar } from "./components/shell/MobileTabbar";
import { MobilePanel } from "./components/shell/MobilePanel";
import { MobileMoreMenu } from "./components/shell/MobileMoreMenu";
import { MakePanel } from "./shell/panels/MakePanel";
import { SolvePanel } from "./shell/panels/SolvePanel";
import { VerifyPanel } from "./shell/panels/VerifyPanel";
import { InspectPanel } from "./shell/panels/InspectPanel";
import { ToolsPanel } from "./shell/panels/ToolsPanel";
import { useModelList, useLoadModel } from "./hooks/useModel";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useIsMobile } from "./hooks/useIsMobile";
import { useUIStore } from "./store/uiStore";
import { useWorkspaceStore } from "./store/workspaceStore";
import { useLeftRailStore } from "./store/leftRailStore";
import { useThemeStore } from "./store/themeStore";

/**
 * Helper riusabile: entra in focus mode chiudendo tutti i pannelli + toast hint.
 * v1.5 Task 33: estratto dal handler keyboard per essere chiamato anche dal
 * case "focus-toggle" della CommandPalette (vedi CommandPalette.tsx).
 */
function enterFocusMode() {
  const ws = useWorkspaceStore.getState();
  useLeftRailStore.getState().close();
  ws.enterEmptyState();
  void import("./store/rightRailStore").then((m) =>
    m.useRightRailStore.getState().close(),
  );
  void import("./store/toastStore").then(({ toast }) => {
    toast("info", "Modalità focus — premi F o Esc per tornare", 3000);
  });
}


export default function App() {
  const { data: models } = useModelList();
  const [activeId, setActiveId] = useState<string | null>(null);
  // v1.5 Task 29: stato wizard import (listener su 2 eventi globali
  // dispatchati da Dashboard/palette per aprire il wizard 4-step).
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importWizardSource, setImportWizardSource] = useState<
    "dxf" | "ifc" | "json" | "template" | undefined
  >(undefined);
  useLoadModel(activeId);
  const setDialog = useUIStore((s) => s.setOpenDialog);
  const openDialog = useUIStore((s) => s.openDialog);
  const editNodeId = useUIStore((s) => s.editNodeId);
  const editElementId = useUIStore((s) => s.editElementId);
  const editLoadId = useUIStore((s) => s.editLoadId);
  const editConstraintId = useUIStore((s) => s.editConstraintId);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  // alpha.31 Task 23: focus mode (= empty state) nasconde TopBar +
  // StatusBar + LeftRail + RightRail. Resta solo viewport + un piccolo
  // X in alto a destra per uscire.
  const isFocusMode = useWorkspaceStore((s) => s.isEmptyState);
  const exitFocus = useWorkspaceStore((s) => s.exitEmptyState);
  // v1.5 Task 30: mobile responsive split (< 768).
  const isMobile = useIsMobile();
  const currentMobileTab = useWorkspaceStore((s) => s.currentMobileTab);
  const setMobileTab = useWorkspaceStore((s) => s.setMobileTab);
  // v1.5 Task 30: stato per il "more" sub-target su mobile (verify/tools)
  const [mobileMoreSub, setMobileMoreSub] = useState<"verify" | "tools" | null>(null);

  useKeyboardShortcuts((kind) => setDialog(kind));

  // Inizializza tema (dark/light/system) — applica data-theme e listener system
  useEffect(() => {
    return useThemeStore.getState().init();
  }, []);

  // v1.5 Task 30: listener per drill-in di MobileMoreMenu (verify/tools)
  useEffect(() => {
    const openVerify = () => setMobileMoreSub("verify");
    const openTools = () => setMobileMoreSub("tools");
    window.addEventListener("feapro:mobile-open-verify", openVerify);
    window.addEventListener("feapro:mobile-open-tools", openTools);
    return () => {
      window.removeEventListener("feapro:mobile-open-verify", openVerify);
      window.removeEventListener("feapro:mobile-open-tools", openTools);
    };
  }, []);

  // v1.5 Task 30: quando l'utente passa da mobile a desktop (resize), ripulisce
  // lo stato mobile-only per evitare ghost panel.
  useEffect(() => {
    if (!isMobile) {
      if (currentMobileTab !== null) setMobileTab(null);
      if (mobileMoreSub !== null) setMobileMoreSub(null);
    }
  }, [isMobile, currentMobileTab, mobileMoreSub, setMobileTab]);

  // v1.5 Task 29: listener globali per ImportWizard (apertura + post-import).
  useEffect(() => {
    const openImport = (e: Event) => {
      const detail = (e as CustomEvent).detail as { source?: string } | undefined;
      const src = detail?.source;
      if (src === "dxf" || src === "ifc" || src === "json" || src === "template") {
        setImportWizardSource(src);
      } else {
        setImportWizardSource(undefined);
      }
      setImportWizardOpen(true);
    };
    const onImported = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string } | undefined;
      if (detail?.id) setActiveId(detail.id);
    };
    window.addEventListener("feapro:open-import-wizard", openImport);
    window.addEventListener("feapro:model-imported", onImported);
    return () => {
      window.removeEventListener("feapro:open-import-wizard", openImport);
      window.removeEventListener("feapro:model-imported", onImported);
    };
  }, []);

  // Numeri 1-5 + Shift+Space (alpha.27 empty state) + (alpha.22 toggle).
  // v1.5 Task 33: gerarchia di priorita' chiara, F dedicato a focus mode + ESC exit.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;

      // === PRIORITA' 1: in focus mode, ESC e F escono ==========================
      if (useWorkspaceStore.getState().isEmptyState) {
        const isF = e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
        const isEsc = e.key === "Escape";
        if (isF || isEsc) {
          e.preventDefault();
          useWorkspaceStore.getState().exitEmptyState();
          return;
        }
        // In focus mode blocca tutti gli altri shortcut tranne Cmd/Ctrl+K (palette).
        if (!(e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) return;
      }

      // === PRIORITA' 2: tasto F singolo → entra in focus mode =================
      if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        enterFocusMode();
        return;
      }

      // === PRIORITA' 3: Shift+Space toggle focus mode (esistente) =============
      if (e.shiftKey && e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const ws = useWorkspaceStore.getState();
        if (ws.isEmptyState) ws.exitEmptyState();
        else enterFocusMode();
        return;
      }

      // === PRIORITA' 4: Escape chiude pannelli (esistente) ====================
      if (e.key === "Escape" && !useUIStore.getState().openDialog) {
        const ws = useWorkspaceStore.getState();
        const hasOpen =
          ws.currentLeftPanel !== null ||
          ws.currentRightPanel !== null ||
          useLeftRailStore.getState().openSection !== null;
        if (hasOpen) {
          e.preventDefault();
          ws.closeLeftPanel();
          ws.closeRightPanel();
          useLeftRailStore.getState().close();
          void import("./store/rightRailStore").then((m) =>
            m.useRightRailStore.getState().close(),
          );
          return;
        }
      }

      // === PRIORITA' 5: Ctrl+N / Cmd+N → apre il dialog Nuovo modello =========
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        window.dispatchEvent(new Event("feapro:open-new-model"));
        return;
      }

      // === PRIORITA' 6: numeri 1-5 → navigazione workspace ====================
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const map: Record<string, "model" | "analysis" | "results" | "verify" | "io"> = {
        "1": "model", "2": "analysis", "3": "verify", "4": "results", "5": "io",
      };
      const ws = map[e.key];
      if (ws) {
        e.preventDefault();
        setWorkspace(ws);
        useLeftRailStore.getState().open(ws);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setWorkspace]);

  // alpha.30: rimosso l'auto-select del primo modello al boot. Ora il
  // default e' la Dashboard mockup-aligned, l'utente sceglie esplicitamente
  // da Modelli recenti (Dashboard) o dal model picker in topbar. Cosi'
  // selezionando "— scegli modello —" si torna alla Dashboard.

  // alpha.31 Task 21: quando si entra nella dashboard (no modello attivo),
  // chiudi automaticamente tutti i pannelli laterali rimasti aperti dal
  // modello precedente. La dashboard appare cosi' pulita.
  useEffect(() => {
    if (!activeId) {
      useLeftRailStore.getState().close();
      useWorkspaceStore.getState().closeLeftPanel();
      useWorkspaceStore.getState().closeRightPanel();
      void import("./store/rightRailStore").then((m) =>
        m.useRightRailStore.getState().close(),
      );
    }
  }, [activeId]);

  // v1.5 Task 30: i rails laterali sono nascosti su mobile (< 768).
  const showRails = !isFocusMode && !isMobile;

  // Mappatura mobile tab → titolo + componente
  const mobilePanelInfo: Record<
    "make" | "solve" | "results" | "more",
    { title: string; content: React.ReactNode }
  > = {
    make:    { title: "Make",      content: <MakePanel /> },
    solve:   { title: "Solve",     content: <SolvePanel /> },
    results: { title: "Risultati", content: <InspectPanel /> },
    more: {
      title: mobileMoreSub === "verify" ? "Verifiche" : mobileMoreSub === "tools" ? "Strumenti" : "Altro",
      content:
        mobileMoreSub === "verify" ? <VerifyPanel /> :
        mobileMoreSub === "tools" ? <ToolsPanel /> :
        <MobileMoreMenu />,
    },
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-bg text-ink overflow-hidden font-sans">
      {!isFocusMode && (
        <TopBar models={models ?? []} activeId={activeId} onSelect={setActiveId} />
      )}
      <div className="flex flex-1 min-h-0 relative">
        {showRails && <LeftRail />}
        {/* LeftSlidePanel ankorato a sinistra (toggle via leftRailStore).
            In focus mode il rail e' nascosto + il panel e' chiuso. */}
        {showRails && <LeftSlidePanel />}
        <main className="flex-1 relative min-w-0 bg-bg-viewport">
          {/* alpha.30: Dashboard mockup-aligned quando nessun modello e' attivo.
              Quando l'utente seleziona/crea un modello, passa al Viewport3D. */}
          {activeId ? (
            <>
              <Viewport3D />
              <DropZone onImported={(id) => setActiveId(id)} />
            </>
          ) : (
            <>
              <Dashboard models={models ?? []} onSelect={setActiveId} />
              <DropZone onImported={(id) => setActiveId(id)} />
            </>
          )}
          {/* Exit focus mode button — visibile solo in focus mode */}
          {isFocusMode && (
            <button
              type="button"
              onClick={exitFocus}
              className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-bg-panel/80 backdrop-blur border border-border text-ink-muted hover:text-ink flex items-center justify-center shadow-pop"
              title="Esci da focus mode (Shift+Space)"
              aria-label="Esci da focus mode"
              data-testid="exit-focus"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* v1.5 Task 30: pannello mobile full-screen sopra il viewport */}
          {isMobile && !isFocusMode && currentMobileTab && currentMobileTab !== "model" && (
            <MobilePanel
              title={mobilePanelInfo[currentMobileTab].title}
              onBack={() => {
                if (currentMobileTab === "more" && mobileMoreSub) {
                  setMobileMoreSub(null);
                } else {
                  setMobileTab(null);
                  setMobileMoreSub(null);
                }
              }}
            >
              {mobilePanelInfo[currentMobileTab].content}
            </MobilePanel>
          )}
        </main>
        {showRails && (
          <div className="relative flex flex-shrink-0">
            <RightSlidePanel />
            <RightRail />
          </div>
        )}
      </div>
      {isMobile && !isFocusMode && <MobileTabbar />}
      {!isMobile && !isFocusMode && <StatusBar />}
      <Toaster />
      <CommandPalette />
      <HelpSheet />
      <OnboardingTour />
      <ClimateContextBadge />
      <HelpDialog open={openDialog === "help"} onClose={() => setDialog(null)} />
      {/* Dialog globali entity-CRUD (alpha.31 hotfix): prima erano in EditorBar
          dentro WorkspacePanel/Sidebar — rimossi dal viewport-first refactor.
          Senza questi mount, le shortcut N/E/L/C/M e i bottoni "Aggiungi …"
          dentro MakePanel scrivevano in uiStore.openDialog ma nulla rispondeva. */}
      <NodeDialog
        open={openDialog === "node"}
        onClose={() => setDialog(null)}
        editNodeId={editNodeId}
      />
      <ElementDialog
        open={openDialog === "element"}
        onClose={() => setDialog(null)}
        editElementId={editElementId}
      />
      <LoadDialog
        open={openDialog === "load"}
        onClose={() => setDialog(null)}
        editLoadId={editLoadId}
      />
      <ConstraintDialog
        open={openDialog === "constraint"}
        onClose={() => setDialog(null)}
        editConstraintId={editConstraintId}
      />
      <MeshWizardDialog
        open={openDialog === "mesh"}
        onClose={() => setDialog(null)}
      />
      {/* v1.5 Task 29: ImportWizard 4-step (Fonte → File → Anteprima → Conferma).
          Aperto da Dashboard "Importa file" + voci palette + custom event. */}
      <ImportWizard
        open={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        initialSource={importWizardSource}
      />
    </div>
  );
}
