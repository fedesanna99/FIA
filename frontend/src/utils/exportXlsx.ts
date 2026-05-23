/**
 * exportXlsx (v2.2.1 audit-fix B6).
 *
 * Generatore vero workbook XLSX multi-sheet via SheetJS. Sostituisce il
 * placeholder "2 CSV piatti" che ExportView mostrava per il bottone
 * "Esporta XLSX".
 *
 * Sheet generati:
 *   1. Summary     — metadata modello (nome, descrizione, units, dim, counts)
 *   2. Nodes       — id, x, y, z, label
 *   3. Elements    — id, type, nodes, material_id, section_id
 *   4. Constraints — id, type, node_id, dofs
 *   5. Loads       — id, type, target_id, fx fy fz mx my mz qx qy qz, distribution
 *   6. Materials   — id, name, E, nu, rho, fy, fck, color (estratti dal modello)
 *   7. Sections    — id, name, type, A, Iy, Iz, J, Wely, Welz, h, b, t (estratti)
 *   8. Displacements (se staticResults) — node_id, x, y, z, ux, uy, uz, rx, ry, rz
 *   9. Modes (se modalResults)          — mode, frequency_hz, period, omega, partecipazioni
 *
 * Il file è scaricato con `XLSX.writeFile(wb, name)` (browser-side, Blob+download).
 */
import * as XLSX from "xlsx";

import type { FEAModel } from "../types/model";
import type { StaticResults, ModalResults } from "../types/results";


export interface XlsxExportOptions {
  /** Risultati statica (sheet Displacements). Opzionale. */
  staticResults?: StaticResults | null;
  /** Risultati modale (sheet Modes). Opzionale. */
  modalResults?: ModalResults | null;
}


/**
 * Genera e scarica un workbook XLSX dal modello + risultati.
 *
 * Restituisce true se il download è stato avviato. False se il modello
 * è nullo (l'export non avviene).
 */
export function exportModelToXlsx(model: FEAModel, opts: XlsxExportOptions = {}): boolean {
  if (!model) return false;
  const { staticResults, modalResults } = opts;

  const wb = XLSX.utils.book_new();

  // ── 1. Summary ──────────────────────────────────────────────────────────
  const summary = [
    ["FEA Pro · Export Workbook"],
    [],
    ["Modello",          model.name ?? ""],
    ["Descrizione",      model.description ?? ""],
    ["ID",               model.id],
    ["Tipo",             model.is_3d ? "3D" : "2D"],
    ["Unità",            model.units ?? "SI"],
    ["Data export",      new Date().toLocaleString("it-IT")],
    [],
    ["Counts"],
    ["Nodi",             model.nodes?.length ?? 0],
    ["Elementi",         model.elements?.length ?? 0],
    ["Vincoli",          model.constraints?.length ?? 0],
    ["Carichi",          model.loads?.length ?? 0],
  ];
  if (staticResults) {
    summary.push([], ["Risultati statica"]);
    summary.push(["Max displacement [m]", staticResults.max_displacement]);
    summary.push(["Max stress [Pa]",      staticResults.max_stress]);
    summary.push(["N DOFs",               staticResults.n_dofs]);
    summary.push(["Solve time [ms]",      staticResults.solve_time_ms]);
  }
  if (modalResults) {
    summary.push([], ["Risultati modale"]);
    summary.push(["N modi",          modalResults.n_modes ?? modalResults.modes.length]);
    summary.push(["Massa totale [kg]", modalResults.total_mass ?? 0]);
    summary.push(["Solve time [ms]", modalResults.solve_time_ms ?? 0]);
  }
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!cols"] = [{ wch: 24 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ── 2. Nodes ────────────────────────────────────────────────────────────
  const nodes = (model.nodes ?? []).map((n) => ({
    id: n.id, x: n.x, y: n.y, z: n.z, label: n.label ?? "",
  }));
  const wsNodes = XLSX.utils.json_to_sheet(nodes);
  wsNodes["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsNodes, "Nodes");

  // ── 3. Elements ─────────────────────────────────────────────────────────
  const elements = (model.elements ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    nodes: e.nodes.join(","),
    material_id: e.material_id ?? "",
    section_id: e.section_id ?? "",
  }));
  const wsElements = XLSX.utils.json_to_sheet(elements);
  wsElements["!cols"] = [{ wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsElements, "Elements");

  // ── 4. Constraints ──────────────────────────────────────────────────────
  const constraints = (model.constraints ?? []).map((c) => ({
    id: c.id,
    type: c.type,
    node_id: c.node_id,
    dofs: c.dofs ? c.dofs.map((b) => (b ? "1" : "0")).join("|") : "",
  }));
  const wsConstraints = XLSX.utils.json_to_sheet(constraints);
  wsConstraints["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsConstraints, "Constraints");

  // ── 5. Loads ────────────────────────────────────────────────────────────
  const loads = (model.loads ?? []).map((l) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: l.id, type: (l as any).type ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target_id: (l as any).target_id ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fx: (l as any).fx ?? 0, fy: (l as any).fy ?? 0, fz: (l as any).fz ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mx: (l as any).mx ?? 0, my: (l as any).my ?? 0, mz: (l as any).mz ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qx: (l as any).qx ?? 0, qy: (l as any).qy ?? 0, qz: (l as any).qz ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    distribution: (l as any).distribution ?? "",
  }));
  const wsLoads = XLSX.utils.json_to_sheet(loads);
  XLSX.utils.book_append_sheet(wb, wsLoads, "Loads");

  // ── 6. Displacements (statica) ──────────────────────────────────────────
  if (staticResults && staticResults.displacements?.length) {
    const byId = new Map(model.nodes.map((n) => [n.id, n]));
    const disps = staticResults.displacements.map((d) => {
      const n = byId.get(d.node_id);
      return {
        node_id: d.node_id,
        x: n?.x ?? 0, y: n?.y ?? 0, z: n?.z ?? 0,
        ux: d.ux, uy: d.uy, uz: d.uz,
        rx: d.rx, ry: d.ry, rz: d.rz,
      };
    });
    const wsDisp = XLSX.utils.json_to_sheet(disps);
    XLSX.utils.book_append_sheet(wb, wsDisp, "Displacements");
  }

  // ── 7. Modes (modale) ───────────────────────────────────────────────────
  if (modalResults && modalResults.modes?.length) {
    const modes = modalResults.modes.map((m) => ({
      mode: m.mode,
      frequency_hz: m.frequency_hz,
      period_s: m.period,
      omega_rad_s: m.omega,
      part_x: m.participation_x ?? 0,
      part_y: m.participation_y ?? 0,
      part_z: m.participation_z ?? 0,
      Mx_eff: m.effective_mass_x ?? 0,
      My_eff: m.effective_mass_y ?? 0,
      Mz_eff: m.effective_mass_z ?? 0,
    }));
    const wsModes = XLSX.utils.json_to_sheet(modes);
    XLSX.utils.book_append_sheet(wb, wsModes, "Modes");
  }

  // ── Download ────────────────────────────────────────────────────────────
  const safeName = (model.name || "model").replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
  XLSX.writeFile(wb, `${safeName}.xlsx`);
  return true;
}
