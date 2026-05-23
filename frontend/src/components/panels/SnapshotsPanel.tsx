import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { useSnapshotStore } from "../../store/snapshotStore";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { modelHash } from "../../utils/geometry";
import { toast } from "../../store/toastStore";

/**
 * Pannello "Snapshot": permette di salvare i risultati correnti come istantanea
 * etichettata, e confrontarli successivamente (max u, max σ, f₁) in un grafico.
 */
export function SnapshotsPanel() {
  const model = useModelStore((s) => s.model);
  const { staticResults, modalResults } = useResultsStore();
  const snapshots = useSnapshotStore((s) => s.snapshots);
  const take = useSnapshotStore((s) => s.takeSnapshot);
  const remove = useSnapshotStore((s) => s.removeSnapshot);
  const clearAll = useSnapshotStore((s) => s.clearAll);
  const [label, setLabel] = useState("");

  const canSnapshot = !!(model && (staticResults || modalResults));

  const handleTake = () => {
    if (!model) return;
    const lbl = label.trim() || `${model.name} · ${new Date().toLocaleTimeString("it-IT", { hour12: false })}`;
    take(lbl, model.id, model.name, modelHash(model), staticResults, modalResults);
    setLabel("");
    toast("success", `Snapshot "${lbl}" salvato`);
  };

  const chartData = useMemo(() => snapshots.map((s) => ({
    name: s.label.length > 22 ? s.label.slice(0, 19) + "…" : s.label,
    maxU_mm: s.staticResults ? Number((s.staticResults.max_displacement * 1000).toFixed(4)) : null,
    maxStress_MPa: s.staticResults ? Number((s.staticResults.max_stress / 1e6).toFixed(3)) : null,
    f1_Hz: s.modalResults?.modes[0] ? Number(s.modalResults.modes[0].frequency_hz.toFixed(4)) : null,
  })), [snapshots]);

  return (
    <div className="p-3 space-y-3 text-xs">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Etichetta (opzionale)..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleTake(); }}
        />
        <button className="btn btn-primary" disabled={!canSnapshot} onClick={handleTake} title="Salva snapshot dei risultati correnti">
          📸 Snapshot
        </button>
      </div>
      {!canSnapshot && (
        <div className="text-ink-3 text-[10px]">
          Esegui un'analisi (statica/modale) per abilitare gli snapshot.
        </div>
      )}

      {snapshots.length > 0 && (
        <>
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase text-ink-3">Snapshot salvati ({snapshots.length})</span>
              <button className="text-[10px] text-accent-danger hover:underline" onClick={clearAll}>
                cancella tutti
              </button>
            </div>
            <div className="divide-y divide-border max-h-[140px] overflow-auto numeric">
              {snapshots.map((s) => {
                const hashMatchesCurrent = model && s.modelHash === modelHash(model);
                return (
                  <div key={s.id} className="group flex items-center justify-between py-1 px-1 hover:bg-bg-hover">
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-ink">{s.label}</div>
                      <div className="text-[10px] text-ink-3">
                        {s.modelName}
                        {!hashMatchesCurrent && <span className="text-accent-warning"> · modello diverso</span>}
                      </div>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-accent-danger hover:bg-accent-danger/20 px-1.5 rounded"
                      onClick={() => remove(s.id)}
                      title="Elimina snapshot"
                    >×</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border pt-2">
            <div className="text-[10px] uppercase text-ink-3 mb-1">Max spostamento [mm]</div>
            <ChartBlock data={chartData} dataKey="maxU_mm" color="#00d4ff" />
            <div className="text-[10px] uppercase text-ink-3 mb-1 mt-3">Max tensione σ [MPa]</div>
            <ChartBlock data={chartData} dataKey="maxStress_MPa" color="#ffaa00" />
            <div className="text-[10px] uppercase text-ink-3 mb-1 mt-3">Frequenza f₁ [Hz]</div>
            <ChartBlock data={chartData} dataKey="f1_Hz" color="#ff66cc" />
          </div>
        </>
      )}
    </div>
  );
}

function ChartBlock({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) {
  const filtered = data.filter((d) => d[dataKey] != null);
  if (filtered.length === 0) {
    return <div className="text-ink-3 text-[10px]">— nessun dato</div>;
  }
  return (
    <div style={{ width: "100%", height: 140 }}>
      <ResponsiveContainer>
        <BarChart data={filtered} margin={{ top: 2, right: 2, left: -10, bottom: 2 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#2a3040" />
          <XAxis dataKey="name" stroke="#8a92a5" fontSize={9} angle={-25} dy={6} height={36} />
          <YAxis stroke="#8a92a5" fontSize={9} />
          <Tooltip contentStyle={{ background: "#0f1219", border: "1px solid #2a3040", fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey={dataKey} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
