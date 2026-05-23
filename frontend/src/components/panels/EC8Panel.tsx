/**
 * EC8Panel — sismica (EN 1998-1 / NTC 2018).
 *
 * 2 sotto-tab:
 *  - Spettro (elastico Se(T) + design Sd(T) con q)
 *  - q-factor (calcolo fattore di struttura)
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from "recharts";
import { Calculator } from "lucide-react";
import {
  verifyExtApi,
  type EC8SpectrumResponse, type EC8QResponse,
  type StructuralSystemId, type DuctilityClass,
} from "../../api/verify_ext";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";

type SubTab = "spectrum" | "qfactor";

const SYSTEMS: { id: StructuralSystemId; label: string }[] = [
  { id: "frame_concrete",         label: "Telaio CA" },
  { id: "wall_concrete",          label: "Pareti CA" },
  { id: "frame_steel",            label: "Telaio acciaio" },
  { id: "concentric_braced_steel", label: "Acciaio controv. concentrici" },
  { id: "eccentric_braced_steel",  label: "Acciaio controv. eccentrici" },
  { id: "frame_timber",            label: "Telaio legno" },
];

export function EC8Panel() {
  const [sub, setSub] = useState<SubTab>("spectrum");

  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-1">
        {(["spectrum", "qfactor"] as SubTab[]).map((s) => (
          <button key={s}
            className={`btn text-[11px] py-1 ${sub === s ? "btn-primary" : ""}`}
            onClick={() => setSub(s)}>
            {s === "spectrum" ? "Spettro EC8" : "Fattore q"}
          </button>
        ))}
      </div>
      {sub === "spectrum" ? <SpectrumForm /> : <QFactorForm />}
    </div>
  );
}

function SpectrumForm() {
  const [type, setType] = useState<"1" | "2">("1");
  const [ground, setGround] = useState<"A" | "B" | "C" | "D" | "E">("C");
  const [ag, setAg] = useState(0.25);   // [g] PGA in g, convertita in m/s²
  const [xi, setXi] = useState(5);
  const [useQ, setUseQ] = useState(true);
  const [q, setQ] = useState(3.0);
  const [r, setR] = useState<EC8SpectrumResponse | null>(null);

  const mut = useMutation({
    mutationFn: () => verifyExtApi.ec8Spectrum({
      spectrum_type: type, ground, a_g: ag * 9.81,
      xi_pct: xi, T_min: 0, T_max: 4, n_points: 200,
      q: useQ ? q : null,
    }),
    onSuccess: (resp) => {
      setR(resp);
      toast("success", `Spettro EC8 tipo ${type}, suolo ${ground} calcolato`);
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  const chartData = r
    ? r.T.map((T, i) => ({
        T,
        Se: r.Se[i],
        Sd: r.Sd?.[i],
      }))
    : [];

  return (
    <Card title="Spettro elastico EC8 §3.2.2"
          description="S_e(T) per suolo A–E, tipo sismico 1 (Ms>5.5) o 2. Spettro di progetto S_d(T) richiede q ≥ 1.5.">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tipo spettro">
          <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                  value={type} onChange={(e) => setType(e.target.value as "1" | "2")}>
            <option value="1">Tipo 1 (Ms &gt; 5.5)</option>
            <option value="2">Tipo 2 (Ms ≤ 5.5)</option>
          </select>
        </Field>
        <Field label="Suolo">
          <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                  value={ground} onChange={(e) => setGround(e.target.value as any)}>
            {(["A", "B", "C", "D", "E"] as const).map((g) => (
              <option key={g} value={g}>Categoria {g}</option>
            ))}
          </select>
        </Field>
        <Field label="a_g [g]" hint="PGA orizzontale">
          <NumericInput value={ag} step={0.01} min={0.01} max={1} onChange={setAg} />
        </Field>
        <Field label="ξ [%]" hint="Smorzamento equivalente">
          <NumericInput value={xi} step={0.5} min={0} max={50} onChange={setXi} />
        </Field>
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={useQ} onChange={(e) => setUseQ(e.target.checked)} />
            <span>Calcola anche S_d(T) con q =</span>
            <input type="number" step={0.5} min={1} max={8} value={q}
                   onChange={(e) => setQ(Number(e.target.value))}
                   className="w-16 h-7 px-1.5 rounded text-xs font-mono bg-bg-elevated border border-border text-ink" />
          </label>
        </div>
      </div>
      <div className="mt-3">
        <Button variant="primary" size="sm"
                iconLeft={<Calculator className="h-3.5 w-3.5" />}
                loading={mut.isPending} onClick={() => mut.mutate()}>
          Calcola spettro
        </Button>
      </div>
      {r && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-3 mb-2">
            <Badge size="sm" variant="info">S={r.params.S.toFixed(2)}</Badge>
            <Badge size="sm" variant="muted">T_B={r.params.T_B.toFixed(2)}s</Badge>
            <Badge size="sm" variant="muted">T_C={r.params.T_C.toFixed(2)}s</Badge>
            <Badge size="sm" variant="muted">T_D={r.params.T_D.toFixed(1)}s</Badge>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="T" tick={{ fontSize: 10 }} label={{ value: "T [s]", position: "insideBottom", offset: -2, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: "S [m/s²]", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <ReTooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 11 }}
                           formatter={(v: any) => Number(v).toFixed(3)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Se" stroke="#3B82F6" strokeWidth={2} dot={false} name="S_e elastico" />
                {r.Sd && <Line type="monotone" dataKey="Sd" stroke="#F59E0B" strokeWidth={2} dot={false} name="S_d progetto" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
}

function QFactorForm() {
  const [system, setSystem] = useState<StructuralSystemId>("frame_concrete");
  const [dcl, setDcl] = useState<DuctilityClass>("DCM");
  const [au, setAu] = useState(1.3);
  const [kw, setKw] = useState(1.0);
  const [r, setR] = useState<EC8QResponse | null>(null);

  const mut = useMutation({
    mutationFn: () => verifyExtApi.ec8QFactor({
      system, ductility_class: dcl, alpha_u_over_alpha_1: au, k_w: kw,
    }),
    onSuccess: (resp) => {
      setR(resp);
      toast("success", `q = ${resp.q.toFixed(2)}`);
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  return (
    <Card title="Fattore di struttura q (EN 1998-1 §5.2.2/§6.3/§7)"
          description="q = q_0 · α_u/α_1 · k_w ≥ 1.5. Determina la riduzione dello spettro elastico per ottenere S_d.">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Sistema strutturale">
          <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                  value={system} onChange={(e) => setSystem(e.target.value as StructuralSystemId)}>
            {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Classe di duttilità">
          <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                  value={dcl} onChange={(e) => setDcl(e.target.value as DuctilityClass)}>
            <option value="DCL">DCL (bassa)</option>
            <option value="DCM">DCM (media)</option>
            <option value="DCH">DCH (alta)</option>
          </select>
        </Field>
        <Field label="α_u / α_1" hint="Sovra-resistenza (1.0÷1.5)">
          <NumericInput value={au} step={0.05} min={1} max={1.5} onChange={setAu} />
        </Field>
        <Field label="k_w" hint="Pareti (1.0 per telai)">
          <NumericInput value={kw} step={0.1} min={0.1} max={1.0} onChange={setKw} />
        </Field>
      </div>
      <div className="mt-3">
        <Button variant="primary" size="sm"
                iconLeft={<Calculator className="h-3.5 w-3.5" />}
                loading={mut.isPending} onClick={() => mut.mutate()}>
          Calcola q
        </Button>
      </div>
      {r && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wide-2 font-semibold text-ink-3">Fattore di struttura</div>
            <div className="text-3xl font-mono font-bold text-accent">{r.q.toFixed(2)}</div>
            <div className="text-[10px] text-ink-3 mt-1">
              q_0 × α_u/α_1 × k_w (≥ 1.5)
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
