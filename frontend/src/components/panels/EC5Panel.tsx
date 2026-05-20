/**
 * EC5Panel — verifiche resistenze legno (EN 1995-1-1).
 *
 * Selettore classe (C24/C30/GL24h/GL28h) + service class + load duration.
 * Input opzionali di tensione → UR per ciascuna sollecitazione.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { TreePine, Calculator } from "lucide-react";
import {
  verifyExtApi,
  type EC5TimberResponse, type TimberClassId, type LoadDurationStr,
} from "../../api/verify_ext";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";

const CLASSES: TimberClassId[] = ["C24", "C30", "GL24h", "GL28h"];
const LOAD_DURATIONS: LoadDurationStr[] = [
  "permanent", "long-term", "medium-term", "short-term", "instantaneous",
];
const LD_LABELS: Record<LoadDurationStr, string> = {
  permanent: "Permanente",
  "long-term": "Lunga (>6 mesi)",
  "medium-term": "Media (1 sett-6 mesi)",
  "short-term": "Breve (<1 sett.)",
  instantaneous: "Istantanea",
};

export function EC5Panel() {
  const [cls, setCls] = useState<TimberClassId>("C24");
  const [sc, setSc] = useState<1 | 2 | 3>(2);
  const [ld, setLd] = useState<LoadDurationStr>("medium-term");
  const [st, setSt] = useState(0);     // σ trazione [MPa]
  const [sc0, setSc0] = useState(8);   // σ compressione [MPa]
  const [sm, setSm] = useState(15);    // σ flessione [MPa]
  const [tau, setTau] = useState(1);   // τ taglio [MPa]
  const [r, setR] = useState<EC5TimberResponse | null>(null);

  const mut = useMutation({
    mutationFn: () => verifyExtApi.ec5Timber({
      timber_class: cls,
      service_class: sc,
      load_duration: ld,
      sigma_t_0_Ed: st * 1e6,
      sigma_c_0_Ed: sc0 * 1e6,
      sigma_m_Ed: sm * 1e6,
      tau_v_Ed: tau * 1e6,
    }),
    onSuccess: (resp) => {
      setR(resp);
      toast(resp.status === "OK" ? "success" : "error",
        `UR_max = ${resp.UR_max.toFixed(3)}`);
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  return (
    <div className="p-3 space-y-3">
      <Card
        title="EC5 — Resistenze legno"
        description="f_d = k_mod · f_k / γ_M (EN 1995-1-1 §2.4.1). k_mod dipende da service class e durata carico."
      >
        <div className="grid grid-cols-3 gap-2">
          <Field label="Classe legno">
            <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                    value={cls} onChange={(e) => setCls(e.target.value as TimberClassId)}>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Service class" hint="1=indoor, 2=copertura, 3=esterno">
            <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                    value={sc} onChange={(e) => setSc(Number(e.target.value) as 1 | 2 | 3)}>
              <option value={1}>SC 1</option>
              <option value={2}>SC 2</option>
              <option value={3}>SC 3</option>
            </select>
          </Field>
          <Field label="Durata carico">
            <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                    value={ld} onChange={(e) => setLd(e.target.value as LoadDurationStr)}>
              {LOAD_DURATIONS.map((l) => (
                <option key={l} value={l}>{LD_LABELS[l]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
          <Field label="σ_t,0,Ed [MPa]" hint="Trazione ∥ fibre">
            <NumericInput value={st} step={1} min={0} onChange={setSt} />
          </Field>
          <Field label="σ_c,0,Ed [MPa]" hint="Compressione ∥ fibre">
            <NumericInput value={sc0} step={1} min={0} onChange={setSc0} />
          </Field>
          <Field label="σ_m,Ed [MPa]" hint="Flessione">
            <NumericInput value={sm} step={1} min={0} onChange={setSm} />
          </Field>
          <Field label="τ_v,Ed [MPa]" hint="Taglio">
            <NumericInput value={tau} step={0.1} min={0} onChange={setTau} />
          </Field>
        </div>
        <div className="mt-3">
          <Button variant="primary" size="sm"
                  iconLeft={<Calculator className="h-3.5 w-3.5" />}
                  loading={mut.isPending} onClick={() => mut.mutate()}>
            Calcola UR
          </Button>
        </div>
      </Card>

      {r && (
        <Card title="Risultati EC5">
          <div className="text-[10px] text-ink-dim mb-2">
            k_mod = <span className="font-mono">{r.k_mod.toFixed(2)}</span> · γ_M = <span className="font-mono">{r.gamma_M.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <Stat label="f_t,0,d" value={`${(r.f_t_0_d / 1e6).toFixed(1)} MPa`} />
            <Stat label="f_c,0,d" value={`${(r.f_c_0_d / 1e6).toFixed(1)} MPa`} />
            <Stat label="f_m,d" value={`${(r.f_m_d / 1e6).toFixed(1)} MPa`} />
            <Stat label="f_v,d" value={`${(r.f_v_d / 1e6).toFixed(2)} MPa`} />
            <Stat label="UR_t" value={r.UR_t.toFixed(3)} variant={r.UR_t <= 1 ? "ok" : "fail"} />
            <Stat label="UR_c" value={r.UR_c.toFixed(3)} variant={r.UR_c <= 1 ? "ok" : "fail"} />
            <Stat label="UR_m" value={r.UR_m.toFixed(3)} variant={r.UR_m <= 1 ? "ok" : "fail"} />
            <Stat label="UR_v" value={r.UR_v.toFixed(3)} variant={r.UR_v <= 1 ? "ok" : "fail"} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border text-xs">
            <Stat label="UR_t+m" value={r.UR_tm.toFixed(3)} variant={r.UR_tm <= 1 ? "ok" : "fail"} />
            <Stat label="UR_c+m" value={r.UR_cm.toFixed(3)} variant={r.UR_cm <= 1 ? "ok" : "fail"} />
            <Stat label="UR_max" value={r.UR_max.toFixed(3)}
                  variant={r.UR_max <= 1 ? "ok" : "fail"} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, variant = "default" }: {
  label: string; value: string;
  variant?: "default" | "ok" | "fail";
}) {
  const color = variant === "ok"   ? "text-success"
              : variant === "fail" ? "text-danger"
              : "text-ink";
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ink-dim">{label}</div>
      <div className={`text-sm font-mono ${color}`}>{value}</div>
    </div>
  );
}
