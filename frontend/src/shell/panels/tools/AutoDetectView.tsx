import { useQuery } from "@tanstack/react-query";
import { Bug, CheckCircle2, RefreshCw } from "lucide-react";
import { autoDetectApi, type AutoDetectIssue } from "../../../api/autodetect";
import { useModelStore } from "../../../store/modelStore";

const LEVEL_CLASS: Record<AutoDetectIssue["level"], string> = {
  info: "text-accent bg-bg-info border-info/30",
  warning: "text-warn bg-bg-warn border-warn/30",
  error: "text-danger bg-danger/10 border-danger/30",
};

const CODE_LABEL: Record<AutoDetectIssue["code"], string> = {
  DUPLICATE_ELEMENTS: "Elementi duplicati",
  COINCIDENT_NODES: "Nodi coincidenti",
  ORPHAN_LOADS: "Carichi orfani",
  MISSING_SECTION: "Sezione mancante",
  WINKLER_JUMP: "Salto Winkler",
};

export function AutoDetectView() {
  const model = useModelStore((s) => s.model);
  const selectNode = useModelStore((s) => s.selectNode);
  const selectElement = useModelStore((s) => s.selectElement);

  const query = useQuery({
    queryKey: ["auto-detect", model?.id],
    queryFn: () => autoDetectApi.run(model!.id),
    enabled: false,
  });

  const focusIssue = (issue: AutoDetectIssue) => {
    const firstId = issue.entity_ids?.[0];
    if (firstId == null) return;
    if (issue.entity_type === "node") selectNode(firstId, false);
    if (issue.entity_type === "element") selectElement(firstId, false);
  };

  if (!model) {
    return (
      <div className="p-4 text-xs text-ink-3">
        Carica o crea un modello per eseguire la diagnostica automatica.
      </div>
    );
  }

  const report = query.data;
  const ok = report && report.n_issues === 0;

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      <section className="border border-border rounded-md bg-bg-panel p-3">
        <div className="flex items-start gap-2.5">
          <Bug className="w-4 h-4 text-purple mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-ink">Auto-detect modello</div>
            <p className="text-[11px] text-ink-3 leading-relaxed mt-0.5">
              Cerca duplicati, nodi coincidenti, carichi orfani, sezioni mancanti
              e salti improvvisi di rigidezza Winkler.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          data-testid="tools-auto-detect-run"
          className="w-full mt-3 bg-bg-purple text-purple border border-purple/30 hover:bg-purple/15 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-medium py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${query.isFetching ? "animate-spin" : ""}`} />
          {query.isFetching ? "Diagnostica..." : "Esegui auto-detect"}
        </button>
      </section>

      {query.isError && (
        <div className="border border-danger/30 bg-danger/10 text-danger rounded-md p-2.5 text-[11px]">
          Auto-detect non riuscito: {(query.error as Error).message}
        </div>
      )}

      {ok && (
        <div className="border border-success/30 bg-bg-success text-success rounded-md p-3 flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4" />
          Nessun problema rilevato sul modello.
        </div>
      )}

      {report && report.n_issues > 0 && (
        <section className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">
            Issue rilevate ({report.n_issues})
          </div>
          {report.issues.map((issue, idx) => {
            const canFocus = issue.entity_type === "node" || issue.entity_type === "element";
            return (
              <button
                key={`${issue.code}-${idx}`}
                type="button"
                onClick={() => canFocus && focusIssue(issue)}
                disabled={!canFocus}
                className="w-full text-left border border-border bg-bg-panel rounded-md p-2.5 hover:border-accent/40 disabled:hover:border-border disabled:cursor-default transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className={`text-[9px] font-mono border rounded px-1.5 py-0.5 ${LEVEL_CLASS[issue.level]}`}>
                    {issue.level.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-ink">
                      {CODE_LABEL[issue.code] ?? issue.code}
                    </div>
                    <p className="text-[11px] text-ink-3 leading-snug mt-0.5">
                      {issue.message}
                    </p>
                    <p className="text-[10px] text-ink-3 leading-snug mt-1">
                      Fix suggerito: {issue.suggested_fix}
                    </p>
                    {issue.entity_ids?.length > 0 && (
                      <div className="text-[10px] text-accent font-mono mt-1">
                        {issue.entity_type ?? "entity"} #{issue.entity_ids.join(", #")}
                        {canFocus && " - seleziona"}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
