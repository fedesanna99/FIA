import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { useResultsStore } from "../../store/resultsStore";
import { useModelStore } from "../../store/modelStore";

export function TimeHistoryPlot() {
  const res = useResultsStore((s) => s.dynamicResults)!;
  const selectedNode = useResultsStore((s) => s.selectedHistoryNode);
  const setSelectedNode = useResultsStore((s) => s.setSelectedHistoryNode);
  const model = useModelStore((s) => s.model);

  const nodeIds = Object.keys(res.node_history).map(Number);
  const targetNode = selectedNode ?? res.max_displacement_node ?? nodeIds[0];

  const data = useMemo(() => {
    const h = res.node_history[targetNode];
    if (!h) return [];
    return res.times.map((t, i) => ({
      t: parseFloat(t.toFixed(4)),
      ux: h.ux[i] * 1000,
      uy: h.uy[i] * 1000,
      uz: h.uz[i] * 1000,
    }));
  }, [res, targetNode]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="label">Nodo</span>
        <select
          className="input flex-1"
          value={targetNode}
          onChange={(e) => setSelectedNode(Number(e.target.value))}
        >
          {nodeIds.map((nid) => {
            const node = model?.nodes.find((n) => n.id === nid);
            return (
              <option key={nid} value={nid}>
                #{nid} {node && `(${node.x.toFixed(1)},${node.y.toFixed(1)},${node.z.toFixed(1)})`}
              </option>
            );
          })}
        </select>
      </div>
      <div className="text-ink-3 text-[10px] uppercase">Storia temporale u(t) [mm]</div>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#2a3040" />
            <XAxis dataKey="t" stroke="#8a92a5" fontSize={10} />
            <YAxis stroke="#8a92a5" fontSize={10} />
            <Tooltip
              contentStyle={{
                background: "#0f1219", border: "1px solid #2a3040",
                fontSize: 11, color: "#e8eaed",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="ux" stroke="#ff4444" dot={false} />
            <Line type="monotone" dataKey="uy" stroke="#00ff88" dot={false} />
            <Line type="monotone" dataKey="uz" stroke="#00d4ff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
