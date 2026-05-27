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
import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { X } from "lucide-react";
import { cn } from "./components/ui/cn";
import { TopBar } from "./components/shell/TopBar";
import { MissionBar } from "./components/shell/MissionBar";
import { ModelInfoCard } from "./components/shell/ModelInfoCard";
import { AnalysisSummaryCard } from "./components/shell/AnalysisSummaryCard";
import { ResultsOverviewCard } from "./components/shell/ResultsOverviewCard";
import { ResultsInsightAuto } from "./components/shell/ResultsInsightAuto";
// v2.2.2 audit-fix P3: lazy-load dei full-screen overlay raramente aperti.
const PercorsoFullScreenDemo = lazy(() =>
  import("./components/shell/PercorsoFullScreenDemo").then((m) => ({ default: m.PercorsoFullScreenDemo })),
);
const ModelliBrowser = lazy(() =>
  import("./components/shell/ModelliBrowser").then((m) => ({ default: m.ModelliBrowser })),
);
import { ViewportCanvasTabs } from "./components/shell/ViewportCanvasTabs";
import { LeftRail } from "./components/shell/LeftRail";
import { LeftSlidePanel } from "./components/shell/LeftSlidePanel";
import { RightRail } from "./components/shell/RightRail";
import { RightSlidePanel } from "./components/shell/RightSlidePanel";
import { CommandPalette } from "./components/shell/CommandPalette";
import { HelpSheet } from "./components/shell/HelpSheet";
// v2.6.4 A.2: legacy OnboardingTour welcome-modal sostituito dal nuovo
// spotlight tour in `components/onboarding/OnboardingTour.tsx` (import sotto).
// Il file legacy resta nel codebase come carry-over per eventuale ripristino,
// ma NON è più montato.
// import { OnboardingTour as LegacyOnboardingTour } from "./components/shell/OnboardingTour";
import { ClimateContextBadge } from "./components/shell/ClimateContextBadge";
import { StatusBar } from "./components/layout/StatusBar";
// Toaster mounted at root in main.tsx (così resta visibile durante AuthScreen).
import { Viewport3D } from "./components/viewport/Viewport3D";
import { DropZone } from "./components/viewport/DropZone";
import { LoadingScreen, type SolverPhase } from "./components/shell/LoadingScreen";
// v2.7.1 Phase 4.2 mockup-driven: la home dashboard ora usa la
// implementazione mockup-driven secondo `ui_kits/webapp_desktop/
// Dashboard new.html` del pack handoff. Il legacy `components/shell/
// Dashboard.tsx` resta in repo come backup (può essere rimosso in
// v2.7.1.x se non più referenziato).
import { DashboardPage as Dashboard } from "./dashboard/DashboardPage";
// v2.6.4 A.2: OnboardingTour autoplay primo login + spotlight clip-path tour
import { OnboardingTour } from "./components/onboarding/OnboardingTour";
import { HelpDialog } from "./components/dialogs/HelpDialog";
import { NodeDialog } from "./components/dialogs/NodeDialog";
import { ElementDialog } from "./components/dialogs/ElementDialog";
import { LoadDialog } from "./components/dialogs/LoadDialog";
import { ConstraintDialog } from "./components/dialogs/ConstraintDialog";
import { MeshWizardDialog } from "./components/dialogs/MeshWizardDialog";
// v2.2.2 audit-fix P3: lazy-load dei 5 wizard/dialog pesanti (~80-120 KB
// minified). Si caricano solo quando l'utente li apre (open=true). I
// `<Suspense fallback={null}>` sotto evitano fallback visivi: i dialog
// hanno già la loro animazione di mount via animate-fade-in + slide-up.
const ImportWizard = lazy(() =>
  import("./components/dialogs/wizards/ImportWizard").then((m) => ({ default: m.ImportWizard })),
);
const SismicaTHWizard = lazy(() =>
  import("./components/dialogs/wizards/SismicaTHWizard").then((m) => ({ default: m.SismicaTHWizard })),
);
const TemplateGalleryDialog = lazy(() =>
  import("./components/dialogs/TemplateGalleryDialog").then((m) => ({ default: m.TemplateGalleryDialog })),
);
const PercorsiBeamWizard = lazy(() =>
  import("./components/dialogs/PercorsiBeamWizard").then((m) => ({ default: m.PercorsiBeamWizard })),
);
const ReportExportDialog = lazy(() =>
  import("./components/dialogs/ReportExportDialog").then((m) => ({ default: m.ReportExportDialog })),
);
// v2.2.4 feature: PushoverWizard + NonlinearWizard veri 3-step (sostituiscono
// le scorciatoie open-panel di v2.2.0 B8).
const PushoverWizard = lazy(() =>
  import("./components/dialogs/wizards/PushoverWizard").then((m) => ({ default: m.PushoverWizard })),
);
const NonlinearWizard = lazy(() =>
  import("./components/dialogs/wizards/NonlinearWizard").then((m) => ({ default: m.NonlinearWizard })),
);
import { MobileTabbar } from "./components/shell/MobileTabbar";
import { MobilePanel } from "./components/shell/MobilePanel";
import { MobileMoreMenu } from "./components/shell/MobileMoreMenu";
import { MakePanel } from "./shell/panels/MakePanel";
import { SolvePanel } from "./shell/panels/SolvePanel";
import { VerifyPanel } from "./shell/panels/VerifyPanel";
import { InspectPanel } from "./shell/panels/InspectPanel";
import { ToolsPanel } from "./shell/panels/ToolsPanel";
import { ViewPanel } from "./shell/panels/ViewPanel";
// v2.6.2: nuova Shell (Studio Pro Soft v2.1) — usata quando model attivo
// + desktop + !focus. Negli altri casi resta il chrome legacy.
import { Shell } from "./shell/Shell";
import { useTheme } from "./shared/useTheme";
import { useModelList, useLoadModel } from "./hooks/useModel";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useIsMobile } from "./hooks/useIsMobile";
import { useUIStore } from "./store/uiStore";
import { useWorkspaceStore } from "./store/workspaceStore";
import { useLeftRailStore } from "./store/leftRailStore";
import { useRightRailStore } from "./store/rightRailStore";
import { useThemeStore } from "./store/themeStore";
import { toast } from "./store/toastStore";
import { useWizardStore } from "./store/wizardStore";
import { useAnalysisStore } from "./store/analysisStore";
import { useModelStore } from "./store/modelStore";
import { useJobsStore } from "./store/jobsStore";

