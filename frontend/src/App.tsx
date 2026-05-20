/**
 * App shell v2 — nuova architettura post-M1.
 *
 *  ┌────────────────────────────────────────────┐
 *  │ TopBar (48 px)                             │
 *  ├──┬─────────────────────┬───────────────────┤
 *  │R │                     │                   │
 *  │A │   Viewport 3D       │ WorkspacePanel    │
 *  │I │   (Three.js)        │ (380 px)          │
 *  │L │                     │                   │
 *  │48│                     │                   │
 *  │px│                     │                   │
 *  │  │                     │                   │
 *  ├──┴─────────────────────┴───────────────────┤
 *  │ StatusBar (24 px)                          │
 *  └────────────────────────────────────────────┘
 */
import { useEffect, useState } from "react";
import { TopBar } from "./components/shell/TopBar";
import { LeftRail } from "./components/shell/LeftRail";
import { WorkspacePanel } from "./components/shell/WorkspacePanel";
import { CommandPalette } from "./components/shell/CommandPalette";
import { HelpSheet } from "./components/shell/HelpSheet";
import { OnboardingTour } from "./components/shell/OnboardingTour";
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
      <div className="flex flex-1 min-h-0">
        <LeftRail />
        <main className="flex-1 relative min-w-0 bg-bg-viewport">
          <Viewport3D />
          <DropZone onImported={(id) => setActiveId(id)} />
        </main>
        <WorkspacePanel />
      </div>
      <StatusBar />
      <Toaster />
      <CommandPalette />
      <HelpSheet />
      <OnboardingTour />
      <HelpDialog open={openDialog === "help"} onClose={() => setDialog(null)} />
    </div>
  );
}
