import { useState } from "react";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { DisplacementTable } from "./DisplacementTable";
import { FrequencyChart } from "./FrequencyChart";
import { TimeHistoryPlot } from "./TimeHistoryPlot";
import { StressDiagram } from "./StressDiagram";
import { FFTChart } from "./FFTChart";
import { BucklingPanel } from "./BucklingPanel";
import { ResponseSpectrumPanel } from "./ResponseSpectrumPanel";

export function ResultsPanel() {
  const { staticResults, modalResults, dynamicResults } = useResultsStore();
  const analysisType = useAnalysisStore((s) => s.analysisType);
  const [tab, setTab] = useState<"summary" | "table" | "chart">("summary");

  if (!staticResults && !modalResults && !dynamicResults) {
    return (
      <div className="p-4 text-xs text-ink-dim leading-relaxed">
        <div className="font-semibold text-ink mb-2">Nessun risultato</div>
        Esegui un'analisi dalla toolbar per visualizzare qui i risultati.
      </div>
    );
  }

  const r = analysisType === "static" ? staticResults
          : analysisType === "modal" ? modalResults
          : dynamicResults;

  return (
    <div className="text-xs">
      <div className="flex border-b border-border bg-bg">
        {(["summary", "table", "chart"] as const).map((t) => (
          <button
            key={t}
            className={`flex-1 px-2 py-1.5 transition ${
              tab === t ? "text-accent-primary bg-bg-panel" : "text-ink-muted hover:text-ink"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "summary" ? "Sommario" : t === "table" ? "Tabella" : "Grafico"}
          </button>
        ))}
      </div>

      <div className="p-3">
        {tab === "summary" && r && <Summary />}
        {tab === "table" && analysisType === "static" && staticResults && <DisplacementTable />}
        {tab === "table" && analysisType === "modal" && modalResults && <ModalTable />}
        {tab === "table" && analysisType === "dynamic" && dynamicResults && (
          <div className="text-ink-dim">Vedi grafico per la storia temporale.</div>
        )}
        {tab === "chart" && analysisType === "static" && staticResults && <StressDiagram />}
        {tab === "chart" && analysisType === "modal" && modalResults && <FrequencyChart />}
        {tab === "chart" && analysisType === "dynamic" && dynamicResults && (
          <div className="space-y-4">
            <TimeHistoryPlot />
            <div className="border-t border-border pt-3">
              <div className="text-[10px] uppercase text-ink-muted mb-2">FFT della risposta</div>
              <FFTChart />
            </div>
            <div className="border-t border-border pt-3">
              <div className="text-[10px] uppercase text-ink-muted mb-2">Spettro di risposta sismica</div>
              <ResponseSpectrumPanel />
            </div>
          </div>
        )}
        {analysisType === "buckling" && <BucklingPanel />}
      </div>
    </div>
  );
}

function Summary() {
  const { staticResults, modalResults, dynamicResults } = useResultsStore();
  const analysisType = useAnalysisStore((s) => s.analysisType);

  if (analysisType === "static" && staticResults) {
    return (
      <div className="space-y-2 numeric">
        <Row k="GdL totali" v={staticResults.n_dofs.toString()} />
        <Row k="Max spostamento" v={`${(staticResults.max_displacement * 1000).toFixed(4)} mm`} accent />
        <Row k="Max tensione σ" v={`${(staticResults.max_stress / 1e6).toFixed(2)} MPa`} accent />
        <Row k="N. reazioni" v={staticResults.reactions.length.toString()} />
        <Row k="Tempo solver" v={`${staticResults.solve_time_ms.toFixed(1)} ms`} />
      </div>
    );
  }
  if (analysisType === "modal" && modalResults) {
    const f1 = modalResults.modes[0]?.frequency_hz ?? 0;
    return (
      <div className="space-y-2 numeric">
        <Row k="N. modi calcolati" v={modalResults.n_modes.toString()} />
        <Row k="f₁ (1° modo)" v={`${f1.toFixed(4)} Hz`} accent />
        <Row k="T₁ (periodo 1°)" v={`${(f1 > 0 ? 1 / f1 : 0).toFixed(4)} s`} accent />
        <Row k="Massa totale" v={`${(modalResults.total_mass).toFixed(1)} kg`} />
        <Row k="Tempo solver" v={`${modalResults.solve_time_ms.toFixed(1)} ms`} />
      </div>
    );
  }
  if (analysisType === "dynamic" && dynamicResults) {
    return (
      <div className="space-y-2 numeric">
        <Row k="Δt" v={`${dynamicResults.dt} s`} />
        <Row k="N. step" v={dynamicResults.n_steps.toString()} />
        <Row k="t_end" v={`${(dynamicResults.dt * dynamicResults.n_steps).toFixed(2)} s`} />
        <Row k="Max |u|" v={`${(dynamicResults.max_displacement * 1000).toFixed(4)} mm`} accent />
        <Row k="Su nodo" v={`#${dynamicResults.max_displacement_node}`} />
        <Row k="All'istante" v={`${dynamicResults.max_displacement_time.toFixed(3)} s`} />
        <Row k="Tempo solver" v={`${dynamicResults.solve_time_ms.toFixed(1)} ms`} />
      </div>
    );
  }
  return null;
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{k}</span>
      <span className={accent ? "text-accent-primary" : "text-ink"}>{v}</span>
    </div>
  );
}

function ModalTable() {
  const modal = useResultsStore((s) => s.modalResults)!;
  return (
    <div className="numeric text-[11px]">
      <div className="grid grid-cols-4 gap-1 text-ink-muted uppercase text-[10px] border-b border-border pb-1 mb-1">
        <span>Modo</span><span>f [Hz]</span><span>T [s]</span><span>Mₓ_eff</span>
      </div>
      {modal.modes.map((m) => (
        <div key={m.mode} className="grid grid-cols-4 gap-1 py-0.5 hover:bg-bg-hover">
          <span>{m.mode}</span>
          <span className="text-accent-primary">{m.frequency_hz.toFixed(4)}</span>
          <span>{m.period.toFixed(4)}</span>
          <span className="text-ink-dim">{m.effective_mass_x.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
