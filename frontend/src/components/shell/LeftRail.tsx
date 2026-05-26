/**
 * LeftRail — chrome legacy left navigation. (v2.6.6 E.2 refactor)
 *
 * Due modalità (match composition mockup Dashboard A1):
 *   - **expanded** (default, ≥md): w-200px con 4 sezioni testuali
 *     (WORKSPACE / SOLVE / VERIFY / RISORSE) + 12 voci. Usa il componente
 *     condiviso `<RailSections>` (single source of truth con Shell custom).
 *   - **collapsed** (≤sm o user-preference): w-12 icon-only legacy con
 *     3 voci Make/Solve/Verify + tooltip. Mantenuto invariato per backward
 *     compat (componente estratto in `LeftRailCollapsed.tsx`).
 *
 * Persistenza: `useRailExpansion()` hook condiviso (key `feapro:rail:expanded`
 * coerente con Shell custom v2.6.x). Comprimi in workspace → resta compresso
 * in home, e viceversa.
 *
 * Dispatch click: `useRailDispatch()` hook condiviso. Voci `requiresModel`
 * senza modello attivo mostrano toast educational con CTA "Apri galleria
 * template" invece di essere disabilitate.
 *
 * Mobile: forza collapsed per ≤768px override user preference. Mantiene il
 * comportamento legacy w-12 icon-only (no new mobile UX, scope creep evitato).
 *
 * v2.6.6 E.2: refactor architetturale. Comportamento home dashboard A1
 * match composition-level. Refactor PR closes the gap left by v2.6.5
 * (che ha applicato refactor alla Shell custom, non al chrome legacy).
 */
import { useIsMobile } from "../../hooks/useIsMobile";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useRailExpansion } from "../../lib/useRailExpansion";
import { useRailDispatch } from "../../lib/railDispatch";
import { RailSections } from "./shared/RailSections";
import { LeftRailCollapsed } from "./LeftRailCollapsed";

/**
 * Deriva l'item id attivo (per highlight rail-item[data-active="true"])
 * partendo dallo state legacy `workspace` + `analysisType`.
 *
 * Match `resolveActiveItemId` in `shell/ShellRail.tsx` per coerenza
 * cross-context. Voci home/models/jobs/history/templates/docs non hanno
 * un active state diretto (sono action-only o navigation neutra).
 */
function resolveActiveItemId(
  workspace: "model" | "analysis" | "verify" | "docs",
  analysisType: string,
): string | undefined {
  if (workspace === "verify") {
    // workspace "verify" può ospitare Checks (verifiche) o Inspect (risultati).
    // Senza ulteriori segnali, default a "checks" (più usato in home con CTA).
    return "checks";
  }
  if (workspace === "analysis") {
    if (analysisType === "dynamic") return "dynamic";
    if (analysisType === "modal") return "seismic"; // modal = sismica
    return "linear";
  }
  if (workspace === "model") return "home";
  return undefined;
}

export function LeftRail() {
  const isMobile = useIsMobile();
  const { isExpanded, setExpanded } = useRailExpansion();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const analysisType = useAnalysisStore((s) => s.analysisType);
  const dispatch = useRailDispatch();

  // Forza collapsed su mobile (override user preference). Backward compat
  // mobile 100%: stesso w-12 con voci legacy Make/Solve/Verify.
  const showExpanded = !isMobile && isExpanded;

  if (!showExpanded) {
    // Collapsed fallback: legacy w-12 icon-only. Toggle Espandi visibile
    // solo su desktop (su mobile resta compressa per design).
    return (
      <LeftRailCollapsed
        onExpand={!isMobile ? () => setExpanded(true) : undefined}
      />
    );
  }

  // Expanded mode: usa componente condiviso `<RailSections>` con stili
  // CSS della Shell custom (`.shell-rail[data-expanded="true"]`) + width
  // override via `.legacy-left-rail`.
  const activeItemId = resolveActiveItemId(workspace, analysisType);

  return (
    <RailSections
      className="shell-rail legacy-left-rail"
      activeItemId={activeItemId}
      onItemClick={dispatch}
      onCollapse={() => setExpanded(false)}
    />
  );
}
