/**
 * AccelerogramsPanel — catalogo PEER/ESM + generatore sintetici (FASE 13).
 *
 * UX:
 *  - Lista catalogo con metadata (PGA, durata, source)
 *  - Click → caricamento time-history → plot a(t) recharts
 *  - Sezione "Sintetico" → form Kanai-Tajimi / Boore + plot
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import { Waves, Download } from "lucide-react";
import {
  accelerogramsApi,
  type AccelerogramData,
  type SyntheticAccelOptions,
} from "../../api/io";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";

export function AccelerogramsPanel() {
  const { data: catalog, isLoading } = useQuery({
    queryKey: ["accelerograms"],
    queryFn: () => accelerogramsApi.list(),
  });

  const [selected, setSelected] = useState<AccelerogramData | null>(null);

  const loadMut = useMutation({
    mutationFn: (filename: string) => accelerogramsApi.get(filename),
    onSuccess: (data) => {
      setSelected(data);
      toast("success", `${data.name}: ${data.npts} punti @ dt=${data.dt}s`);
    },
    onError: (e) => toast("error", `Errore download: ${(e as Error).message}`),
  });

  // Sintetico
  const [alg, setAlg] = useState<"kanai_tajimi" | "boore">("kanai_tajimi");
  const [dur, setDur] = useState(20);
  const [dt, setDt] = useState(0.01);
  const [pga, setPga] = useState(3.5);
  const [seed, setSeed] = useState(42);

  const synthMut = useMutation({
    mutationFn: (opts: SyntheticAccelOptions) => accelerogramsApi.synthetic(opts),
    onSuccess: (data) => {
      setSelected(data);
      toast("success", `Sintetico ${alg} generato: ${data.npts} punti`);
    },
    onError: (e) => toast("error", `Errore sintetico: ${(e as Error).message}`),
  });

  // Plot
  const chartData = selected
    ? selected.time_history.map(([t, a]) => ({ t, a }))
    : [];
  // Downsample per performance
  const sampled = chartData.length > 800
    ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 800) === 0)
    : chartData;

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Catalogo accelerogrammi"
        description="PEER NGA · ESM · sintetici (FASE 13). Click sul nome per caricare la time-history."
      >
        {isLoading && <div className="text-xs text-ink-dim">Caricamento catalogo…</div>}
        {catalog && catalog.length === 0 && (
          <div className="text-xs text-ink-dim">Catalogo vuoto. Aggiungi file PEER in <code>backend/data/accelerograms/</code></div>
        )}
        <div className="space-y-1 max-h-48 overflow-auto">
          {catalog?.map((a) => (
            <button
              key={a.filename}
              className="w-full text-left p-1.5 rounded border border-border bg-bg/40 hover:bg-bg-hover hover:border-accent/50 transition-colors disabled:opacity-50"
              disabled={loadMut.isPending}
              onClick={() => loadMut.mutate(a.filename)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">{a.name}</span>
                <Badge size="sm" variant="muted">{a.source}</Badge>
              </div>
              <div className="text-[10px] text-ink-dim font-mono mt-0.5">
                PGA {a.pga_m_s2.toFixed(2)} m/s² · {a.duration_s.toFixed(1)} s · dt={a.dt}s
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Generatore sintetico" description="Kanai-Tajimi (white-noise filtrato) o Boore stocastico + envelope Saragoni-Hart.">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Algoritmo">
            <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                    value={alg} onChange={(e) => setAlg(e.target.value as "kanai_tajimi" | "boore")}>
              <option value="kanai_tajimi">Kanai-Tajimi</option>
              <option value="boore">Boore</option>
            </select>
          </Field>
          <Field label="Seed" hint="riproducibilità">
            <NumericInput value={seed} step={1} onChange={setSeed} />
          </Field>
          <Field label="Durata [s]"><NumericInput value={dur} step={1} min={0.1} onChange={setDur} /></Field>
          <Field label="dt [s]"><NumericInput value={dt} step={0.001} min={1e-4} onChange={setDt} /></Field>
          <Field label="PGA target [m/s²]"><NumericInput value={pga} step={0.1} min={0.01} onChange={setPga} /></Field>
        </div>
        <div className="mt-3">
          <Button variant="primary" size="sm"
                  iconLeft={<Waves className="h-3.5 w-3.5" />}
                  loading={synthMut.isPending}
                  onClick={() => synthMut.mutate({
                    algorithm: alg, duration: dur, dt, pga_target: pga, seed,
                  })}>
            Genera sintetico
          </Button>
        </div>
      </Card>

      {selected && (
        <Card title={selected.name} description={`PGA ${selected.pga_m_s2.toFixed(2)} m/s² · ${selected.duration_s.toFixed(1)} s · ${selected.npts} pts`}>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sampled} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} label={{ value: "t [s]", position: "insideBottom", offset: -2, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: "a [m/s²]", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <ReTooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 11 }}
                           formatter={(v: any) => Number(v).toFixed(3)} />
                <Line type="monotone" dataKey="a" stroke="var(--accent)" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Button variant="ghost" size="xs" iconLeft={<Download className="h-3 w-3" />} className="mt-2"
                  onClick={() => {
                    const csv = "t,a\n" + selected.time_history.map(([t, a]) => `${t},${a}`).join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = `${selected.name.replace(/\s+/g, "_")}.csv`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                  }}>
            Scarica CSV
          </Button>
        </Card>
      )}
    </div>
  );
}
