import type { FEAModel } from "../types/model";
import type { StaticResults, ModalResults, DynamicResults } from "../types/results";

function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportModelJson(model: FEAModel) {
  download(`${model.name.replace(/\s+/g, "_")}.json`,
           JSON.stringify(model, null, 2), "application/json");
}

export function exportResultsJson(name: string, results: unknown) {
  download(`${name}.json`, JSON.stringify(results, null, 2), "application/json");
}

export function exportDisplacementsCSV(model: FEAModel, results: StaticResults) {
  const header = "node_id,x,y,z,ux,uy,uz,rx,ry,rz\n";
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const rows = results.displacements.map((d) => {
    const n = byId.get(d.node_id);
    return [d.node_id, n?.x ?? 0, n?.y ?? 0, n?.z ?? 0,
            d.ux, d.uy, d.uz, d.rx, d.ry, d.rz].join(",");
  });
  download(`${model.name}_displacements.csv`, header + rows.join("\n"), "text/csv");
}

export function exportModesCSV(model: FEAModel, results: ModalResults) {
  const header = "mode,frequency_hz,period_s,omega_rad_s,Mx_eff,My_eff,Mz_eff\n";
  const rows = results.modes.map((m) =>
    [m.mode, m.frequency_hz, m.period, m.omega,
     m.effective_mass_x, m.effective_mass_y, m.effective_mass_z].join(",")
  );
  download(`${model.name}_modes.csv`, header + rows.join("\n"), "text/csv");
}

export function exportModelDXF(model: FEAModel) {
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const lines: string[] = [];

  lines.push("0", "SECTION", "2", "HEADER", "0", "ENDSEC");
  lines.push("0", "SECTION", "2", "TABLES", "0", "ENDSEC");
  lines.push("0", "SECTION", "2", "ENTITIES");

  for (const el of model.elements) {
    if (["beam2d", "beam3d", "truss2d", "truss3d"].includes(el.type)) {
      const n1 = byId.get(el.nodes[0]);
      const n2 = byId.get(el.nodes[1]);
      if (!n1 || !n2) continue;
      lines.push(
        "0", "LINE", "8", `ELEM_${el.type.toUpperCase()}`,
        "10", String(n1.x), "20", String(n1.y), "30", String(n1.z),
        "11", String(n2.x), "21", String(n2.y), "31", String(n2.z),
      );
    } else if (el.type === "shell_q4" || el.type === "tri3") {
      const N = el.type === "shell_q4" ? 4 : 3;
      const pts = el.nodes.map((nid) => byId.get(nid)).filter(Boolean) as { x: number; y: number; z: number }[];
      if (pts.length !== N) continue;
      for (let i = 0; i < N; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % N];
        lines.push(
          "0", "LINE", "8", `ELEM_${el.type.toUpperCase()}`,
          "10", String(a.x), "20", String(a.y), "30", String(a.z),
          "11", String(b.x), "21", String(b.y), "31", String(b.z),
        );
      }
    } else if (el.type === "solid_h8") {
      const pts = el.nodes.map((nid) => byId.get(nid)).filter(Boolean) as { x: number; y: number; z: number }[];
      if (pts.length !== 8) continue;
      const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
                     [0, 4], [1, 5], [2, 6], [3, 7]];
      for (const [a, b] of edges) {
        lines.push(
          "0", "LINE", "8", "ELEM_SOLID_H8",
          "10", String(pts[a].x), "20", String(pts[a].y), "30", String(pts[a].z),
          "11", String(pts[b].x), "21", String(pts[b].y), "31", String(pts[b].z),
        );
      }
    }
  }

  for (const n of model.nodes) {
    lines.push(
      "0", "POINT", "8", "NODES",
      "10", String(n.x), "20", String(n.y), "30", String(n.z),
    );
  }

  lines.push("0", "ENDSEC", "0", "EOF");
  download(`${model.name.replace(/\s+/g, "_")}.dxf`, lines.join("\n"), "application/dxf");
}

export function exportTimeHistoryCSV(model: FEAModel, results: DynamicResults, nodeId: number) {
  const h = results.node_history[nodeId];
  if (!h) return;
  const header = "time_s,ux,uy,uz,ax,ay,az\n";
  const rows = results.times.map((t, i) =>
    [t, h.ux[i], h.uy[i], h.uz[i], h.ax[i], h.ay[i], h.az[i]].join(",")
  );
  download(`${model.name}_node${nodeId}_history.csv`, header + rows.join("\n"), "text/csv");
}
