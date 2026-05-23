/**
 * EC2Panel — verifiche calcestruzzo armato (EN 1992-1-1).
 *
 * 2 sotto-tab:
 *  - Flessione (sezione rettangolare CA, singola armatura)
 *  - Taglio (V_Rd,c, V_Rd,s con staffe, V_Rd,max)
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { verifyExtApi, type EC2BendingResponse, type EC2ShearResponse } from "../../api/verify_ext";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";

type SubTab = "bending" | "shear";

const FCK_PRESETS = [
  { id: "C25/30", v: 25e6 }, { id: "C30/37", v: 30e6 },
  { id: "C35/45", v: 35e6 }, { id: "C40/50", v: 40e6 }, { id: "C45/55", v: 45e6 },
];

export function EC2Panel() {
  const [sub, setSub] = useState<SubTab>("bending");

  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-1">
        {(["bending", "shear"] as SubTab[]).map((s) => (
          <button key={s}
            className={`btn text-[11px] py-1 ${sub === s ? "btn-primary" : ""}`}
            onClick={() => setSub(s)}>
            {s === "bending" ? "Flessione" : "Taglio"}
          </button>
        ))}
      </div>
      {sub === "bending" ? <BendingForm /> : <ShearForm />}
    </div>
  );
}

function BendingForm() {
  const [b, setB] = useState(0.30);
  const [d, setD] = useState(0.45);
  const [As, setAs] = useState(0.001963);   // 4φ25 ≈ 19.63 cm²
  const [fck, setFck] = useState(30e6);
  const [fyk, setFyk] = useState(450e6);
  const [MEd, setMEd] = useState(150e3);    // 150 kNm
  const [r, setR] = useState<EC2BendingResponse | null>(null);

  const mut = useMutation({
    mutationFn: () => verifyExtApi.ec2Bending({ b, d, A_s: As, fck, fyk, M_Ed: MEd }),
    onSuccess: (resp) => {
      setR(resp);
      toast(resp.status === "OK" ? "success" : "error",
        `M_Rd=${(resp.M_Rd / 1e3).toFixed(1)} kNm, UR=${resp.UR.toFixed(3)}`);
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  return (
    <Card title="EC2 — Sezione rettangolare in CA"
          description="Singola armatura tesa, equilibrio interno + duttilità x/d ≤ 0.45.">
      <div className="grid grid-cols-3 gap-2">
        <Field label="b [m]"><NumericInput value={b} step={0.05} min={0.05} onChange={setB} /></Field>
        <Field label="d [m]"><NumericInput value={d} step={0.05} min={0.05} onChange={setD} /></Field>
        <Field label="A_s [m²]"><NumericInput value={As} step={1e-4} min={1e-5} onChange={setAs} /></Field>
        <Field label="f_ck preset">
          <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                  value={fck} onChange={(e) => setFck(Number(e.target.value))}>
            {FCK_PRESETS.map((p) => <option key={p.id} value={p.v}>{p.id}</option>)}
          </select>
        </Field>
        <Field label="f_yk [MPa]"><NumericInput value={fyk / 1e6} step={10} min={100}
                                                 onChange={(v) => setFyk(v * 1e6)} /></Field>
        <Field label="M_Ed [kNm]"><NumericInput value={MEd / 1e3} step={10} min={0}
                                                  onChange={(v) => setMEd(v * 1e3)} /></Field>
      </div>
      <div className="mt-3">
        <Button variant="primary" size="sm" iconLeft={<Calculator className="h-3.5 w-3.5" />}
                loading={mut.isPending} onClick={() => mut.mutate()}>
          Calcola M_Rd
        </Button>
      </div>
      {r && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="M_Rd" value={`${(r.M_Rd / 1e3).toFixed(1)} kNm`} />
            <Stat label="UR" value={r.UR.toFixed(3)}
                  variant={r.UR <= 1 ? "ok" : "fail"} />
            <Stat label="x/d" value={r.x_over_d.toFixed(3)}
                  variant={r.is_ductile ? "ok" : "warn"} />
            <Stat label="z" value={`${(r.z * 1000).toFixed(0)} mm`} />
            <Stat label="f_cd" value={`${(r.f_cd / 1e6).toFixed(1)} MPa`} />
            <Stat label="f_yd" value={`${(r.f_yd / 1e6).toFixed(0)} MPa`} />
          </div>
          {!r.A_s_ok && (
            <div className="text-[10px] text-warn bg-warn/10 border border-warn/30 rounded px-2 py-1">
              A_s ({(r.A_s * 1e4).toFixed(2)} cm²) &lt; A_s,min ({(r.A_s_min * 1e4).toFixed(2)} cm²) — armatura minima EC2 §9.2.1
            </div>
          )}
          <div className="text-[10px] text-ink-3">{r.notes}</div>
        </div>
      )}
    </Card>
  );
}

function ShearForm() {
  const [bw, setBw] = useState(0.30);
  const [d, setD] = useState(0.45);
  const [Asl, setAsl] = useState(0.001963);
  const [fck, setFck] = useState(30e6);
  const [Asw, setAsw] = useState(0.0);     // 0 = senza staffe
  const [s, setS] = useState(0.20);
  const [fywk, setFywk] = useState(450e6);
  const [cot, setCot] = useState(2.5);
  const [VEd, setVEd] = useState(150e3);
  const [r, setR] = useState<EC2ShearResponse | null>(null);

  const mut = useMutation({
    mutationFn: () => verifyExtApi.ec2Shear({
      b_w: bw, d, A_sl: Asl, fck,
      A_sw: Asw, s, fywk, cot_theta: cot, V_Ed: VEd,
    }),
    onSuccess: (resp) => {
      setR(resp);
      toast(resp.status === "OK" ? "success" : "error",
        `V_Rd=${(resp.V_Rd / 1e3).toFixed(1)} kN, UR=${resp.UR.toFixed(3)}`);
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  return (
    <Card title="EC2 — Taglio sezione CA"
          description="V_Rd,c senza staffe + V_Rd,s con staffe verticali + limite bielle V_Rd,max.">
      <div className="grid grid-cols-3 gap-2">
        <Field label="b_w [m]"><NumericInput value={bw} step={0.05} min={0.05} onChange={setBw} /></Field>
        <Field label="d [m]"><NumericInput value={d} step={0.05} min={0.05} onChange={setD} /></Field>
        <Field label="A_sl [m²]"><NumericInput value={Asl} step={1e-4} min={1e-5} onChange={setAsl} /></Field>
        <Field label="f_ck preset">
          <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                  value={fck} onChange={(e) => setFck(Number(e.target.value))}>
            {FCK_PRESETS.map((p) => <option key={p.id} value={p.v}>{p.id}</option>)}
          </select>
        </Field>
        <Field label="A_sw [m²]" hint="0 = senza staffe">
          <NumericInput value={Asw} step={1e-5} min={0} onChange={setAsw} />
        </Field>
        <Field label="s [m]"><NumericInput value={s} step={0.05} min={0.05} onChange={setS} /></Field>
        <Field label="f_ywk [MPa]"><NumericInput value={fywk / 1e6} step={10}
                                                  onChange={(v) => setFywk(v * 1e6)} /></Field>
        <Field label="cot(θ)"><NumericInput value={cot} step={0.1} min={1} max={2.5}
                                              onChange={setCot} /></Field>
        <Field label="V_Ed [kN]"><NumericInput value={VEd / 1e3} step={10}
                                                onChange={(v) => setVEd(v * 1e3)} /></Field>
      </div>
      <div className="mt-3">
        <Button variant="primary" size="sm" iconLeft={<Calculator className="h-3.5 w-3.5" />}
                loading={mut.isPending} onClick={() => mut.mutate()}>
          Calcola V_Rd
        </Button>
      </div>
      {r && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="V_Rd" value={`${(r.V_Rd / 1e3).toFixed(1)} kN`} />
            <Stat label="UR" value={r.UR.toFixed(3)}
                  variant={r.UR <= 1 ? "ok" : "fail"} />
            <Stat label="staffe" value={r.needs_stirrups ? "Necessarie" : "Non nec."} />
            <Stat label="V_Rd,c" value={`${(r.V_Rd_c / 1e3).toFixed(1)} kN`} />
            <Stat label="V_Rd,s" value={`${(r.V_Rd_s / 1e3).toFixed(1)} kN`} />
            <Stat label="V_Rd,max" value={`${(r.V_Rd_max / 1e3).toFixed(1)} kN`} />
          </div>
          <div className="text-[10px] text-ink-3 mt-2">{r.notes}</div>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, variant = "default" }: {
  label: string; value: string;
  variant?: "default" | "ok" | "warn" | "fail";
}) {
  const color = variant === "ok"   ? "text-success"
              : variant === "warn" ? "text-warn"
              : variant === "fail" ? "text-danger"
              : "text-ink";
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wide-2 font-semibold text-ink-3">{label}</div>
      <div className={`text-sm font-mono ${color}`}>{value}</div>
    </div>
  );
}
