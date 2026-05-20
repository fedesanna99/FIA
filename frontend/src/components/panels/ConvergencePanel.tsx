/**
 * ConvergencePanel — analisi di convergenza Richardson + GCI (FASE 19).
 *
 * L'utente inserisce una sequenza di valori q(h), q(h/r), q(h/r²)… (es. freccia
 * massima a mesh progressivamente più fini). Il backend calcola ordine apparente,
 * estrapolazione Richardson, Grid Convergence Index Roache/ASME.
 *
 * Per p=2 (Bernoulli/CST/Q4): order≈2 e GCI<5% indicano convergenza accettabile.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";
import { postprocessApi, type ConvergenceResponse } from "../../api/postprocess";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, Input, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";

export function ConvergencePanel() {
  const [valuesText, setValuesText] = useState("0.0150, 0.0142, 0.0140, 0.01395");
  const [ratio, setRatio] = useState(2.0);
  const [fs, setFs] = useState(1.25);
  const [result, setResult] = useState<ConvergenceResponse | null>(null);

  const mut = useMutation({
    mutationFn: () => {
      const values = valuesText.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
      if (values.length < 2) throw new Error("Servono almeno 2 valori (3+ raccomandati)");
      return postprocessApi.convergence({ values, ratio, fs });
    },
    onSuccess: (r) => {
      setResult(r);
      const orderOk = r.apparent_order > 1 && r.apparent_order < 4;
      toast(orderOk ? "success" : "warning",
        `Order≈${r.apparent_order.toFixed(2)}, GCI=${(r.gci_fine * 100).toFixed(2)}%`);
    },
    onError: (e) => toast("error", `Errore convergence: ${(e as Error).message}`),
  });

  const chartData = result
    ? result.values.map((v, i) => ({
        idx: i,
        value: v,
        ext: i === result.values.length - 1 ? result.extrapolated_value : null,
      }))
    : [];

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Convergence checker (h-refinement)"
        description="Richardson extrapolation + GCI ASME V&V20 da serie di simulazioni a mesh progressivamente più fini."
      >
        <Field label="Valori q(h), q(h/r), ..." hint="CSV — almeno 2, 3+ raccomandati">
          <Input value={valuesText} onChange={(e) => setValuesText(e.target.value)}
                 placeholder="es. 0.0150, 0.0142, 0.0140, 0.01395" />
        </Field>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Field label="Rapporto r" hint="Fattore rifinitura (2 = dim h dimezzato)">
            <NumericInput value={ratio} step={0.5} min={1.1} max={10} onChange={setRatio} />
          </Field>
          <Field label="fs (safety)" hint="1.25 per ≥3 mesh, 3.0 per 2">
            <NumericInput value={fs} step={0.05} min={1} max={5} onChange={setFs} />
          </Field>
        </div>
        <div className="mt-3">
          <Button variant="primary" size="sm" iconLeft={<TrendingUp className="h-3.5 w-3.5" />}
                  loading={mut.isPending} onClick={() => mut.mutate()}>
            Analizza convergenza
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card title="Risultati Richardson + GCI">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Ordine apparente" value={result.apparent_order.toFixed(3)}
                    badge={Math.abs(result.apparent_order - 2) < 0.5 ? "OK p≈2" : "anomalo"} />
              <Stat label="GCI fine" value={`${(result.gci_fine * 100).toFixed(3)}%`}
                    badge={result.gci_fine < 0.05 ? "convergente" : "verifica"} />
              <Stat label="q estrapolato" value={result.extrapolated_value.toExponential(4)} />
              <Stat label="Monotonia" value={result.is_monotonic ? "Sì" : "No"}
                    badge={result.is_monotonic ? "ok" : "non monot."} />
            </div>
          </Card>

          {chartData.length > 1 && (
            <Card title="Andamento q vs mesh">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="idx" tick={{ fontSize: 10 }} label={{ value: "mesh #", position: "insideBottom", offset: -2, fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <ReTooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 11 }} />
                    <ReferenceLine y={result.extrapolated_value} stroke="var(--success)"
                                   strokeDasharray="4 4" label={{ value: "q ext", fontSize: 9, fill: "var(--success)" }} />
                    <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ink-dim">{label}</div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-sm font-mono text-ink">{value}</span>
        {badge && <Badge size="sm" variant="muted">{badge}</Badge>}
      </div>
    </div>
  );
}
