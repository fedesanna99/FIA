/**
 * FatiguePanel — Fatica Rainflow + Miner (FASE 14).
 *
 * Permette 3 modalità di input:
 *  - Manuale (textarea CSV virgole)
 *  - Dynamic results (estrazione da storia nodo)
 *  - Sintetico (sinusoide + rumore)
 *
 * Output: cicli Rainflow, istogramma, damage D, max Δσ.
 */
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import { Play } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { analysisExtApi, type FatigueResponse } from "../../api/analysis_ext";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";

type InputMode = "manual" | "dynamic" | "synthetic";

const EC3_CATEGORIES = [36, 40, 45, 50, 56, 63, 71, 80, 90, 100, 112, 125, 140, 160];

export function FatiguePanel() {
  const model = useModelStore((s) => s.model);
  const { dynamicResults } = useResultsStore();

  const [mode, setMode] = useState<InputMode>("synthetic");
  const [category, setCategory] = useState(80);
  const [gammaMf, setGammaMf] = useState(1.0);

  // Manual
  const [manualCsv, setManualCsv] = useState("100, -100, 50, -50, 75, -25, 90, -90");

  // Dynamic
  const [nodeId, setNodeId] = useState<number | "">("");
  const [component, setComponent] = useState<"ux" | "uy" | "uz" | "ax" | "ay" | "az">("ux");
  const [stressScale, setStressScale] = useState(200);  // E modulus pseudo-scaler

  // Synthetic
  const [nCycles, setNCycles] = useState(1000);
  const [amplitude, setAmplitude] = useState(120);
  const [noise, setNoise] = useState(20);

  const [response, setResponse] = useState<FatigueResponse | null>(null);

  const signal = useMemo(() => buildSignal(mode, {
    manualCsv, dynamicResults, nodeId, component, stressScale,
    nCycles, amplitude, noise,
  }), [mode, manualCsv, dynamicResults, nodeId, component, stressScale, nCycles, amplitude, noise]);

  const mut = useMutation({
    mutationFn: () => {
      if (signal.length < 2) throw new Error("Segnale troppo corto (min 2 punti)");
      return analysisExtApi.fatigue({
        signal,
        ec3_category: category,
        gamma_Mf: gammaMf,
        n_bins: 10,
      });
    },
    onSuccess: (r) => {
      setResponse(r);
      toast(r.damage_D >= 1 ? "warning" : "success",
        `Fatica: D=${r.damage_D.toExponential(2)}, ${r.cycles.length} cicli`);
    },
    onError: (e) => toast("error", `Errore fatica: ${(e as Error).message}`),
  });

  const histogramData = response?.histogram.bins.map((b, i) => ({
    range: `${b.lo.toFixed(0)}-${b.hi.toFixed(0)}`,
    count: response.histogram.counts[i],
  })) ?? [];

  const availableNodes = useMemo(() => {
    if (!dynamicResults?.node_history) return [];
    return Object.keys(dynamicResults.node_history).map(Number).sort((a, b) => a - b);
  }, [dynamicResults]);

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Fatica — Rainflow + Miner (EC3-1-9)"
        description="Conteggio cicli ASTM E1049-85 sul segnale di Δσ + curva S-N a doppia pendenza EC3. D ≥ 1 ⇒ rottura."
      >
        <div className="grid grid-cols-3 gap-1 mb-3">
          {(["manual", "dynamic", "synthetic"] as InputMode[]).map((m) => (
            <button key={m}
              className={`btn text-[10px] py-1 ${mode === m ? "btn-primary" : ""}`}
              onClick={() => setMode(m)}
            >
              {m === "manual" ? "CSV manuale"
                : m === "dynamic" ? "Da dinamica"
                : "Sintetico"}
            </button>
          ))}
        </div>

        {mode === "manual" && (
          <Field label="Segnale (CSV)" hint="Valori di stress separati da virgola">
            <textarea
              className="w-full h-20 text-xs font-mono p-2 rounded bg-bg-elevated border border-border text-ink"
              value={manualCsv} onChange={(e) => setManualCsv(e.target.value)}
            />
          </Field>
        )}

        {mode === "dynamic" && (
          <div className="grid grid-cols-3 gap-2">
            <Field label="Nodo" hint="da storia dinamica">
              <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                      value={nodeId} onChange={(e) => setNodeId(Number(e.target.value) || "")}>
                <option value="">—</option>
                {availableNodes.map((n) => <option key={n} value={n}>#{n}</option>)}
              </select>
            </Field>
            <Field label="Componente" hint="ux/uy/uz/ax/ay/az">
              <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                      value={component} onChange={(e) => setComponent(e.target.value as any)}>
                {["ux", "uy", "uz", "ax", "ay", "az"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Scala σ [MPa/m]" hint="convert disp→stress">
              <NumericInput value={stressScale} onChange={setStressScale} step={10} min={0} />
            </Field>
            {!dynamicResults && (
              <div className="col-span-3 text-[10px] text-warn bg-warn/10 border border-warn/30 rounded px-2 py-1">
                Nessuna analisi dinamica disponibile. Esegui prima un'analisi dinamica/sismica.
              </div>
            )}
          </div>
        )}

        {mode === "synthetic" && (
          <div className="grid grid-cols-3 gap-2">
            <Field label="N° cicli" hint="ampiezza segnale">
              <NumericInput value={nCycles} onChange={setNCycles} step={100} min={2} max={100000} />
            </Field>
            <Field label="Ampiezza [MPa]" hint="">
              <NumericInput value={amplitude} onChange={setAmplitude} step={10} min={1} />
            </Field>
            <Field label="Rumore [MPa]" hint="±σ random">
              <NumericInput value={noise} onChange={setNoise} step={5} min={0} />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
          <Field label="Categoria EC3" hint="EN 1993-1-9 Tab. 8.1">
            <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                    value={category} onChange={(e) => setCategory(Number(e.target.value))}>
              {EC3_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c} MPa</option>
              ))}
            </select>
          </Field>
          <Field label="γ_Mf" hint="Fattore parziale EC3 §3">
            <NumericInput value={gammaMf} onChange={setGammaMf} step={0.05} min={1} max={2} />
          </Field>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button variant="primary" size="sm"
                  iconLeft={<Play className="h-3.5 w-3.5" />}
                  disabled={!model || mut.isPending || signal.length < 2}
                  loading={mut.isPending}
                  onClick={() => mut.mutate()}>
            Calcola fatica
          </Button>
          <Badge size="sm" variant="muted">{signal.length} punti segnale</Badge>
        </div>
      </Card>

      {response && (
        <Card title="Risultati Rainflow + Miner">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat label="Damage D" value={response.damage_D.toExponential(3)}
                  highlight={response.damage_D >= 1 ? "danger" : response.damage_D >= 0.5 ? "warn" : "ok"} />
            <Stat label="Cicli" value={response.n_cycles_total.toFixed(1)} />
            <Stat label="Δσ max [MPa]" value={response.delta_sigma_max.toFixed(1)} />
          </div>
          {histogramData.length > 0 && (
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <ReTooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 11 }} />
                  <Bar dataKey="count" fill="var(--accent)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "ok" | "warn" | "danger" }) {
  const color = highlight === "danger" ? "text-danger"
              : highlight === "warn"   ? "text-warn"
              : "text-ink";
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wide-2 font-semibold text-ink-3">{label}</div>
      <div className={`text-sm font-mono ${color}`}>{value}</div>
    </div>
  );
}

function buildSignal(mode: InputMode, args: {
  manualCsv: string;
  dynamicResults: any;
  nodeId: number | "";
  component: string;
  stressScale: number;
  nCycles: number;
  amplitude: number;
  noise: number;
}): number[] {
  if (mode === "manual") {
    return args.manualCsv
      .split(/[,\s\n]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
  }
  if (mode === "dynamic") {
    if (!args.dynamicResults || !args.nodeId) return [];
    const history = args.dynamicResults.node_history?.[args.nodeId];
    if (!history) return [];
    const raw = history[args.component] ?? [];
    return raw.map((v: number) => v * args.stressScale);
  }
  // synthetic: sinusoide + rumore deterministico (xorshift32 seedato)
  const n = Math.max(2, Math.floor(args.nCycles));
  const sig: number[] = [];
  let s = 0x1234567;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * args.nCycles * 2 * Math.PI;
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >>> 17)) >>> 0;
    s = (s ^ (s << 5))  >>> 0;
    const r = (s / 0xFFFFFFFF - 0.5) * 2 * args.noise;
    sig.push(args.amplitude * Math.sin(t) + r);
  }
  return sig;
}
