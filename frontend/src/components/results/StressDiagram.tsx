import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { useResultsStore } from "../../store/resultsStore";
import { useModelStore } from "../../store/modelStore";

export function StressDiagram() {
  const res = useResultsStore((s) => s.staticResults)!;
  const model = useModelStore((s) => s.model);

  const data = useMemo(() => {
    return res.element_forces.map((f) => {
      const el = model?.elements.find((e) => e.id === f.element_id);
      return {
        name: `E${f.element_id}`,
        N: f.N_i,
        V: f.Vy_i,
        M: f.Mz_i / 1000,
        type: el?.type ?? "",
      };
    });
  }, [res, model]);

  return (
    <div className="space-y-2">
      <div className="text-ink-muted text-[10px] uppercase">Forze interne (estremo i) — beam</div>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#2a3040" />
            <XAxis dataKey="name" stroke="#8a92a5" fontSize={9} interval={Math.max(0, Math.floor(data.length / 20))} />
            <YAxis stroke="#8a92a5" fontSize={10} />
            <Tooltip
              contentStyle={{ background: "#0f1219", border: "1px solid #2a3040", fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="N" fill="#00d4ff" name="N [N]" />
            <Bar dataKey="V" fill="#ffaa00" name="V [N]" />
            <Bar dataKey="M" fill="#ff66cc" name="M [kNm]" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
