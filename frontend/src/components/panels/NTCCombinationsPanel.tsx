/**
 * NTCCombinationsPanel — generazione combinazioni SLU/SLE NTC 2018 §2.5.
 *
 * L'utente costruisce una lista di azioni (G1/G2/Q/E…) e sceglie il tipo
 * di combinazione. Il backend enumera tutte le combinazioni richieste e
 * restituisce coefficienti + valore totale + envelope max/min.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Calculator } from "lucide-react";
import {
  verifyExtApi,
  type ActionDTO, type ActionType, type LoadCategory,
  type CombinationType, type CombinationsResponse,
} from "../../api/verify_ext";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Input";
import { Badge } from "../ui/Badge";

const ACTION_TYPES: ActionType[] = ["G1", "G2", "P", "Q", "E", "A"];
const LOAD_CATEGORIES: LoadCategory[] = [
  "A_residential", "B_office", "C_assembly", "D_shopping",
  "E_storage", "F_parking_light", "G_parking_heavy", "H_roof",
  "snow_low", "snow_high", "wind", "temperature",
];
const COMB_TYPES: CombinationType[] = [
  "SLU_fundamental", "SLE_characteristic", "SLE_frequent",
  "SLE_quasi_permanent", "SLU_seismic", "SLU_accidental",
];

const COMB_LABELS: Record<CombinationType, string> = {
  SLU_fundamental:      "SLU fondamentale",
  SLE_characteristic:   "SLE rara",
  SLE_frequent:         "SLE frequente",
  SLE_quasi_permanent:  "SLE quasi-perm.",
  SLU_seismic:          "SLU sismica",
  SLU_accidental:       "SLU eccezionale",
};

export function NTCCombinationsPanel() {
  const [actions, setActions] = useState<ActionDTO[]>([
    { name: "G1_peso_proprio",   type: "G1", value: 25 },
    { name: "G2_finiture",       type: "G2", value: 8 },
    { name: "Q_sovraccarico",    type: "Q",  value: 15, category: "A_residential" },
    { name: "Q_neve",            type: "Q",  value: 5,  category: "snow_low" },
  ]);
  const [combType, setCombType] = useState<CombinationType>("SLU_fundamental");
  const [r, setR] = useState<CombinationsResponse | null>(null);

  const mut = useMutation({
    mutationFn: () => verifyExtApi.ntcCombinations({
      actions, combination_type: combType,
    }),
    onSuccess: (resp) => {
      setR(resp);
      toast("success", `${resp.n_combinations} combinazioni · max=${resp.envelope.max.toFixed(2)}`);
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  const addAction = () => {
    setActions([...actions, { name: `azione_${actions.length + 1}`, type: "G1", value: 0 }]);
  };
  const removeAction = (i: number) => setActions(actions.filter((_, j) => j !== i));
  const updateAction = (i: number, patch: Partial<ActionDTO>) => {
    setActions(actions.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  };

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Azioni strutturali (NTC §2.5)"
        description="G1 strutturali, G2 non-strutt., P pre-sollecitazione, Q variabili (richiedono categoria), E sismica, A eccezionale."
      >
        <div className="space-y-1.5">
          {actions.map((a, i) => (
            <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
              <input
                className="col-span-4 h-7 px-2 text-xs rounded bg-bg-elevated border border-border text-ink"
                placeholder="nome"
                value={a.name} onChange={(e) => updateAction(i, { name: e.target.value })}
              />
              <select
                className="col-span-2 h-7 px-1 text-xs rounded bg-bg-elevated border border-border text-ink"
                value={a.type} onChange={(e) => updateAction(i, {
                  type: e.target.value as ActionType,
                  category: e.target.value === "Q" ? (a.category ?? "A_residential") : null,
                })}
              >
                {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" step={0.5}
                     className="col-span-2 h-7 px-1 text-xs rounded bg-bg-elevated border border-border text-ink font-mono text-right"
                     value={a.value} onChange={(e) => updateAction(i, { value: Number(e.target.value) })} />
              <select
                className="col-span-3 h-7 px-1 text-[10px] rounded bg-bg-elevated border border-border text-ink"
                value={a.category ?? ""} disabled={a.type !== "Q"}
                onChange={(e) => updateAction(i, { category: (e.target.value as LoadCategory) || null })}
              >
                <option value="">—</option>
                {LOAD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button className="col-span-1 text-danger hover:bg-danger/10 rounded h-7 flex items-center justify-center"
                      onClick={() => removeAction(i)}
                      aria-label="Rimuovi azione">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="xs"
                iconLeft={<Plus className="h-3 w-3" />}
                className="mt-2" onClick={addAction}>
          Aggiungi azione
        </Button>
      </Card>

      <Card title="Combinazione richiesta">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tipo combinazione">
            <select className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
                    value={combType} onChange={(e) => setCombType(e.target.value as CombinationType)}>
              {COMB_TYPES.map((c) => <option key={c} value={c}>{COMB_LABELS[c]}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <Button variant="primary" size="sm"
                    iconLeft={<Calculator className="h-3.5 w-3.5" />}
                    loading={mut.isPending} onClick={() => mut.mutate()}>
              Enumera combinazioni
            </Button>
          </div>
        </div>
      </Card>

      {r && (
        <Card title={`${r.n_combinations} combinazioni · ${COMB_LABELS[r.combination_type]}`}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Stat label="Envelope max" value={r.envelope.max.toFixed(2)} />
            <Stat label="Envelope min" value={r.envelope.min.toFixed(2)} />
          </div>
          <div className="space-y-1 max-h-64 overflow-auto">
            {r.combinations.map((c, i) => (
              <div key={i} className="border border-border rounded p-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-ink">{c.name}</span>
                  <Badge size="sm" variant={c.value > 0 ? "accent" : "muted"}>
                    {c.value.toFixed(2)}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-ink-3">
                  {Object.entries(c.factors).map(([name, f]) => (
                    <span key={name}>{name}: ×{f.toFixed(2)}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wide-2 font-semibold text-ink-3">{label}</div>
      <div className="text-sm font-mono text-ink">{value}</div>
    </div>
  );
}
