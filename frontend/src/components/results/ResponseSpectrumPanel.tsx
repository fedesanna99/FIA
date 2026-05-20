import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { analysisApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";

export function ResponseSpectrumPanel() {
  const model = useModelStore((s) => s.model);
  const dyn = useResultsStore((s) => s.dynamicResults);
  const [nodeId, setNodeId] = useState<number>(() =>
    dyn?.max_displacement_node ?? Number(Object.keys(dyn?.node_history ?? {})[0] ?? 0)
  );
  const [component, setComponent] = useState("ax");
  const [damping, setDamping] = useState(0.05);

  const mut = useMutation({
    mutationFn: () => analysisApi.responseSpectrum(model!.id, {
      node_id: nodeId, component, damping_ratio: damping,
    }),
  });

  if (!model || !dyn) {
    return (
      <div className="p-3 text-xs text-ink-dim">
        Lo spettro di risposta richiede un'analisi dinamica preliminare.
      </div>
    );
  }

  const data = mut.data
    ? mut.data.periods.map((p, i) => ({
        T: parseFloat(p.toFixed(3)),
        Sa: parseFloat(mut.data!.Sa[i].toFixed(4)),
        Sd: parseFloat((mut.data!.Sd[i] * 1000).toFixed(4)),
      }))
    : [];

  const nodeIds = Object.keys(dyn.node_history).map(Number);

  return (
    <div className="p-3 space-y-3 text-xs">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="label block mb-1">Nodo</label>
          <select className="input" value={nodeId} onChange={(e) => setNodeId(Number(e.target.value))}>
            {nodeIds.map((id) => (<option key={id} value={id}>#{id}</option>))}
          </select>
        </div>
        <div>
          <label className="label block mb-1">Comp.</label>
          <select className="input" value={component} onChange={(e) => setComponent(e.target.value)}>
            <option value="ax">aₓ</option>
            <option value="ay">aᵧ</option>
            <option value="az">a_z</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label block mb-1">Smorzamento ξ</label>
        <input type="number" step="0.01" min={0} max={0.5} className="input numeric"
               value={damping} onChange={(e) => setDamping(Number(e.target.value))} />
      </div>
      <button className="btn btn-primary w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>
        {mut.isPending ? "Calcolo..." : "Calcola spettro Sa(T)"}
      </button>

      {mut.data && (
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#2a3040" />
              <XAxis dataKey="T" stroke="#8a92a5" fontSize={10}
                     label={{ value: "T [s]", position: "insideBottom", offset: -5, fill: "#8a92a5" }} />
              <YAxis stroke="#8a92a5" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f1219", border: "1px solid #2a3040", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="Sa" stroke="#ff66cc" dot={false} name="Sa [m/s²]" />
              <Line type="monotone" dataKey="Sd" stroke="#00d4ff" dot={false} name="Sd [mm]" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
