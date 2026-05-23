/**
 * ComparePanel — confronto strutturale e di risultati fra due modelli.
 *
 * v2.3.0 enhancement (audit-deep follow-up):
 *  - Stats side-by-side card A vs B (nodi/elementi/carichi/vincoli) con Δ%
 *  - Auto-fetch FEAModel A e B per mostrare conteggi prima del run compare
 *  - Compare button enabled solo con due modelli diversi (validation
 *    inline + hint testuale, niente toast d'errore intrusivo)
 *  - Risultato strutturale e statico in card distinte
 *
 * Backend: `POST /api/models/compare` (compareApi.models).
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GitCompare, ArrowRight, Equal } from "lucide-react";
import { compareApi, type CompareResponse, type ModelDiff } from "../../api/compare";
import { modelsApi } from "../../api/client";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { cn } from "../ui/cn";

export function ComparePanel() {
  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: () => modelsApi.list(),
  });

  const [modelA, setModelA] = useState<string>("");
  const [modelB, setModelB] = useState<string>("");
  const [posTol, setPosTol] = useState(1e-6);
  const [includeStatic, setIncludeStatic] = useState(false);
  const [r, setR] = useState<CompareResponse | null>(null);

  // Auto-fetch dei due modelli interi (per i conteggi side-by-side)
  const { data: fullA } = useQuery({
    queryKey: ["model", modelA],
    queryFn: () => modelsApi.get(modelA),
    enabled: !!modelA,
  });
  const { data: fullB } = useQuery({
    queryKey: ["model", modelB],
    queryFn: () => modelsApi.get(modelB),
    enabled: !!modelB,
  });

  const sameModel = !!modelA && modelA === modelB;
  const canCompare = !!modelA && !!modelB && !sameModel;

  const mut = useMutation({
    mutationFn: () => {
      if (!canCompare) throw new Error("Seleziona due modelli diversi");
      return compareApi.models({
        model_a: modelA, model_b: modelB,
        pos_tol: posTol,
        include_static_diff: includeStatic,
      });
    },
    onSuccess: (resp) => {
      setR(resp);
      toast("success", "Confronto completato");
    },
    onError: (e) => toast("error", `Errore compare: ${(e as Error).message}`),
  });

  const overview = useMemo(() => {
    if (!fullA || !fullB) return null;
    return [
      { label: "Nodi",     a: fullA.nodes.length,       b: fullB.nodes.length },
      { label: "Elementi", a: fullA.elements.length,    b: fullB.elements.length },
      { label: "Carichi",  a: fullA.loads.length,       b: fullB.loads.length },
      { label: "Vincoli",  a: fullA.constraints.length, b: fullB.constraints.length },
    ] as const;
  }, [fullA, fullB]);

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Confronto modelli"
        description="Scegli due modelli per vedere differenze strutturali e (opzionale) delta risultati statici."
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label="Modello A (base)">
            <select
              data-testid="compare-select-a"
              className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
              value={modelA}
              onChange={(e) => { setModelA(e.target.value); setR(null); }}
            >
              <option value="">— scegli —</option>
              {models?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Modello B (variante)">
            <select
              data-testid="compare-select-b"
              className="h-8 px-2 rounded text-sm bg-bg-elevated border border-border text-ink"
              value={modelB}
              onChange={(e) => { setModelB(e.target.value); setR(null); }}
            >
              <option value="">— scegli —</option>
              {models?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Tol pos [m]" hint="merge nodi 'spostati'">
            <NumericInput value={posTol} step={1e-7} min={0} onChange={setPosTol} />
          </Field>
          <label className="flex items-center gap-2 text-xs pt-5">
            <input
              type="checkbox"
              checked={includeStatic}
              onChange={(e) => setIncludeStatic(e.target.checked)}
            />
            <span>Includi delta risultati statici</span>
          </label>
        </div>

        {/* Validation hint inline (no toast intrusivo) */}
        {sameModel && (
          <div className="mt-2 text-[11px] text-warn">
            Scegli due modelli diversi per confrontare.
          </div>
        )}

        <div className="mt-3">
          <Button
            variant="primary"
            size="sm"
            iconLeft={<GitCompare className="h-3.5 w-3.5" />}
            loading={mut.isPending}
            disabled={!canCompare}
            onClick={() => mut.mutate()}
            data-testid="compare-run-btn"
          >
            Confronta
          </Button>
        </div>
      </Card>

      {/* Side-by-side overview (conteggi raw) — sempre visibile appena entrambi
          i modelli sono selezionati, anche prima di lanciare compare. */}
      {overview && (
        <Card title="Anteprima A vs B" description="Conteggi delle entità dei due modelli.">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs">
            <div className="font-mono text-[10px] uppercase tracking-wide-2 font-semibold text-ink-3 text-right">
              {fullA?.name}
            </div>
            <span className="text-ink-4 text-[10px]">—</span>
            <div className="font-mono text-[10px] uppercase tracking-wide-2 font-semibold text-ink-3">
              {fullB?.name}
            </div>
            {overview.map((row) => {
              const delta = row.b - row.a;
              const same = delta === 0;
              return (
                <CountCompareRow
                  key={row.label}
                  label={row.label}
                  a={row.a}
                  b={row.b}
                  delta={delta}
                  same={same}
                />
              );
            })}
          </div>
        </Card>
      )}

      {r && (
        <>
          <Card title="Differenze strutturali" description="Aggiunti / rimossi / modificati per entità.">
            <div className="grid grid-cols-2 gap-1.5">
              <DiffRow label="Nodi"     d={r.model_diff} k="nodes" />
              <DiffRow label="Elementi" d={r.model_diff} k="elements" />
              <DiffRow label="Carichi"  d={r.model_diff} k="loads" />
              <DiffRow label="Vincoli"  d={r.model_diff} k="constraints" />
            </div>
          </Card>

          {r.static_diff && (
            <Card title="Delta risultati statici" description="Spostamenti nodali e forze elementi.">
              <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                <Stat label="Δ max [m]" value={r.static_diff.max_delta_magnitude.toExponential(3)} />
                <Stat label="Nodo Δ max" value={`#${r.static_diff.max_delta_node_id}`} />
              </div>
              <div className="space-y-0.5 max-h-32 overflow-auto">
                {r.static_diff.node_deltas.slice(0, 20).map((d) => (
                  <div key={d.node_id} className="text-[10px] font-mono flex justify-between">
                    <span>#{d.node_id}</span>
                    <span>Δux={d.delta_ux.toExponential(2)}</span>
                    <span>Δuy={d.delta_uy.toExponential(2)}</span>
                    <span>|Δ|={d.delta_magnitude.toExponential(2)}</span>
                  </div>
                ))}
                {r.static_diff.node_deltas.length === 0 && (
                  <div className="text-ink-3 text-[10px] italic">
                    Nessun delta significativo (modelli identici lato risultati).
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function CountCompareRow({
  label, a, b, delta, same,
}: {
  label: string; a: number; b: number; delta: number; same: boolean;
}) {
  return (
    <>
      <div className="font-mono text-sm tabular-nums text-ink text-right">{a}</div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] uppercase tracking-wide-1 text-ink-3">{label}</span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[10px] font-mono px-1 rounded",
            same
              ? "text-ink-3 bg-bg-hover"
              : delta > 0
                ? "text-success bg-success/15"
                : "text-danger bg-danger/15",
          )}
          data-testid={`compare-delta-${label.toLowerCase()}`}
        >
          {same ? <Equal className="w-2.5 h-2.5" /> : <ArrowRight className="w-2.5 h-2.5" />}
          {same ? "=" : (delta > 0 ? `+${delta}` : delta)}
        </span>
      </div>
      <div className="font-mono text-sm tabular-nums text-ink">{b}</div>
    </>
  );
}

function DiffRow({ label, d, k }: {
  label: string;
  d: ModelDiff;
  k: "nodes" | "elements" | "loads" | "constraints";
}) {
  const added = (d[`${k}_added`] ?? []).length;
  const removed = (d[`${k}_removed`] ?? []).length;
  // BACKEND: nodes_moved per nodi, *_modified per gli altri
  const modifiedKey = k === "nodes" ? "nodes_moved" : `${k}_modified` as const;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modified = ((d as any)[modifiedKey] ?? []).length;
  return (
    <div className="bg-bg/40 border border-border rounded p-2">
      <div className="font-mono text-[10px] uppercase tracking-wide-2 font-semibold text-ink-3 mb-1">{label}</div>
      <div className="flex items-center gap-1">
        <Badge size="sm" variant={added > 0 ? "success" : "muted"}>+{added}</Badge>
        <Badge size="sm" variant={removed > 0 ? "danger" : "muted"}>−{removed}</Badge>
        <Badge size="sm" variant={modified > 0 ? "warn" : "muted"}>~{modified}</Badge>
      </div>
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
