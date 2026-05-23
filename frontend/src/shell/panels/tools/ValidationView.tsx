/**
 * ValidationView (v1.5 Task 28 · v2.1.9 audit-fix B3 wired).
 *
 * Sub-view del Tools hub: validation panel.
 *
 * v2.1.9 (audit-fix): rimossa la lista hardcoded di 3 benchmark NAFEMS che
 * mostrava sempre "PASS" senza chiamare il backend. Ora fetcha
 * `/api/validation/report.json` e mostra lo stato reale (5 benchmark al
 * deploy attuale: NAFEMS LE1/LE2 + Analytical cantilever / simply-supported
 * / Euler buckling). Summary live "n_passed/n_total" + error_pct per ogni
 * voce + link al report HTML completo.
 */
import { ShieldCheck, ExternalLink, FileText, RefreshCw, Check, X as XIcon, Loader2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { validationApi, type BenchmarkResult } from "../../../api/validation";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useLeftRailStore } from "../../../store/leftRailStore";
import { cn } from "../../../components/ui/cn";


export function ValidationView() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["validation-report"],
    queryFn: () => validationApi.getReport(),
    staleTime: 60 * 60_000, // 1h come il TTL backend
    retry: 1,
  });

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
          <ShieldCheck className="w-3.5 h-3.5 text-purple" />
          <h3 className="text-xs font-semibold text-ink">Benchmark numerici</h3>
        </div>
        <p className="text-[11px] text-ink-3 leading-relaxed mb-2">
          Test di validazione del solver contro benchmark NAFEMS e soluzioni
          analitiche note (cantilever, simply-supported, Euler buckling).
          Verifica accuratezza del FEM su problemi con soluzione esatta.
        </p>

        {/* Summary live */}
        {isLoading && (
          <div className="flex items-center gap-2 text-[11px] text-ink-3 px-2 py-2 bg-bg-panel border border-border">
            <Loader2 className="w-3 h-3 animate-spin" />
            Esecuzione benchmark in corso…
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-2 text-[11px] text-warn px-2.5 py-2 bg-bg-warn border border-warn/30">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div>
              Report non disponibile (backend irraggiungibile).
              <button onClick={() => refetch()} className="ml-1 underline hover:text-ink">
                Riprova
              </button>
            </div>
          </div>
        )}

        {data && (
          <SummaryBar n_passed={data.n_passed} n_total={data.n_total} generated_at={data.generated_at} />
        )}

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={openReport}
            data-testid="tools-validation-report"
            className="flex-1 bg-bg-purple text-purple border border-purple/30 hover:bg-purple/15 text-[11px] font-medium py-1.5 transition-colors flex items-center justify-center gap-1.5"
          >
            <FileText className="w-3 h-3" />
            Apri report HTML
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Ricarica"
            className="px-2 border border-border bg-bg-panel text-ink-3 hover:text-ink hover:bg-bg-hover disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
          </button>
        </div>
      </section>

      {/* Lista dinamica benchmark */}
      {data && data.results.length > 0 && (
        <section>
          <div className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Test eseguiti ({data.n_total})
          </div>
          <div className="space-y-1" data-testid="validation-results-list">
            {data.results.map((r) => (
              <BenchmarkRow key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}

      <div className="border-t border-border" />

      <section>
        <div className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-2">
          Verifiche EC2 / EC3 / EC5 / EC8 / NTC
        </div>
        <p className="text-[11px] text-ink-3 leading-relaxed mb-2">
          Le verifiche di codice (LTB, instabilità, sezioni, sismica NTC2018) vivono nel pannello Verify.
        </p>
        <button
          type="button"
          onClick={openVerify}
          className="w-full bg-accent-subtle text-accent border border-accent/30 hover:bg-accent/15 text-[11px] font-medium py-1.5 transition-colors"
        >
          Apri pannello Verify
        </button>
      </section>
    </div>
  );
}


function SummaryBar({ n_passed, n_total, generated_at }: { n_passed: number; n_total: number; generated_at: number }) {
  const allPass = n_passed === n_total;
  const date = new Date(generated_at * 1000);
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 border text-[11px]",
        allPass
          ? "bg-bg-success border-success/30 text-success"
          : "bg-bg-warn border-warn/30 text-warn",
      )}
      data-testid="validation-summary"
    >
      <span className="font-mono font-semibold tabular-nums">{n_passed}/{n_total}</span>
      <span className="text-ink-2">benchmark passati</span>
      <span className="ml-auto text-ink-3 text-[10px] font-mono">
        {date.toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}


function BenchmarkRow({ r }: { r: BenchmarkResult }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-2 py-1.5 bg-bg-panel border",
        r.passed ? "border-border" : "border-warn/40",
      )}
      data-testid={`validation-row-${r.id}`}
    >
      <span
        className={cn(
          "w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5",
          r.passed ? "bg-success text-white" : "bg-coral text-white",
        )}
      >
        {r.passed ? <Check className="w-2.5 h-2.5" /> : <XIcon className="w-2.5 h-2.5" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-ink truncate font-medium">
          <span className="font-mono text-[10px] text-ink-3 mr-1.5 uppercase">{r.family}</span>
          {r.id}
        </div>
        <div className="text-[10px] text-ink-3 leading-snug truncate" title={r.description}>
          {r.description}
        </div>
        <div className="text-[10px] font-mono text-ink-3 mt-0.5 flex gap-2">
          <span>err <span className={cn("font-semibold tabular-nums", r.passed ? "text-success" : "text-coral")}>{r.error_pct.toFixed(2)}%</span></span>
          <span>tol {r.tolerance_pct.toFixed(1)}%</span>
        </div>
      </div>
      <span
        className={cn(
          "text-[10px] font-mono px-1.5 py-0.5 border font-semibold leading-none flex-shrink-0",
          r.passed
            ? "bg-bg-success text-success border-success/30"
            : "bg-bg-danger text-coral border-coral/30",
        )}
      >
        {r.passed ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}