/**
 * Helper riusabile: entra in focus mode chiudendo tutti i pannelli + toast hint.
 * v1.5 Task 33: estratto dal handler keyboard per essere chiamato anche dal
 * case "focus-toggle" della CommandPalette (vedi CommandPalette.tsx).
 */
function enterFocusMode() {
  const ws = useWorkspaceStore.getState();
  useLeftRailStore.getState().close();
  ws.enterEmptyState();
  useRightRailStore.getState().close();
  toast("info", "Modalità focus — premi F o Esc per tornare", 3000);
}

function pwaSafeAreaEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem("feapro-pwa-safe-area") !== "off";
}

/**
 * Precision v2.0 PR11: deriva la SolverPhase corrente dal progress numerico.
 * Mappa onesta basata su tempistica empirica dei nostri solver:
 *   0..15%  → validation (controllo modello, fast)
 *   15..30% → discretization (mesh, fast)
 *   30..50% → assembly K (medium)
 *   50..82% → factorization (slow, dominante)
 *   82..95% → solve (fast)
 *   95..100% → postprocess (stress recovery)
 *
 * Sostituibile in futuro quando il backend emetterà `phase` esplicita via
 * WebSocket `/ws/jobs/{id}` (oggi emette solo `progress` + `message`).
 */
function phaseFromProgress(progress: number, isRunning: boolean): SolverPhase | null {
  if (!isRunning) return null;
  if (progress < 0.15) return "validation";
  if (progress < 0.30) return "discretization";
  if (progress < 0.50) return "assembly";
  if (progress < 0.82) return "factorization";
  if (progress < 0.95) return "solve";
  return "postprocess";
}

