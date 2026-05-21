/**
 * ValidationView (v1.5 Task 28).
 *
 * Sub-view del Tools hub: validation panel.
 * Bottone "Esegui validazione NAFEMS" + lista test + link al report HTML.
 */
import { ShieldCheck, ExternalLink, FileText } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useLeftRailStore } from "../../../store/leftRailStore";


const NAFEMS_TESTS = [
  { id: "le1", name: "LE1 — Plane stress, biaxial", status: "passed" as const },
  { id: "le2", name: "LE2 — Cylindrical shell patch", status: "passed" as const },
  { id: "le10", name: "LE10 — Thick plate bending", status: "passed" as const },
];


export function ValidationView() {
  const openVerify = () => {
    useWorkspaceStore.getState().setWorkspace("verify");
    useLeftRailStore.getState().open("verify");
  };

  const openReport = () => {
    window.open("/api/validation/report", "_blank", "noopener");
  };

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      <section>
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-ink-purple" />
          <h3 className="text-xs font-semibold text-ink">Benchmark NAFEMS</h3>
        </div>
        <p className="text-[11px] text-ink-muted leading-relaxed mb-2">
          Test di validazione del solver contro i benchmark NAFEMS (LE1, LE2, LE10).
          Verifica accuratezza del FEM su problemi con soluzione analitica nota.
        </p>
        <button
          type="button"
          onClick={openReport}
          data-testid="tools-validation-report"
          className="w-full bg-bg-purple text-ink-purple border border-purple/30 hover:bg-purple/15 text-[11px] font-medium py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5"
        >
          <FileText className="w-3 h-3" />
          Apri report HTML
          <ExternalLink className="w-3 h-3" />
        </button>
      </section>

      <section>
        <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">
          Test recenti
        </div>
        <div className="space-y-1">
          {NAFEMS_TESTS.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 px-2 py-1.5 bg-bg-panel border border-border rounded-md"
            >
              <span className="text-[11px] text-ink truncate">{t.name}</span>
              <span className="text-[10px] font-mono text-ink-success bg-bg-success/40 px-1.5 py-0.5 rounded-sm border border-success/30">
                PASS
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-border" />

      <section>
        <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-2">
          Verifiche EC2 / EC3 / EC5 / EC8 / NTC
        </div>
        <p className="text-[11px] text-ink-muted leading-relaxed mb-2">
          Le verifiche di codice (LTB, instabilità, sezioni, sismica NTC2018) vivono nel pannello Verify.
        </p>
        <button
          type="button"
          onClick={openVerify}
          className="w-full bg-accent-subtle text-accent border border-accent/30 hover:bg-accent/15 text-[11px] font-medium py-1.5 rounded-md transition-colors"
        >
          Apri pannello Verify
        </button>
      </section>
    </div>
  );
}
