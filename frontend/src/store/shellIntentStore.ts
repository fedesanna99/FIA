// redesign/workspace-fasi · rifinitura 2c
//
// Store globale di "navigation intent" per la Shell custom. Sostituisce
// il vecchio pattern window.dispatchEvent("feapro:shell:goto-workspace")
// che era fragile rispetto a HMR di Shell.tsx (closure stale: listener
// fantasma su istanze Shell smontate intercettavano l'evento e facevano
// no-op silente).
//
// Pattern Zustand singleton:
//   - usato dalla CTA del toast "Analisi completata → Vai ai Risultati"
//     in lib/analysisCompleteToast.ts (chiama requestWorkspace)
//   - osservato da Shell.tsx via useEffect: quando pendingWorkspace !=
//     null, chiama setActiveWs(pending) + consume()
//   - lo store sopravvive a HMR (sostituisce solo i componenti, non gli
//     store), e i componenti si re-subscrivano automaticamente
//
// Workspace target validi: gli stessi 6 di Shell.ShellWorkspaceId
// (modello/analisi/risultati/verifiche/io/view). Per evitare import
// circolare (Shell.tsx -> intent store -> Shell.tsx) usiamo string e
// validiamo lato consumer (Shell.tsx ha gia' VALID_WS Set).

import { create } from "zustand";

export type ShellWorkspaceIntent =
  | "modello" | "analisi" | "risultati" | "verifiche" | "io" | "view";

interface ShellIntentState {
  /** Workspace richiesto da un'azione esterna (es. CTA toast). */
  pendingWorkspace: ShellWorkspaceIntent | null;
  /** Richiede il cambio workspace. Idempotente: imposta sempre l'ultimo. */
  requestWorkspace: (ws: ShellWorkspaceIntent) => void;
  /** Resetta a null dopo che Shell ha applicato l'intent. */
  consume: () => void;
}

export const useShellIntentStore = create<ShellIntentState>((set) => ({
  pendingWorkspace: null,
  requestWorkspace: (ws) => set({ pendingWorkspace: ws }),
  consume: () => set({ pendingWorkspace: null }),
}));
