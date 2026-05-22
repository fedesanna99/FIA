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
      className="fixed bottom-0 left-0 right-0 z-40 bg-bg-panel border-t border-border px-2 py-1 flex items-center justify-around safe-area-bottom"
      data-testid="mobile-tabbar"
      aria-label="Navigazione mobile"
    >
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
            aria-pressed={isActive}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded transition flex-1 ${
              isActive ? "text-ink-info bg-bg-info" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className={`text-[9px] ${isActive ? "font-semibold" : ""}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
