/**
 * panelHeaderStore (v2.1.6 nav-dedup).
 *
 * Single source of truth per l'header dei pannelli (Make / Solve / Verify /
 * Inspect / View / Tools). Prima del refactor c'erano 4 intestazioni
 * sovrapposte sulla stessa schermata mobile (MobilePanel + PanelChrome +
 * PanelBreadcrumb + Section h3) con back-arrow concorrenti.
 *
 * Ora la responsabilità è centralizzata:
 *   - `PanelChrome` scrive `title` (root del pannello, es. "Verify")
 *   - `PanelBreadcrumb` scrive `current` + `popDrillIn` (es. "Verifiche live")
 *   - Su desktop entrambi i componenti renderizzano normalmente (chrome
 *     completo + breadcrumb visivo)
 *   - Su mobile entrambi rendono `null`; il `MobilePanel` legge dallo store
 *     e mostra UN solo header con titolo dinamico e back-arrow smart.
 *
 * Il back-arrow del MobilePanel:
 *   - drill-in attivo (`popDrillIn` non null) → call popDrillIn() → torna al hub
 *   - hub mode (popDrillIn null) → call props.onBack passato dall'App
 *     (chiude il MobilePanel)
 */
import { create } from "zustand";


interface PanelHeaderState {
  /** Root del pannello corrente (es. "Verify", "Make"). null = nessun panel montato. */
  title: string | null;
  /** Drill-in attivo (es. "Verifiche live"). null = hub mode. */
  current: string | null;
  /**
   * Handler per tornare al hub (rimuovere drill-in). Set da PanelBreadcrumb
   * quando montato. Su mobile diventa l'azione del back-arrow superiore.
   */
  popDrillIn: (() => void) | null;

  /**
   * Setter idempotente. Accetta parziali — i campi non passati restano invariati.
   * Usato sia da PanelChrome (title) sia da PanelBreadcrumb (current + popDrillIn).
   */
  set: (next: Partial<Pick<PanelHeaderState, "title" | "current" | "popDrillIn">>) => void;
  /** Reset completo (chiamato su unmount del pannello). */
  clear: () => void;
}


export const usePanelHeaderStore = create<PanelHeaderState>((set) => ({
  title: null,
  current: null,
  popDrillIn: null,
  set: (next) => set((s) => ({ ...s, ...next })),
  clear: () => set({ title: null, current: null, popDrillIn: null }),
}));
