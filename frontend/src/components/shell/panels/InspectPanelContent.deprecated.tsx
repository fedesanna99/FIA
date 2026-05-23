/**
 * InspectPanelContent — alpha.17 placeholder + shortcut alle viste
 * risultati. In alpha.20 sostituira' la tab "Results" del
 * WorkspacePanel.
 *
 * Mostra:
 *  - Stato risultati per ogni tipo analisi (statica/modale/dinamica/...)
 *  - Click su una riga → switcha workspace=results e apre la tab giusta
 */
import { Activity, ChevronRight } from "lucide-react";
import { useResultsStore } from "../../../store/resultsStore";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useRightRailStore } from "../../../store/rightRailStore";


interface ResultRow {
  key: "static" | "modal" | "dynamic" | "buckling";
  label: string;
  description: string;
}


const ROWS: ResultRow[] = [
  { key: "static",   label: "Statica",   description: "u, σ, N/T/M" },
  { key: "modal",    label: "Modale",    description: "frequenze, mode shapes" },
  { key: "dynamic",  label: "Dinamica",  description: "time-history Newmark" },
  { key: "buckling", label: "Buckling",  description: "fattori critici Eulero" },
];


export function InspectPanelContent() {
  const staticRes = useResultsStore((s) => s.staticResults);
  const modalRes = useResultsStore((s) => s.modalResults);
  const dynamicRes = useResultsStore((s) => s.dynamicResults);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const closeRail = useRightRailStore((s) => s.close);

  const hasResult = (k: ResultRow["key"]) => {
    if (k === "static")   return !!staticRes;
    if (k === "modal")    return !!modalRes;
    if (k === "dynamic")  return !!dynamicRes;
    return false; // buckling not yet in store
  };

  return (
    <div className="space-y-3">
      <p className="text-ink-3 leading-relaxed">
        Risultati delle analisi eseguite sul modello attivo. Click su una
        voce per aprire il viewer.
      </p>

      <div className="space-y-1">
        {ROWS.map((row) => {
          const has = hasResult(row.key);
          return (
            <button
              key={row.key}
              type="button"
              disabled={!has}
              onClick={() => {
                setWorkspace("results");
                closeRail();
              }}
              data-testid={`inspect-row-${row.key}`}
              className={[
                "w-full flex items-center justify-between gap-2",
                "px-2 py-1.5 rounded-sm text-left transition-colors",
                has
                  ? "hover:bg-bg-hover cursor-pointer text-ink"
                  : "text-ink-faint cursor-not-allowed",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Activity className={`h-3.5 w-3.5 flex-shrink-0 ${has ? "text-accent" : "text-ink-faint"}`} />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{row.label}</div>
                  <div className="text-[11px] text-ink-3 truncate">
                    {has ? row.description : "non ancora calcolata"}
                  </div>
                </div>
              </div>
              {has && <ChevronRight className="h-3.5 w-3.5 text-ink-3 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-[11px] text-ink-3 leading-relaxed">
          <span className="chip chip-info text-[10px] mr-1">tip</span>
          Premi <span className="kbd">3</span> per andare al workspace Risultati
          con la tab analisi attiva.
        </p>
      </div>
    </div>
  );
}
