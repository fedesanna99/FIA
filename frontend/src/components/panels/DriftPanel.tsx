/**
 * DriftPanel — interstory drift da risultati dinamici/sismici (FASE 12).
 *
 * Input: lista node_id ordinata dal basso verso l'alto + asse + h_storey.
 * Output: storia drift per piano, max per piano, drift ratio.
 *
 * Soglie EC8 SLE: drift/h_storey ≤ 0.5% (edifici crollabili) ÷ 1% (gas/elettrico).
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from "recharts";
import { Calculator } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { postprocessApi, type DriftResponse } from "../../api/postprocess";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, Input, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";

const CHART_COLORS = ["#3B82F6", "#F59E0B", "#22C55E", "#A855F7", "#EF4444", "#06B6D4"];

export function DriftPanel() {
  const model = useModelStore((s) => s.model);
  const [levelsText, setLevelsText] = useState("1, 5, 9, 13");
  const [axis, setAxis] = useState<"ux" | "uy" | "uz">("ux");
  const [hStorey, setHStorey] = useState<number | "">(3.0);
  const [analysisType, setAnalysisType] = useState<"dynamic" | "seismic_th">("seismic_th");
  const [result, setResult] = useState<DriftResponse | null>(null);

  const mut = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello");
      const levels = levelsText.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
      if (levels.length < 2) throw new Error("Servono almeno 2 nodi-piano");
      return postprocessApi.drift(model.id, {
        levels, axis,
        h_storey: hStorey === "" ? null : Number(hStorey),
        analysis_type: analysisType,
      });
    },
    onSuccess: (r) => {
      setResult(r);
      toast("success", `Drift calcolato per ${Object.keys(r.max_drift_per_storey).length} piani`);
    },
    onError: (e) => toast("error", `Errore drift: ${(e as Error).message}`),
  });

  // Per il chart: trasponi history {storey: [t]} in [{ t, storey_1, storey_2, ... }]
  const chartData = (() => {
    if (!result) return [];
    const storeys = Object.keys(result.history).map(Number);
    if (storeys.length === 0) return [];
    const len = result.history[storeys[0]].length;
    const out: any[] = [];
    for (let i = 0; i < len; i++) {
      const row: any = { idx: i };
      for (const s of storeys) row[`piano_${s}`] = result.history[s][i];
      out.push(row);
    }
    return out;
  })();

  const ratioWarn = result?.drift_ratios && Object.values(result.drift_ratios).some((r) => Math.abs(r) > 0.01);

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Interstory drift (EC8 §4.4.3)"
        description="Spostamento relativo tra piani consecutivi. Soglie tipiche: ≤ 0.5% h per contenuto fragile, ≤ 1% h per duttile."
      >
        <div className="space-y-2">
          <Field label="Nodi-piano (CSV, base → top)" hint="Ordine dal piano terra al piano più alto">
            <Input value={levelsText} onChange={(e) => setLevelsText(e.target.value)}
                   placeholder="es. 1, 5, 9, 13" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Asse" hint="Direzione drift">
              <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                      value={axis} onChange={(e) => setAxis(e.target.value as any)}>
                <option value="ux">uₓ</option>
                <option value="uy">uᵧ</option>
                <option value="uz">u_z</option>
              </select>
            </Field>
            <Field label="h piano [m]" hint="opzionale, per ratio">
              <NumericInput value={hStorey} step={0.1} min={0.1}
                            onChange={(v) => setHStorey(v)} />
            </Field>
            <Field label="Da analisi" hint="risultati in storage">
              <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                      value={analysisType} onChange={(e) => setAnalysisType(e.target.value as any)}>
                <option value="dynamic">Dinamica</option>
                <option value="seismic_th">Sismica TH</option>
              </select>
            </Field>
          </div>
        </div>
        <div className="mt-3">
          <Button variant="primary" size="sm" iconLeft={<Calculator className="h-3.5 w-3.5" />}
                  disabled={!model || mut.isPending} loading={mut.isPending}
                  onClick={() => mut.mutate()}>
            Calcola drift
          </Button>
        </div>
      </Card>

      {result && (
        <>
          {chartData.length > 0 && (
            <Card title="Storia temporale del drift per piano">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: "drift [m]", angle: -90, position: "insideLeft", fontSize: 10 }} />
                    <ReTooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 11 }}
                               formatter={(v: any) => Number(v).toExponential(2)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {Object.keys(result.history).map((s, i) => (
                      <Line key={s} type="monotone" dataKey={`piano_${s}`}
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={1.5} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card title="Riassunto max drift per piano">
            <div className="space-y-1">
              {Object.entries(result.max_drift_per_storey).map(([s, v]) => {
                const r = result.drift_ratios?.[Number(s)];
                const exceeds = r != null && Math.abs(r) > 0.01;
                return (
                  <div key={s} className="flex items-center justify-between text-xs">
                    <span className="text-ink-dim">Piano {s}</span>
                    <span className="font-mono">{(v * 1000).toFixed(2)} mm</span>
                    {r != null && (
                      <Badge size="sm" variant={exceeds ? "danger" : "success"}>
                        {(r * 100).toFixed(3)}%
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            {ratioWarn && (
              <div className="mt-2 text-[10px] text-warn bg-warn/10 border border-warn/30 rounded px-2 py-1">
                Drift ratio &gt; 1% h_storey: superato soglia EC8 SLD/SLO.
              </div>
            )}
          </Card>
        </>
      )}

      {!result && !mut.isPending && (
        <EmptyState
          title="Nessun calcolo drift"
          description="Configura i nodi-piano e premi 'Calcola drift'. Richiede risultati dinamici / sismici TH."
        />
      )}
    </div>
  );
}
