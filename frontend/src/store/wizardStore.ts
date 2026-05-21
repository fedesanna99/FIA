/**
 * WizardStore (v1.5 Task 34 follow-up) — hub unico per aprire i wizard
 * dalla command palette / shortcut globali.
 *
 * Pattern: la palette dispatcha `actionKind: "open-wizard"` con
 * `payload: { wizard: WizardKind, ...args }`. Il dispatcher in App.tsx
 * legge `wizardStore.active` e instrada verso il meccanismo concreto:
 *
 *   - "new-model" → uiStore.setOpenDialog("new")
 *   - "mesh"      → uiStore.setOpenDialog("mesh")
 *   - "import"    → window event "feapro:open-import-wizard"
 *   - "sismica-th"→ window event "feapro:open-sismica-th-wizard"
 *                   (listener in SeismicTHPanel apre il wizard locale)
 *   - "pushover" / "nonlinear" / "report" → toast "soon"
 *
 * Lo store non monta i wizard direttamente: ognuno vive nel suo
 * contesto naturale (Dialog modali in uiStore, ImportWizard renderato
 * in App, SismicaTHWizard renderato in SeismicTHPanel). Lo store e' la
 * pubblicazione del trigger.
 *
 * Dopo aver dispatchato il side-effect, il dispatcher chiama close()
 * per resettare lo stato (i wizard hanno la loro vita locale).
 */
import { create } from "zustand";


export type WizardKind =
  | "new-model"
  | "mesh"
  | "import"
  | "sismica-th"
  | "pushover"
  | "nonlinear"
  | "report";


interface WizardState {
  active: WizardKind | null;
  payload: Record<string, unknown>;
  open: (kind: WizardKind, payload?: Record<string, unknown>) => void;
  close: () => void;
}


export const useWizardStore = create<WizardState>((set) => ({
  active: null,
  payload: {},
  open: (kind, payload = {}) => set({ active: kind, payload }),
  close: () => set({ active: null, payload: {} }),
}));