export default function App() {
  // v2.6.2 T8: wire useTheme hook all'inizio dell'App — setta data-theme
  // su <html> + sync con localStorage. UI toggle aggiunto in Fase 3+.
  useTheme();

  const modelsQuery = useModelList();
  const models = modelsQuery.data;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [usePwaSafeArea, setUsePwaSafeArea] = useState(pwaSafeAreaEnabled);
  // v1.5 Task 29: stato wizard import (listener su 2 eventi globali
  // dispatchati da Dashboard/palette per aprire il wizard 4-step).
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importWizardSource, setImportWizardSource] = useState<
    "dxf" | "ifc" | "json" | "template" | undefined
  >(undefined);
  // v1.6 S0 B01: TemplateGalleryDialog state (aperto da Dashboard / palette).
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  // v1.8 T2: placeholder Percorsi (apre da CTA Home, palette, futuro).
  const [percorsiPlaceholderOpen, setPercorsiPlaceholderOpen] = useState(false);
  // v1.9.0 T4: modal export PDF (apre da bottone ResultsOverviewCard).
  const [reportExportOpen, setReportExportOpen] = useState(false);
  // v2.2.4 feature: pushover/nonlinear wizard veri 3-step.
  const [pushoverWizardOpen, setPushoverWizardOpen] = useState(false);
  const [nonlinearWizardOpen, setNonlinearWizardOpen] = useState(false);
  useLoadModel(activeId);
  // v1.5 Task 34 follow-up: leggo wizardStore.active per renderizzare il
  // SismicaTHWizard singleton al root.
  const wizardActive = useWizardStore((s) => s.active);
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
  // v1.5 Task 30: stato per il "more" sub-target su mobile.
  const [mobileMoreSub, setMobileMoreSub] = useState<"verify" | "tools" | "view" | null>(null);

  useKeyboardShortcuts((kind) => setDialog(kind));

  const openViewPanel = useCallback(() => {
    window.dispatchEvent(new Event("feapro:close-onboarding"));
    useWorkspaceStore.getState().exitEmptyState();
    if (isMobile) {
      useWorkspaceStore.getState().setMobileTab("more");
      setMobileMoreSub("view");
      return;
    }
    useRightRailStore.getState().open("view");
  }, [isMobile]);

  // Inizializza tema (dark/light/system) — applica data-theme e listener system
  useEffect(() => {
    return useThemeStore.getState().init();
  }, []);

  useEffect(() => {
    const syncPwaShell = () => setUsePwaSafeArea(pwaSafeAreaEnabled());
    window.addEventListener("storage", syncPwaShell);
    window.addEventListener("feapro:pwa-safe-area-changed", syncPwaShell);
    return () => {
      window.removeEventListener("storage", syncPwaShell);
      window.removeEventListener("feapro:pwa-safe-area-changed", syncPwaShell);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpenView =
      params.get("openView") === "1" ||
      params.get("panel") === "view" ||
      params.get("view") === "fresh";
    if (!shouldOpenView) return;
    openViewPanel();
  }, [openViewPanel]);

  useEffect(() => {
    window.addEventListener("feapro:open-view-panel", openViewPanel);
    return () => window.removeEventListener("feapro:open-view-panel", openViewPanel);
  }, [openViewPanel]);

  // v1.5 Task 30: listener per drill-in di MobileMoreMenu.
  useEffect(() => {
    const openVerify = () => setMobileMoreSub("verify");
    const openTools = () => setMobileMoreSub("tools");
    const openView = () => setMobileMoreSub("view");
    window.addEventListener("feapro:mobile-open-verify", openVerify);
    window.addEventListener("feapro:mobile-open-tools", openTools);
    window.addEventListener("feapro:mobile-open-view", openView);
    return () => {
      window.removeEventListener("feapro:mobile-open-verify", openVerify);
      window.removeEventListener("feapro:mobile-open-tools", openTools);
      window.removeEventListener("feapro:mobile-open-view", openView);
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
    // v1.6 S0 B01: listener globale per la TemplateGalleryDialog.
    const openTemplate = () => setTemplateGalleryOpen(true);
    window.addEventListener("feapro:open-template-gallery", openTemplate);
    // v1.8 T2: CTA "Percorsi" apre PercorsiPlaceholderDialog
    // (3 claim del prodotto + escape hatch a Studio Pro).
    const openPercorsi = () => setPercorsiPlaceholderOpen(true);
    window.addEventListener("feapro:open-percorsi", openPercorsi);
    // v1.9.0 T4: listener per bottone "Genera report PDF" in ResultsOverviewCard.
    const openExportPdf = () => setReportExportOpen(true);
    window.addEventListener("feapro:open-export-pdf", openExportPdf);
    return () => {
      window.removeEventListener("feapro:open-import-wizard", openImport);
      window.removeEventListener("feapro:model-imported", onImported);
      window.removeEventListener("feapro:open-template-gallery", openTemplate);
      window.removeEventListener("feapro:open-percorsi", openPercorsi);
      window.removeEventListener("feapro:open-export-pdf", openExportPdf);
    };
  }, []);

  // v1.5 Task 34 follow-up: dispatcher wizardStore.
  // Quando la palette / shortcut chiama wizardStore.open(kind, payload),
  // questo effect instrada verso il meccanismo concreto di ogni wizard.
  //
  // Per "sismica-th" il wizard e' renderato direttamente sotto leggendo
  // wizardStore.active: niente side-effect, niente close() — sara' l'onClose
  // del wizard a chiamare wizardStore.close().
  //
  // Per gli altri kind con meccanismo proprio (dialog modale uiStore,
  // ImportWizard custom event) il dispatcher fa il side-effect e chiude
  // subito lo store (trigger one-shot).
  useEffect(() => {
    const unsub = useWizardStore.subscribe((state, prev) => {
      if (state.active === prev.active) return;
      if (state.active === null) return;
      const kind = state.active;
      const payload = state.payload;
      let oneShot = true;
      switch (kind) {
        case "new-model":
          setDialog("new");
          break;
        case "mesh":
          setDialog("mesh");
          break;
        case "import": {
          const src = (payload as { source?: string }).source;
          window.dispatchEvent(
            new CustomEvent("feapro:open-import-wizard", {
              detail: src ? { source: src } : undefined,
            }),
          );
          break;
        }
        case "sismica-th":
          // Wizard mounted at root reads wizardStore.active — niente close.
          oneShot = false;
          break;
        // v2.2.4 feature: veri wizard 3-step (sostituiscono gli shortcut
        // open-panel di v2.2.0 B8).
        case "pushover":
          setPushoverWizardOpen(true);
          oneShot = false;
          break;
        case "nonlinear":
          setNonlinearWizardOpen(true);
          oneShot = false;
          break;
        case "report":
          // ReportExportDialog è già montato in App: dispatcher event globale.
          window.dispatchEvent(new Event("feapro:open-export-pdf"));
          break;
      }
      if (oneShot) useWizardStore.getState().close();
    });
    return unsub;
  }, [setDialog]);

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
          useRightRailStore.getState().close();
          return;
        }
      }

      // === PRIORITA' 5: Ctrl+N / Cmd+N → apre il dialog Nuovo modello =========
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        window.dispatchEvent(new Event("feapro:open-new-model"));
        return;
      }

      // === PRIORITA' 5b: Ctrl+Z / Cmd+Z → Undo (v2.3.0) =======================
      // Ctrl+Shift+Z = Redo, Ctrl+Y = Redo (Windows convention).
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          useModelStore.getState().redo();
        } else {
          useModelStore.getState().undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useModelStore.getState().redo();
        return;
      }

      // === PRIORITA' 6: numeri 1-3 → navigazione workspace ====================
      // v1.5.2 Task 35: "results" (4) e "io" (5) rimossi col legacy. I
      // risultati vivono nel rail destro Inspect (accessibile via palette).
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const map: Record<string, "model" | "analysis" | "verify"> = {
        "1": "model", "2": "analysis", "3": "verify",
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
      const rightRail = useRightRailStore.getState();
      if (rightRail.openSection !== "view") rightRail.close();
    }
  }, [activeId]);

  // v1.5 Task 30: i rails laterali sono nascosti su mobile (< 768).
  const showRails = !isFocusMode && !isMobile;

  // v2.6.2 T9: usa la nuova Shell quando l'utente ha un modello attivo,
  // è su desktop, e non è in focus mode. Negli altri casi (Dashboard
  // home, mobile, focus mode) resta il chrome legacy.
  const useNewShell = activeId !== null && !isMobile && !isFocusMode;

  // v2.7.1.1 (Phase 4.2): la home dashboard mockup-driven (Dashboard new.html)
  // è una pagina FULL-SCREEN che sostituisce sia Shell custom sia chrome
  // legacy. Quando l'utente non ha un modello attivo, è su desktop e non è
  // in focus mode, montiamo solo <Dashboard /> (DashboardPage mockup-driven)
  // senza TopBar/LeftRail/StatusBar legacy attorno. Mobile + focus mode
  // mantengono il chrome legacy come prima.
  const useDashboardFullScreen = !activeId && !isMobile && !isFocusMode;

  // Mappatura mobile tab → titolo + componente
  const mobilePanelInfo: Record<
    "make" | "solve" | "results" | "more",
    { title: string; content: React.ReactNode }
  > = {
    make:    { title: "Make",      content: <MakePanel /> },
    solve:   { title: "Solve",     content: <SolvePanel /> },
    results: { title: "Risultati", content: <InspectPanel /> },
    more: {
      title:
        mobileMoreSub === "verify" ? "Verifiche" :
        mobileMoreSub === "tools" ? "Strumenti" :
        mobileMoreSub === "view" ? "View" :
        "Altro",
      content:
        mobileMoreSub === "verify" ? <VerifyPanel /> :
        mobileMoreSub === "tools" ? <ToolsPanel /> :
        mobileMoreSub === "view" ? <ViewPanel /> :
        <MobileMoreMenu />,
    },
  };

  return (
    <div
      className={cn(
        usePwaSafeArea ? "app-shell" : "app-shell-legacy",
        // v2.8.0.3 fix scroll segnalato da Federico: rimosso
        // `overflow-hidden` Tailwind dal div root SPA. Lo Studio shell
        // legacy `.shell` / nuovo `.studio` si auto-locka via
        // `body:has(.shell.shell-soft)` in index.css. Tutte le altre
        // pagine (Auth, Dashboard, Templates, Percorso, Showcase) ora
        // scrollano correttamente.
        "flex flex-col bg-bg text-ink font-sans",
      )}
    >
      {/* v1.8.4 T4: skip link a11y. Nascosto fuori dal flusso visivo
          finche' non riceve focus (es. Tab dalla URL bar). Porta lo
          screen reader user direttamente al <main> saltando topbar e
          rail navigation. WCAG 2.1 Success Criterion 2.4.1. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:text-white focus:px-3 focus:py-1.5 focus:rounded-md focus:text-sm focus:font-medium focus:shadow-elev focus:outline-none focus:ring-2 focus:ring-accent/60"
        data-testid="skip-to-content"
      >
        Vai al contenuto
      </a>
      {/* v2.6.2 T9: nuova Shell quando model attivo + desktop. Per gli altri
          casi (no model = Dashboard, mobile, focus mode) si usa il chrome
          legacy con TopBar/MissionBar/LeftRail/StatusBar. */}
      {useNewShell ? (
        <Shell>
          {/* v2.6.2.1 F1: ViewportCanvasTabs legacy rimosso (i 5 tab
              "Modello/Carichi/Mesh/Risultati/Checks" sono ora nella
              ShellPanel come Radix Tabs). Viewport3D in modalità
              suppressHud per evitare i chip ViewportHud legacy. */}
          <div className="absolute inset-0">
            <Viewport3D suppressHud />
          </div>
          <DropZone onImported={(id) => setActiveId(id)} />
          <SolverOverlay />
        </Shell>
      ) : useDashboardFullScreen ? (
        /* v2.7.1.1 Phase 4.2: home dashboard mockup-driven full-screen.
           DashboardPage ha già il proprio TopBar + footer dal mockup
           Dashboard new.html. NO chrome legacy attorno (no LeftRail,
           no TopBar legacy, no StatusBar, no MissionBar). */
        <main id="main-content" tabIndex={-1} className="flex-1 relative min-w-0 overflow-y-auto bg-bg">
          <Dashboard
            models={models ?? []}
            modelsUnavailable={modelsQuery.isError}
            modelsRefreshing={modelsQuery.isFetching}
            onRetryModels={() => void modelsQuery.refetch()}
            onSelect={setActiveId}
          />
          <DropZone onImported={(id) => setActiveId(id)} />
          <CommandPalette />
        </main>
      ) : (
        <>
      {!isFocusMode && (
        <TopBar models={models ?? []} activeId={activeId} onSelect={setActiveId} />
      )}
      {/* v1.8 T3: MissionBar (stato modello + prossimo passo).
          Si nasconde da sola se model = null (Home gestisce empty). */}
      {!isFocusMode && <MissionBar />}
      <div className="flex flex-1 min-h-0 relative">
        {showRails && <LeftRail />}
        {/* LeftSlidePanel ankorato a sinistra (toggle via leftRailStore).
            In focus mode il rail e' nascosto + il panel e' chiuso. */}
        {showRails && <LeftSlidePanel />}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "flex-1 relative min-w-0 bg-bg-viewport",
            // v1.5.2 Task 36: compensa la MobileTabbar `position: fixed`
            // (h ~56px + safe-area-bottom) cosi' il contenuto non scorre
            // sotto la tabbar su mobile.
            isMobile && !isFocusMode && "pb-14",
          )}
        >
          {/* alpha.30: Dashboard mockup-aligned quando nessun modello e' attivo.
              Quando l'utente seleziona/crea un modello, passa al Viewport3D. */}
          {activeId ? (
            <>
              {/* v2.0 Precision PR16 T3: B1 canvas tabs sopra viewport
                  (Modello / Carichi & BCs / Mesh / Risultati / Checks) */}
              <div className="absolute top-0 left-0 right-0 z-10">
                <ViewportCanvasTabs
                  nodes={(models ?? []).find((m) => m.id === activeId)?.nodes?.length}
                  elements={(models ?? []).find((m) => m.id === activeId)?.elements?.length}
                />
              </div>
              <div className="absolute inset-0 pt-[36px]">
                <Viewport3D />
              </div>
              <DropZone onImported={(id) => setActiveId(id)} />
              {/* v2.0 Precision PR11: overlay LoadingScreen ricco durante
                  analisi. Phase derivata da progress (vedi phaseFromProgress
                  sopra) fino a quando il backend non emetterà phase via WS. */}
              <SolverOverlay />
            </>
          ) : (
            <>
              <Dashboard
                models={models ?? []}
                modelsUnavailable={modelsQuery.isError}
                modelsRefreshing={modelsQuery.isFetching}
                onRetryModels={() => void modelsQuery.refetch()}
                onSelect={setActiveId}
              />
              <DropZone onImported={(id) => setActiveId(id)} />
            </>
          )}
          {/* Exit focus mode button — visibile solo in focus mode */}
          {isFocusMode && (
            <button
              type="button"
              onClick={exitFocus}
              className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-bg-panel/80 backdrop-blur border border-border text-ink-3 hover:text-ink flex items-center justify-center shadow-pop"
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
            {/* v1.8 T4: sidebar destra always-on (desktop md+).
                Preview pattern mockup 08 "Studio Pro sidebar densa".
                Visibile solo quando c'e' un modello attivo. */}
            {models && activeId && (
              <aside
                className="hidden md:flex md:w-56 lg:w-64 border-l border-border flex-col bg-bg-panel overflow-y-auto"
                data-testid="right-info-sidebar"
              >
                <ModelInfoCard />
                <AnalysisSummaryCard />
                <ResultsOverviewCard />
                <ResultsInsightAuto />
              </aside>
            )}
            <RightSlidePanel />
            <RightRail />
          </div>
        )}
      </div>
      {isMobile && !isFocusMode && <MobileTabbar />}
      {!isMobile && !isFocusMode && <StatusBar />}
      <CommandPalette />
        </>
      )}
      <HelpSheet />
      {/* v2.6.4 A.2: legacy welcome-modal disabilitato. Il nuovo spotlight
          tour è montato in fondo a App (riga ~753) e si attiva via
          `user.onboarding_completed` backend gating. */}
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
      {/* v2.2.2 audit-fix P3: i 7 dialog/wizard pesanti sono lazy-loadati.
          Wrappiamo in un singolo <Suspense fallback={null}> perché i dialog
          hanno animate-fade-in + slide-up interni che mascherano il delay
          del chunk (mediamente 50-200ms al primo open). */}
      <Suspense fallback={null}>
        {/* v1.5 Task 29: ImportWizard 4-step (Fonte → File → Anteprima → Conferma).
            Aperto da Dashboard "Importa file" + voci palette + custom event. */}
        <ImportWizard
          open={importWizardOpen}
          onClose={() => setImportWizardOpen(false)}
          initialSource={importWizardSource}
        />
        {/* v1.5 Task 34 follow-up: SismicaTHWizard governato dal wizardStore. */}
        <SismicaTHWizard
          open={wizardActive === "sismica-th"}
          onClose={() => useWizardStore.getState().close()}
        />
        {/* v1.6 S0 B01: galleria template dei modelli precaricati backend. */}
        <TemplateGalleryDialog
          open={templateGalleryOpen}
          onClose={() => setTemplateGalleryOpen(false)}
          models={models ?? []}
          onSelect={(id) => setActiveId(id)}
        />
        {/* v1.9.0 T1 + v2.2.0 B7: PercorsiBeamWizard 6-step end-to-end. */}
        <PercorsiBeamWizard
          open={percorsiPlaceholderOpen}
          onClose={() => setPercorsiPlaceholderOpen(false)}
          onLoadTemplate={(templateId) => {
            // v2.2.3 audit-visual-fix: prima chiudevamo il wizard subito
            // dopo onLoadTemplate, rendendo gli step 4-5-6 (Esegui /
            // Critical / Report) unreachable. Ora NON chiudiamo: il wizard
            // resta aperto sopra il viewport e l'utente prosegue fino al
            // Report dove c'è il bottone "Chiudi · vai al modello".
            setActiveId(templateId);
          }}
        />
        {/* v1.9.0 T4: ReportExportDialog (export PDF multi-sezione). */}
        <ReportExportDialog
          open={reportExportOpen}
          onClose={() => setReportExportOpen(false)}
        />
        {/* v2.2.4 feature: Pushover + Nonlinear wizard 3-step. */}
        <PushoverWizard
          open={pushoverWizardOpen}
          onClose={() => {
            setPushoverWizardOpen(false);
            useWizardStore.getState().close();
          }}
        />
        <NonlinearWizard
          open={nonlinearWizardOpen}
          onClose={() => {
            setNonlinearWizardOpen(false);
            useWizardStore.getState().close();
          }}
        />
        {/* v2.0 Precision PR15 T8: full-screen demo del 6-step Percorso. */}
        <PercorsoFullScreenDemo />
        {/* v2.0 Precision PR16 T2: A2 Modelli browser full-screen overlay. */}
        <ModelliBrowser />
      </Suspense>
      {/* v2.6.4 A.2: OnboardingTour autoplay primo login + replay via Help menu */}
      <OnboardingTour />
      {/* v2.6.4 C (accessibility-spec § 3.1): solver status SR announcer.
          Aria-live polite per non interrompere screen reader corrente. */}
      <SolverAriaLive />
    </div>
  );
}


