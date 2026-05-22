/**
 * LeftSlidePanel (alpha.22) — Sprint 4 G7.
 *
 * Overlay ankorato a sinistra (subito dopo il LeftRail) che mostra il
 * content del workspace corrente. Sostituisce il vecchio
 * `WorkspacePanel` 380px fisso a destra.
 *
 * Larghezza 360-420px responsive. Animazione `slide-right` 220ms.
 * Header con titolo + close X. Body scrollabile.
 *
 * Decision: il panel NON e' modal (no backdrop). Il viewport rimane
 * visibile e interattivo a destra del panel. Il pattern e' "drawer
 * permanente" come Linear sidebar.
 */
import { useLeftRailStore } from "../../store/leftRailStore";
import { MakePanel } from "../../shell/panels/MakePanel";
import { SolvePanel } from "../../shell/panels/SolvePanel";
import { VerifyPanel } from "../../shell/panels/VerifyPanel";


/**
 * LeftSlidePanel — v1.5.2 Task 35: dopo la rimozione dei pannelli "Results"
 * e "I/O" legacy il workspace ha solo 3 destinazioni reali (make / solve /
 * verify), tutte montate come macro-panel brief-aligned. "docs" e' un
 * overlay separato (HelpSheet) e non e' un panel laterale.
 */
export function LeftSlidePanel() {
  const openSection = useLeftRailStore((s) => s.openSection);

  if (!openSection || openSection === "docs") return null;
  if (openSection === "model")    return <MakePanel />;
  if (openSection === "analysis") return <SolvePanel />;
  if (openSection === "verify")   return <VerifyPanel />;
  return null;
}
