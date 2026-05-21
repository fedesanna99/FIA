/**
 * CostPreviewView (v1.5 Task 28).
 *
 * Sub-view del Tools hub: spiega che il cost preview e' inline nel SolvePanel
 * (CostPreviewCard, alpha.25 G10). Mostra mini esempio + link "Apri SolvePanel".
 */
import { Receipt, Coins, Info } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useLeftRailStore } from "../../../store/leftRailStore";


export function CostPreviewView() {
  const openSolve = () => {
    useWorkspaceStore.getState().setWorkspace("analysis");
    useLeftRailStore.getState().open("analysis");
  };

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      <section>
        <div className="flex items-center gap-2 mb-1.5">
          <Receipt className="w-3.5 h-3.5 text-ink-coral" />
          <h3 className="text-xs font-semibold text-ink">Cost preview</h3>
        </div>
        <p className="text-[11px] text-ink-muted leading-relaxed mb-3">
          Il cost preview e' integrato nel pannello{" "}
          <span className="font-semibold text-ink">Solve</span>: appare automaticamente
          quando scegli un'analisi (statica, modale, dinamica, sismica) e mostra
          la stima di crediti necessari prima dell'esecuzione.
        </p>

        {/* Mock card del cost preview */}
        <div className="bg-gradient-to-br from-bg-info to-bg-purple/40 border border-accent/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-muted uppercase tracking-wider font-semibold mb-1">
            <Coins className="w-3 h-3" />
            Esempio
          </div>
          <div className="text-xs text-ink font-medium mb-2">
            Statica lineare · 248 nodi · 96 elementi
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] text-ink-muted">Costo stimato</div>
              <div className="text-xl font-bold font-mono text-accent">2.4 cr</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-ink-muted">Tempo atteso</div>
              <div className="text-sm font-mono text-ink">~1.2 s</div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2 px-2 py-2 bg-bg-info border border-accent/20 rounded-md">
        <Info className="w-3.5 h-3.5 text-ink-info mt-0.5 shrink-0" />
        <p className="text-[10px] text-ink-info leading-snug">
          Il costo varia con n. di nodi, gradi di libertà, tipo solver e quota piano.
          La preview e' aggiornata in tempo reale al cambio di parametri.
        </p>
      </div>

      <button
        type="button"
        onClick={openSolve}
        className="w-full bg-coral/20 hover:bg-coral/30 text-ink-coral border border-coral/30 text-[11px] font-medium py-2 rounded-md transition-colors"
      >
        Apri pannello Solve →
      </button>
    </div>
  );
}