/**
 * v2.6.4 C — Screen reader announcer per stato solver.
 *
 * `<div role="status" aria-live="polite" className="sr-only">` invisibile
 * visivamente ma letto da screen reader ad ogni cambio di `isRunning` /
 * `progressMessage`. Single source of truth — niente duplicati live region.
 *
 * Subscribe minimal: solo isRunning + progressMessage (per non re-firare
 * announce ad ogni tick di progress 0.01).
 */
function SolverAriaLive() {
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const progressMessage = useAnalysisStore((s) => s.progressMessage);
  const analysisType = useAnalysisStore((s) => s.analysisType);

  // Costruisci messaggio user-facing in IT
  const msg = isRunning
    ? progressMessage || `Analisi ${analysisType} in corso`
    : "";

  return (
    <div
      role="status"
      aria-live="polite"
      className="sr-only"
      data-testid="solver-aria-live"
    >
      {msg}
    </div>
  );
}

/**
 * SolverOverlay (v2.0 Precision PR11) — overlay full viewport durante
 * `useAnalysisStore().isRunning`. Si nasconde quando l'analisi finisce.
 *
 * Subscribe locale al solo `isRunning` + `progress` + `progressMessage`
 * + `analysisType` per non ri-renderizzare l'intero `App` su ogni tick
 * di progress (~10 Hz dal WS).
 */
