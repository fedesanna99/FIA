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
import { HelpDialog } from "./components/dialogs/HelpDialog";
import { useModelList, useLoadModel } from "./hooks/useModel";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useUIStore } from "./store/uiStore";
import { useWorkspaceStore } from "./store/workspaceStore";
import { useLeftRailStore } from "./store/leftRailStore";
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

  // Numeri 1-3 (main workspace) e 4-5 (legacy) ora aprono anche il
  // LeftSlidePanel (toggle pattern). Update alpha.22.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      // alpha.20 ha mappato Make/Solve/Verify su 1-3; results/io restano 4-5
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
        {/* LeftSlidePanel ankorato a sinistra (toggle via leftRailStore).
            Quando chiuso, viewport occupa tutto lo spazio fino al
            RightSlidePanel/RightRail. */}
        <LeftSlidePanel />
        <main className="flex-1 relative min-w-0 bg-bg-viewport">
          <Viewport3D />
          <DropZone onImported={(id) => setActiveId(id)} />
        </main>
        <div className="relative flex flex-shrink-0">
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
