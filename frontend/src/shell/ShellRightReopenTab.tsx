// v3.4 Fetta E2-IA Commit E2.2 — Shell custom · Reopen tab destra
//
// Tab verticale destra ~32px sticky full-height del `shell-mid`, visibile
// SOLO quando `rightPanelStore.panelState === "closed"`. Sostituisce il
// `ShellPanel` (380px) nella terza colonna della grid `.shell-mid`.
//
// Click sulla tab → `rightPanelStore.open()` → il pannello completo torna
// a sostituire la tab e l'utente ritrova il workspace content invariato.
//
// Pattern simmetrico al ShellPanel ma minimal: icona PanelRight (lucide,
// stroke 1.8 come gli altri iconbtn topbar) + label verticale del
// workspace corrente per discoverability (l'utente sa cosa sta riaprendo).
//
// Stili in `frontend/src/styles/shell.css` (.shell-right-reopen-tab + label).
// Quando il panel-state e' "closed", la regola CSS
// `.shell[data-panel-state="closed"]` override `--panel-w: 32px` per
// restringere la colonna grid (vedi shell.css "Fetta E2.2").

import { PanelRight } from "lucide-react";
import { useRightPanelStore } from "../store/rightPanelStore";


type ShellWorkspaceId = "modello" | "analisi" | "risultati" | "verifiche" | "io" | "view";


/** Label workspace per la tab verticale — italiano user-facing, allineato
 *  ai title dello `ShellPanel` CONFIG. */
const WORKSPACE_LABEL: Record<ShellWorkspaceId, string> = {
  modello: "Modello",
  analisi: "Analisi",
  risultati: "Risultati",
  verifiche: "Verifiche",
  io: "I/O & Collab",
  view: "View",
};


interface ShellRightReopenTabProps {
  /** Workspace attivo — determina la label verticale mostrata sulla tab. */
  workspace?: ShellWorkspaceId;
}


export function ShellRightReopenTab({
  workspace = "modello",
}: ShellRightReopenTabProps) {
  const open = useRightPanelStore((s) => s.open);
  const label = WORKSPACE_LABEL[workspace];

  return (
    <button
      type="button"
      className="shell-right-reopen-tab"
      onClick={open}
      aria-label={`Riapri pannello ${label}`}
      title={`Riapri pannello ${label}`}
      data-shell="reopen-tab"
      data-testid="shell-right-reopen-tab"
    >
      <PanelRight size={16} strokeWidth={1.8} aria-hidden />
      <span className="shell-right-reopen-label">{label}</span>
    </button>
  );
}
