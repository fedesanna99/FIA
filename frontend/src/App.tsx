/**
 * App shell v3 — Sprint 4 / Asse G (alpha.17).
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │ TopBar (48 px)                                                │
 *  ├──┬─────────────────────┬───────────────────────┬─────────────┤
 *  │L │                     │ WorkspacePanel        │ RightRail   │
 *  │e │   Viewport 3D       │ (380 px)              │ (48 px)     │
 *  │f │   (Three.js)        │                       │             │
 *  │t │                     │ +overlay SlidePanel   │ Inspect /   │
 *  │R │                     │  (alpha.17, 320 px,   │ View /      │
 *  │a │                     │  z-30 sopra WS panel) │ Tools /     │
 *  │i │                     │                       │ History     │
 *  │l │                     │                       │             │
 *  ├──┴─────────────────────┴───────────────────────┴─────────────┤
 *  │ StatusBar (24 px)                                             │
 *  └──────────────────────────────────────────────────────────────┘
 *
 *  alpha.17: RightRail e SlidePanel introdotti. Coesistono col
 *  WorkspacePanel; in alpha.20 il WorkspacePanel sparira'.
 */
import { useEffect, useState } from "react";
import { TopBar } from "./components/shell/TopBar";
import { LeftRail } from "./components/shell/LeftRail";
import { RightRail } from "./components/shell/RightRail";
import { RightSlidePanel } from "./components/shell/RightSlidePanel";
import { WorkspacePanel } from "./components/shell/WorkspacePanel";
import { CommandPalette } from "./components/shell/CommandPalette";
import { HelpSheet } from "./components/shell/HelpSheet";
import { OnboardingTour } from "./components/shell/OnboardingTour";
import { ClimateContextBadge } from "./components/shell/ClimateContextBadge";
import { StatusBar } from "./components/layout/StatusBar";
import { Toaster } from "./components/layout/Toaster";
import { Viewport3D } from "./components/viewport/Viewport3D";
import { DropZone } from "./components/viewport/DropZone";
import { HelpDialog } from "./components/dialogs/HelpDialog";
import { useModelList, useLoadModel } from "./hooks/useModel";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useUIStore } from "./store/uiStore";
import { useWorkspaceStore } from "./store/workspaceStore";
import { useThemeStore } from "./store/themeStore";

export default function App() {
  const { data: models } = useModelList();
  const [activeId, setActiveId] = useState<string | null>(null);
  useLoadModel(activeId);
  const setDialog = useUIStore((s) => s.setOpenDialog);
  const openDialog = useUIStore((s) => s.openDialog);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  useKeyboardShortcuts((kind) => setDialog(kind));

  // Inizializza tema (dark/light/system) — applica data-theme e listener system
  useEffect(() => {
    return useThemeStore.getState().init();
  }, []);

  // Numeri 1-5 → switch workspace (mappa il rail)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // skip se l'utente sta scrivendo
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const map: Record<string, "model" | "analysis" | "results" | "verify" | "io"> = {
        "1": "model", "2": "analysis", "3": "results", "4": "verify", "5": "io",
      };
      const ws = map[e.key];
      if (ws) {
        e.preventDefault();
        setWorkspace(ws);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setWorkspace]);

  useEffect(() => {
    if (!activeId && models && models.length > 0) {
      setActiveId(models[0].id);
    }
  }, [models, activeId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-bg text-ink overflow-hidden font-sans">
      <TopBar models={models ?? []} activeId={activeId} onSelect={setActiveId} />
      <div className="flex flex-1 min-h-0 relative">
        <LeftRail />
        <main className="flex-1 relative min-w-0 bg-bg-viewport">
          <Viewport3D />
          <DropZone onImported={(id) => setActiveId(id)} />
        </main>
        <div className="relative flex flex-shrink-0">
          {/* WorkspacePanel a sinistra del RightRail (cosi' la SlidePanel
              overlay puo' apparire fra i due, ankorata al rail destro). */}
          <WorkspacePanel />
          <RightSlidePanel />
          <RightRail />
        </div>
      </div>
      <StatusBar />
      <Toaster />
      <CommandPalette />
      <HelpSheet />
      <OnboardingTour />
      <ClimateContextBadge />
      <HelpDialog open={openDialog === "help"} onClose={() => setDialog(null)} />
    </div>
  );
}