function SolverOverlay() {
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const progress = useAnalysisStore((s) => s.progress);
  const message = useAnalysisStore((s) => s.progressMessage);
  const analysisType = useAnalysisStore((s) => s.analysisType);
  const modelName = useModelStore((s) => s.model?.name);
  const activeJob = useJobsStore((s) => s.activeJob);

  if (!isRunning) return null;

  const phase = phaseFromProgress(progress, isRunning);
  // Log stream minimal: solo il message corrente (il backend non emette ancora
  // un vero stdout stream; quando lo farà, sostituire con array). Per ora il
  // log mostra le ultime 3 transizioni di message preservate dall'activeJob
  // se disponibili.
  const logs = message ? [message] : [];

  // ETA proxy: progress 1.0 → 0s, lineare back-extrapolation se activeJob.startedAt.
  let etaSeconds: number | null = null;
  if (activeJob?.startedAt && progress > 0.01) {
    const elapsed = (Date.now() - activeJob.startedAt) / 1000;
    etaSeconds = (elapsed * (1 - progress)) / progress;
  }

  return (
    <LoadingScreen
      phase={phase}
      progress={progress}
      logs={logs}
      etaSeconds={etaSeconds}
      subtitle={`${analysisType} · ${modelName ?? "modello"}`}
    />
  );
}
