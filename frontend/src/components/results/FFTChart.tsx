import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { analysisApi } from "../../api/client";
import { useResultsStore } from "../../store/resultsStore";
import { useModelStore } from "../../store/modelStore";

export function FFTChart() {
  const model = useModelStore((s) => s.model);
  const dyn = useResultsStore((s) => s.dynamicResults);
  const [nodeId, setNodeId] = useState<number>(() =>
    dyn?.max_displacement_node ?? Number(Object.keys(dyn?.node_history ?? {})[0] ?? 0)
  );
  const [component, setComponent] = useState("ux");

  const mut = useMutation({
    mutationFn: () => analysisApi.fft(model!.id, { node_id: nodeId, component }),
  });

  const data = mut.data
    ? mut.data.frequencies.map((f, i) => ({
        f: parseFloat(f.toFixed(3)),
        amp: parseFloat(mut.data!.amplitudes[i].toFixed(6)),
      })).slice(0, 200)
    : [];

  if (!model || !dyn) return null;
  const nodeIds = Object.keys(dyn.node_history).map(Number);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 items-end">
        <div className="col-span-2">
          <label className="label block mb-1">Nodo</label>
          <select className="input" value={nodeId} onChange={(e) => setNodeId(Number(e.target.value))}>
            {nodeIds.map((id) => (<option key={id} value={id}>#{id}</option>))}
          </select>
        </div>
        <div>
          <label className="label block mb-1">Comp.</label>
          <select className="input" value={component} onChange={(e) => setComponent(e.target.value)}>
            <option value="ux">uₓ</option>
            <option value="uy">uᵧ</option>
            <option value="uz">u_z</option>
            <option value="ax">aₓ</option>
            <option value="ay">aᵧ</option>
            <option value="az">a_z</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>
        {mut.isPending ? "Calcolo..." : "Calcola FFT"}
      </button>

      {mut.data && (
        <>
          <div className="text-[10px] text-ink-3">
            Frequenza dominante: <span className="text-accent-primary numeric">
              {mut.data.dominant_hz.toFixed(3)} Hz
            </span>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#2a3040" />
                <XAxis dataKey="f" stroke="#8a92a5" fontSize={10}
                       label={{ value: "f [Hz]", position: "insideBottom", offset: -5, fill: "#8a92a5" }} />
                <YAxis stroke="#8a92a5" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0f1219", border: "1px solid #2a3040", fontSize: 11 }} />
                <Line type="monotone" dataKey="amp" stroke="#00d4ff" dot={false} name="ampiezza" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
