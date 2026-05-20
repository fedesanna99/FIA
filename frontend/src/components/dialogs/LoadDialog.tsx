import { useState, useEffect, useMemo } from "react";
import { toast } from "../../store/toastStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Dialog } from "./Dialog";
import { modelsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";
import type { LoadType } from "../../types/model";

const LOAD_TYPES: { value: LoadType; label: string; targetKind: "node" | "element" | "global" }[] = [
  { value: "nodal",         label: "Nodale (Fx,Fy,Fz,M)",       targetKind: "node" },
  { value: "distributed",   label: "Distribuito su elemento",   targetKind: "element" },
  { value: "pressure",      label: "Pressione su shell",        targetKind: "element" },
  { value: "temperature",   label: "Variazione termica ΔT",     targetKind: "element" },
  { value: "nodal_mass",    label: "Massa nodale (modale)",     targetKind: "node" },
  { value: "self_weight",   label: "Peso proprio",              targetKind: "node" },
  { value: "dynamic",       label: "Forzante dinamica F(t)",    targetKind: "node" },
  { value: "ground_accel",  label: "Accelerogramma alla base",  targetKind: "global" },
];

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
    <Dialog open={open} onClose={onClose}
      title={editing ? `Modifica carico #${editing.id}` : "Aggiungi carico"} width={500}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "..." : (editing ? "Salva" : "Aggiungi")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {mutation.isError && (
          <div className="text-accent-danger text-xs">{(mutation.error as Error).message}</div>
        )}

        <div>
          <label className="label block mb-1">Tipo</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as LoadType)}>
            {LOAD_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>

        {targetKind !== "global" && (
          <div>
            <label className="label block mb-1">
              {targetKind === "node" ? "Nodo target" : "Elemento target"}
            </label>
            <input type="number" className="input" value={targetId}
                   onChange={(e) => setTargetId(Number(e.target.value))} />
          </div>
        )}

        {type === "nodal" && (
          <div className="grid grid-cols-3 gap-2">
            <Field label="Fx [N]" value={fx} onChange={setFx} />
            <Field label="Fy [N]" value={fy} onChange={setFy} />
            <Field label="Fz [N]" value={fz} onChange={setFz} />
          </div>
        )}
        {type === "distributed" && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="qy [N/m]" value={qy} onChange={setQy} />
            <Field label="qz [N/m]" value={qz} onChange={setQz} />
          </div>
        )}
        {type === "nodal_mass" && (
          <Field label="Massa [kg]" value={mass} onChange={setMass} />
        )}
        {type === "pressure" && (
          <>
            <Field label="Pressione [Pa]" value={pressure} onChange={setPressure} step={100} />
            <div className="text-[10px] text-ink-dim">
              Applicata sulla normale dello shell Q4. Positiva = direzione +normal (sotto la piastra).
              I T3 plane-stress sono ignorati (rigidezza solo nel piano).
            </div>
          </>
        )}
        {type === "temperature" && (
          <>
            <Field label="ΔT [°C]" value={deltaT} onChange={setDeltaT} step={1} />
            <div className="text-[10px] text-ink-dim">
              Forza assiale equivalente N = E·A·α·ΔT applicata all'elemento beam/truss.
              Il coefficiente α di dilatazione è preso dal materiale. Shell/Solid/T3 sono ignorati.
            </div>
          </>
        )}

        {(type === "dynamic" || type === "ground_accel") && (
          <>
            <div>
              <label className="label block mb-1">Direzione (versore)</label>
              <div className="grid grid-cols-3 gap-2">
                <Field label="dirX" value={dirX} onChange={setDirX} step={0.1} />
                <Field label="dirY" value={dirY} onChange={setDirY} step={0.1} />
                <Field label="dirZ" value={dirZ} onChange={setDirZ} step={0.1} />
              </div>
            </div>
            <div>
              <label className="label block mb-1">
                Time-history CSV (t, valore — {type === "ground_accel" ? "a_g [m/s²]" : "F [N]"})
              </label>
              <textarea
                className="input numeric font-mono min-h-[100px] text-[10px]"
                value={timeHistoryCsv}
                onChange={(e) => setTimeHistoryCsv(e.target.value)}
                placeholder="0,0
0.05,9.81
0.10,0
..."
              />
              <div className="text-[10px] text-ink-dim mt-1">
                Una riga per istante. Separatori: virgola, spazio o ;
                {type === "ground_accel" && (
                  <> · L'accelerazione produce forza equivalente <span className="numeric">F=-M·r·aₘ(t)</span></>
                )}
              </div>
              {stats && (
                <div className="mt-2 border border-border rounded">
                  <div className="px-2 py-1 text-[10px] text-ink-muted border-b border-border flex justify-between numeric">
                    <span>Preview · {stats.n} punti · t<sub>max</sub>={stats.tMax.toFixed(3)}s</span>
                    <span>|max|={stats.maxAbs.toFixed(3)}</span>
                  </div>
                  <div style={{ width: "100%", height: 120 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData} margin={{ top: 5, right: 6, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#2a3040" />
                        <XAxis dataKey="t" stroke="#8a92a5" fontSize={9} />
                        <YAxis stroke="#8a92a5" fontSize={9} />
                        <Tooltip contentStyle={{ background: "#0f1219", border: "1px solid #2a3040", fontSize: 10 }} />
                        <Line type="monotone" dataKey="v" stroke="#00d4ff" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

function Field({ label, value, onChange, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <div>
      <label className="label block mb-1">{label}</label>
      <input type="number" step={step} className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
