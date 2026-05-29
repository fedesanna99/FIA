/**
 * ShellPanelMobileSheet (v3.4 Fetta M4 · 30/05/2026 notte).
 *
 * Bottom sheet sticky che wrappa il content del panel DX "Verifica"
 * su mobile (viewport < 640px, fase `risultati`). Replica la filosofia
 * "junior fuori, senior dentro" del panel DX desktop (E2.5c) adattata
 * a touch:
 *
 *   PEEK (default · ~64px sticky bottom):
 *   ┌─────────────────────────────────────┐
 *   │ Verifica                       ⌃    │
 *   │ Statica · completata                │
 *   └─────────────────────────────────────┘
 *   (viewport 3D visibile sopra)
 *
 *   EXPANDED (tap su header · ~80vh):
 *   ┌─────────────────────────────────────┐
 *   │ Verifica                       ⌄    │
 *   │ Statica · completata                │
 *   ├─────────────────────────────────────┤
 *   │ ◆ SINTESI (sempre aperta)           │
 *   │   UR 0.72 · σmax 145 MPa · ✓ OK     │
 *   │ ▸ Spostamenti                       │
 *   │ ▸ Sollecitazioni                    │
 *   │ ▸ Reazioni                          │
 *   │ ▸ Verifica EC3                      │
 *   └─────────────────────────────────────┘
 *
 * Stato persistito via `mobileSheetStore` (default "peek"). Body scroll
 * lock quando "expanded" per evitare double-scroll (sheet + page).
 *
 * Pattern di rendering: il content (children = ResultsTabsPanel) viene
 * passato dal chiamante (Shell.tsx). Il sheet non duplica logica di
 * ResultsTabsPanel — il suo header `.results-panel-h` interno viene
 * nascosto via CSS @media mobile (selettore `.shell-panel-sheet
 * .results-panel-h`) per evitare header duplicato col nostro sheet
 * header. Stesso pattern di Radix Dialog header overrides.
 *
 * NON e' montato su desktop (display:none CSS default). Visibilita'
 * controllata sia dal CSS (@media max-width 639px) sia da Shell.tsx
 * (render condizionale `isMobile && activeWs === "risultati"`).
 */
import { ReactNode, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { useResultsStore } from "../store/resultsStore";
import { useAnalysisStore } from "../store/analysisStore";
import { useMobileSheetStore } from "../store/mobileSheetStore";


interface ShellPanelMobileSheetProps {
  /** Content del sheet (di solito ResultsTabsPanel). */
  children: ReactNode;
}


const ANALYSIS_LABEL: Record<string, string> = {
  static: "Statica",
  modal: "Modale",
  dynamic: "Dinamica",
  buckling: "Buckling",
};


export function ShellPanelMobileSheet({ children }: ShellPanelMobileSheetProps) {
  const sheetState = useMobileSheetStore((s) => s.sheetState);
  const toggle = useMobileSheetStore((s) => s.toggle);

  // Subtitle derivato dagli store reali (stesso pattern di ResultsTabsPanel
  // header) — l'utente sa subito in peek se c'e' un calcolo o no.
  const hasStatic = useResultsStore((s) => !!s.staticResults);
  const hasModal = useResultsStore((s) => !!s.modalResults);
  const hasDynamic = useResultsStore((s) => !!s.dynamicResults);
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const analysisType = useAnalysisStore((s) => s.analysisType);

  const hasAnyResults = hasStatic || hasModal || hasDynamic;
  const subtitle = isRunning
    ? "Calcolo in corso…"
    : hasAnyResults
      ? `${ANALYSIS_LABEL[analysisType] ?? "Analisi"} · completata`
      : "Nessun calcolo · Premi Esegui";

  // Body scroll lock quando expanded — evita che lo scroll del documento
  // si interferisca con lo scroll interno del sheet body. Cleanup
  // garantito al unmount o quando torna a peek.
  useEffect(() => {
    if (sheetState !== "expanded") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetState]);

  const isExpanded = sheetState === "expanded";

  return (
    <div
      className="shell-panel-sheet"
      data-sheet-state={sheetState}
      data-testid="shell-panel-mobile-sheet"
    >
      <button
        type="button"
        className="shell-panel-sheet-header"
        onClick={toggle}
        aria-label={isExpanded ? "Comprimi pannello Verifica" : "Espandi pannello Verifica"}
        aria-expanded={isExpanded}
        data-testid="shell-panel-mobile-sheet-toggle"
      >
        <div className="shell-panel-sheet-header-text">
          <span className="shell-panel-sheet-title">Verifica</span>
          <span className="shell-panel-sheet-subtitle">{subtitle}</span>
        </div>
        <ChevronUp
          className="shell-panel-sheet-chevron"
          data-state={sheetState}
          size={20}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <div className="shell-panel-sheet-body" data-testid="shell-panel-mobile-sheet-body">
        {children}
      </div>
    </div>
  );
}
