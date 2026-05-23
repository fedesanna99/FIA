/**
 * MobileTabbar (v1.5 Task 30) — barra fissa bottom-screen su mobile.
 *
 * 5 voci:
 *   - Modello   (default → chiude tutti i panel, mostra viewport)
 *   - Make      (apre MobilePanel con MakePanel)
 *   - Solve     (apre MobilePanel con SolvePanel)
 *   - Risultati (apre MobilePanel con InspectPanel)
 *   - Altro     (apre MobileMoreMenu con Verify/Tools/Account/Theme)
 *
 * State: `workspaceStore.currentMobileTab` (null = viewport).
 */
import { Box, Hammer, Zap, BarChart3, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useWorkspaceStore, type MobileTab } from "../../store/workspaceStore";


interface TabItem {
  id: MobileTab;
  label: string;
  icon: LucideIcon;
}


const TABS: TabItem[] = [
  { id: "model",   label: "Modello",   icon: Box },
  { id: "make",    label: "Make",      icon: Hammer },
  { id: "solve",   label: "Solve",     icon: Zap },
  { id: "results", label: "Risultati", icon: BarChart3 },
  { id: "more",    label: "Altro",     icon: MoreHorizontal },
];


export function MobileTabbar() {
  const current = useWorkspaceStore((s) => s.currentMobileTab);
  const setTab = useWorkspaceStore((s) => s.setMobileTab);

  return (
    <nav
      // v1.7 T6: height fissa h-14 (56px) + safe-area-bottom rispettato.
      // Tabbar coerente con hub-card style (tono info per stato attivo).
      className="fixed bottom-0 left-0 right-0 z-40 bg-bg-panel border-t border-border safe-area-bottom safe-area-x"
      data-testid="mobile-tabbar"
      aria-label="Navigazione mobile"
    >
      <div className="flex items-stretch h-14 px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          // "model" e' attivo quando NESSUN tab e' aperto (viewport visibile).
          const isActive = tab.id === "model" ? current === null || current === "model" : current === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id === "model" ? null : tab.id)}
              data-testid={`mobile-tab-${tab.id}`}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${tab.label}${isActive ? " (attivo)" : ""}`}
              className={`flex-1 inline-flex flex-col items-center justify-center gap-1 mx-0.5 transition-colors focus-visible:outline-none border-t-2 ${
                isActive
                  ? "text-accent bg-bg-info border-accent"
                  : "text-ink-3 hover:text-ink hover:bg-bg-hover border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span className={`font-mono text-[10px] uppercase tracking-wide-1 ${isActive ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
