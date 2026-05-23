/**
 * LoadDialog (Precision v2.0 PR17 T7) — carichi Precision-aligned.
 *
 * Carichi nodali/distribuiti/pressione/termici/massa/peso/dinamici/sisma.
 * Hairline borders, mono labels, chart Recharts theme-aware.
 */
import { useState, useEffect, useMemo } from "react";
import { toast } from "../../store/toastStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Dialog } from "./Dialog";
import { modelsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";
import type { LoadType } from "../../types/model";

const LOAD_TYPES: { value: LoadType; label: string; targetKind: "node" | "element" | "global" }[] = [
  { value: "nodal",         label: "Nodale · Fx,Fy,Fz,M",       targetKind: "node" },
  { value: "distributed",   label: "Distribuito su elemento",   targetKind: "element" },
  { value: "pressure",      label: "Pressione su shell",        targetKind: "element" },
  { value: "temperature",   label: "Variazione termica ΔT",     targetKind: "element" },
  { value: "nodal_mass",    label: "Massa nodale · modale",     targetKind: "node" },
  { value: "self_weight",   label: "Peso proprio",              targetKind: "node" },
  { value: "dynamic",       label: "Forzante dinamica F(t)",    targetKind: "node" },
  { value: "ground_accel",  label: "Accelerogramma alla base",  targetKind: "global" },
];

const fieldLabel = "block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5";
const inputCls = "w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors";
const numInputCls = `${inputCls} font-mono tabular-nums`;

interface Props {
  open: boolean;
  onClose: () => void;
  editLoadId?: number | null;
}

export function LoadDialog({ open, onClose, editLoadId = null }: Props) {
  const model = useModelStore((s) => s.model);
  const addLoad = useModelStore((s) => s.addLoad);
  const updateLoadStore = useModelStore((s) => s.updateLoad);
  const selNodes = useModelStore((s) => s.selectedNodeIds);
  const selElems = useModelStore((s) => s.selectedElementIds);
  const editing = editLoadId != null ? model?.loads.find((l) => l.id === editLoadId) : null;
  const nextId = (model?.loads.reduce((m, l) => Math.max(m, l.id), 0) ?? 0) + 1;

  const [type, setType] = useState<LoadType>(editing?.type ?? "nodal");
  const [targetId, setTargetId] = useState<number>(
    editing?.target_id ?? (selNodes.values().next().value ?? selElems.values().next().value ?? 1),
  );
  const [fx, setFx] = useState(editing?.fx ?? 0);
  const [fy, setFy] = useState(editing?.fy ?? -1000);
  const [fz, setFz] = useState(editing?.fz ?? 0);
  const [qy, setQy] = useState(editing?.qy ?? -1000);
  const [qz, setQz] = useState(editing?.qz ?? 0);
  const [mass, setMass] = useState(editing?.mass ?? 100);
  const [pressure, setPressure] = useState(editing?.pressure ?? 5000);
  const [deltaT, setDeltaT] = useState(editing?.delta_t ?? 30);
  const [dirX, setDirX] = useState(editing?.direction?.[0] ?? 1);
  const [dirY, setDirY] = useState(editing?.direction?.[1] ?? 0);
  const [dirZ, setDirZ] = useState(editing?.direction?.[2] ?? 0);
  const [timeHistoryCsv, setTimeHistoryCsv] = useState(
    editing?.time_history?.map((p) => `${p[0]},${p[1]}`).join("\n")
      ?? "0,0\n0.05,9.81\n0.10,0\n5.0,0",
  );
  const qc = useQueryClient();

  const targetKind = LOAD_TYPES.find((t) => t.value === type)?.targetKind ?? "node";

  const parsed: [number, number][] = useMemo(() => {
    const out: [number, number][] = [];
    for (const raw of timeHistoryCsv.split(/\n+/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const [t, v] = line.split(/[,\s;]+/).map(Number);
      if (Number.isFinite(t) && Number.isFinite(v)) out.push([t, v]);
    }
    return out;
  }, [timeHistoryCsv]);

  const parseHistory = (): [number, number][] | undefined =>
    parsed.length > 0 ? parsed : undefined;

  const chartData = useMemo(
    () => parsed.map(([t, v]) => ({ t: Number(t.toFixed(4)), v: Number(v.toFixed(4)) })),
    [parsed],
  );

  const stats = useMemo(() => {
    if (parsed.length === 0) return null;
    const vals = parsed.map((p) => p[1]);
    const maxAbs = Math.max(...vals.map(Math.abs));
    const tMax = parsed[parsed.length - 1][0];
    return { n: parsed.length, maxAbs, tMax };
  }, [parsed]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello");
      const useId = editing ? editing.id : nextId;
      const base = {
        id: useId, type, target_id: targetKind === "global" ? 0 : targetId,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let payload: any;
      if (type === "nodal") payload = { ...base, fx, fy, fz };
      else if (type === "distributed") payload = { ...base, qy, qz };
      else if (type === "nodal_mass") payload = { ...base, mass };
      else if (type === "pressure") payload = { ...base, pressure };
      else if (type === "temperature") payload = { ...base, delta_t: deltaT };
      else if (type === "self_weight") payload = { ...base, fy: -9.81 };
      else if (type === "dynamic" || type === "ground_accel") {
        const history = parseHistory();
        if (!history) throw new Error("Time-history CSV vuoto o non valido");
        payload = { ...base, direction: [dirX, dirY, dirZ], time_history: history };
      } else {
        payload = base;
      }
      return editing
        ? modelsApi.updateLoad(model.id, editing.id, payload)
        : modelsApi.addLoad(model.id, payload);
    },
    onSuccess: (l) => {
      if (editing) {
        updateLoadStore(editing.id, l);
        toast("success", `Carico #${l.id} aggiornato`);
      } else {
        addLoad(l);
        toast("success", `Carico #${l.id} aggiunto`);
      }
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      onClose();
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setTargetId(editing.target_id);
      setFx(editing.fx ?? 0); setFy(editing.fy ?? 0); setFz(editing.fz ?? 0);
      setQy(editing.qy ?? 0); setQz(editing.qz ?? 0);
      setMass(editing.mass ?? 0);
      setPressure(editing.pressure ?? 0);
      setDeltaT(editing.delta_t ?? 0);
      setDirX(editing.direction?.[0] ?? 1);
      setDirY(editing.direction?.[1] ?? 0);
      setDirZ(editing.direction?.[2] ?? 0);
      if (editing.time_history && editing.time_history.length > 0) {
        setTimeHistoryCsv(editing.time_history.map((p) => `${p[0]},${p[1]}`).join("\n"));
      }
    }
  }, [open, editing]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Modifica carico #${editing.id}` : "Aggiungi carico"}
      width={520}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="load-save"
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait"
          >
            {mutation.isPending && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {mutation.isPending ? "..." : (editing ? "Salva" : "Aggiungi carico")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {mutation.isError && (
          <div className="flex items-start gap-2 px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger">
            <span className="font-mono text-[11px] uppercase tracking-wide-1 font-semibold flex-shrink-0">!</span>
            <span>{(mutation.error as Error).message}</span>
          </div>
        )}

        <label className="block">
          <span className={fieldLabel}>Tipo carico</span>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as LoadType)}>
            {LOAD_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </label>

        {targetKind !== "global" && (
          <label className="block">
            <span className={fieldLabel}>
              {targetKind === "node" ? "Nodo target" : "Elemento target"}
            </span>
            <input type="number" className={numInputCls} value={targetId}
                   onChange={(e) => setTargetId(Number(e.target.value))} />
          </label>
        )}

        {type === "nodal" && (
          <div className="grid grid-cols-3 gap-2">
            <PField label="Fx" unit="[N]" value={fx} onChange={setFx} />
            <PField label="Fy" unit="[N]" value={fy} onChange={setFy} />
            <PField label="Fz" unit="[N]" value={fz} onChange={setFz} />
          </div>
        )}
        {type === "distributed" && (
          <div className="grid grid-cols-2 gap-2">
            <PField label="qy" unit="[N/m]" value={qy} onChange={setQy} />
            <PField label="qz" unit="[N/m]" value={qz} onChange={setQz} />
          </div>
        )}
        {type === "nodal_mass" && (
          <PField label="Massa" unit="[kg]" value={mass} onChange={setMass} />
        )}
        {type === "pressure" && (
          <>
            <PField label="Pressione" unit="[Pa]" value={pressure} onChange={setPressure} step={100} />
            <div className="text-[11px] text-ink-3 leading-snug">
              Applicata sulla normale dello shell Q4. Positiva = direzione +normal (sotto la piastra).
              I T3 plane-stress sono ignorati (rigidezza solo nel piano).
            </div>
          </>
        )}
        {type === "temperature" && (
          <>
            <PField label="ΔT" unit="[°C]" value={deltaT} onChange={setDeltaT} step={1} />
            <div className="text-[11px] text-ink-3 leading-snug">
              Forza assiale equivalente N = E·A·α·ΔT applicata all'elemento beam/truss.
              Il coefficiente α di dilatazione è preso dal materiale.
            </div>
          </>
        )}

        {(type === "dynamic" || type === "ground_accel") && (
          <>
            <div>
              <span className={fieldLabel}>Direzione · versore</span>
              <div className="grid grid-cols-3 gap-2">
                <PField label="dirX" value={dirX} onChange={setDirX} step={0.1} />
                <PField label="dirY" value={dirY} onChange={setDirY} step={0.1} />
                <PField label="dirZ" value={dirZ} onChange={setDirZ} step={0.1} />
              </div>
            </div>
            <label className="block">
              <span className={fieldLabel}>
                Time-history CSV <span className="text-ink-4 normal-case tracking-normal">
                  · t, {type === "ground_accel" ? "a_g [m/s²]" : "F [N]"}
                </span>
              </span>
              <textarea
                className={`${numInputCls} min-h-[100px] resize-y text-[11px]`}
                value={timeHistoryCsv}
                onChange={(e) => setTimeHistoryCsv(e.target.value)}
                placeholder={"0,0\n0.05,9.81\n0.10,0\n..."}
              />
              <div className="text-[11px] text-ink-3 mt-1.5 leading-snug">
                Una riga per istante. Separatori: virgola, spazio o ;
                {type === "ground_accel" && (
                  <> · L'accelerazione produce forza equivalente <span className="font-mono text-ink-2">F=-M·r·aₘ(t)</span></>
                )}
              </div>
              {stats && (
                <div className="mt-2 border border-border bg-bg-panel">
                  <div className="px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 border-b border-border flex justify-between">
                    <span>Preview · {stats.n} punti · t_max={stats.tMax.toFixed(3)}s</span>
                    <span>|max|={stats.maxAbs.toFixed(3)}</span>
                  </div>
                  <div style={{ width: "100%", height: 130 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="currentColor" className="text-border" />
                        <XAxis dataKey="t" stroke="currentColor" className="text-ink-3" fontSize={9} />
                        <YAxis stroke="currentColor" className="text-ink-3" fontSize={9} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border-light)",
                            fontSize: 10,
                            borderRadius: 0,
                          }}
                        />
                        <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </label>
          </>
        )}
      </div>
    </Dialog>
  );
}

function PField({ label, unit, value, onChange, step = 1 }: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className={fieldLabel}>
        {label}
        {unit && <span className="text-ink-4 normal-case tracking-normal ml-1">{unit}</span>}
      </span>
      <input
        type="number"
        step={step}
        className={numInputCls}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
