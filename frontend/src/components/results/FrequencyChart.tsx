import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useResultsStore } from "../../store/resultsStore";

export function FrequencyChart() {
  const modal = useResultsStore((s) => s.modalResults)!;
  const data = modal.modes.map((m) => ({
    name: `${m.mode}`,
    frequency: parseFloat(m.frequency_hz.toFixed(4)),
    period: parseFloat(m.period.toFixed(4)),
  }));

  return (
    <div className="space-y-3">
      <div className="text-ink-3 text-[10px] uppercase">Frequenze proprie [Hz]</div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#2a3040" />
            <XAxis dataKey="name" stroke="#8a92a5" fontSize={10} />
            <YAxis stroke="#8a92a5" fontSize={10} />
            <Tooltip
              contentStyle={{
                background: "#0f1219", border: "1px solid #2a3040",
                fontSize: 11, color: "#e8eaed",
              }}
              labelStyle={{ color: "#00d4ff" }}
              formatter={(v: number) => [`${v} Hz`, "frequenza"]}
            />
            <Bar dataKey="frequency" fill="#00d4ff" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
