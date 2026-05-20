/**
 * WorkspacePanel — pannello destro responsivo (M8).
 *
 *  - Desktop ≥ md (1024+): aside fisso a destra, 380-420 px
 *  - Tablet  (sm 768-1023): aside collassabile (slide-in con backdrop)
 *  - Mobile  < sm:          drawer dal fondo, full-width
 *
 * Lo stato collapsed/open vive in `useUIStore.panelOpen` (M8 add).
 */
import { useEffect, useState } from "react";
import { X, PanelRightOpen } from "lucide-react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { ModelWorkspace } from "./workspaces/ModelWorkspace";
import { AnalysisWorkspace } from "./workspaces/AnalysisWorkspace";
import { ResultsWorkspace } from "./workspaces/ResultsWorkspace";
import { VerifyWorkspace } from "./workspaces/VerifyWorkspace";
import { IOWorkspace } from "./workspaces/IOWorkspace";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../ui/cn";

export function WorkspacePanel() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  // Stato local (collapsed sotto md); ricalcolato a ogni resize.
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Quando l'utente cambia workspace su mobile, apri automaticamente il pannello
  useEffect(() => {
    if (isMobile) setMobileOpen(true);
  }, [workspace, isMobile]);

  const content = (
    <>
      {workspace === "model"    && <ModelWorkspace />}
      {workspace === "analysis" && <AnalysisWorkspace />}
      {workspace === "results"  && <ResultsWorkspace />}
      {workspace === "verify"   && <VerifyWorkspace />}
      {workspace === "io"       && <IOWorkspace />}
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Floating toggle button quando chiuso */}
        {!mobileOpen && (
          <Tooltip content="Apri pannello workspace" side="left">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Apri pannello workspace"
              className="fixed bottom-16 right-3 z-30 w-12 h-12 rounded-full bg-accent text-white shadow-dialog flex items-center justify-center hover:bg-accent-hover transition-colors"
            >
              <PanelRightOpen className="h-5 w-5" />
            </button>
          </Tooltip>
        )}

        {/* Drawer mobile (slide from right o bottom) */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] animate-fade-in"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside
              className={cn(
                "fixed top-12 right-0 bottom-6 z-40 w-full max-w-[420px]",
                "bg-bg-panel border-l border-border shadow-dialog flex flex-col overflow-hidden animate-slide-left",
              )}
              role="dialog"
              aria-modal="true"
              aria-label={`Workspace ${workspace}`}
            >
              <div className="flex items-center justify-end px-2 py-1.5 border-b border-border flex-shrink-0">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-ink-muted hover:text-ink p-1 rounded hover:bg-bg-hover"
                  aria-label="Chiudi pannello"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {content}
            </aside>
          </>
        )}
      </>
    );
  }

  // Desktop: aside fisso
  return (
    <aside
      className={cn(
        "flex-shrink-0 border-l border-border bg-bg-panel flex flex-col overflow-hidden",
        "w-[340px] lg:w-[380px] xl:w-[420px]",
      )}
      aria-label={`Workspace ${workspace}`}
    >
      {content}
    </aside>
  );
}
